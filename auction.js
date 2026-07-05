'use strict';

/* ============================================================================
 *  auction.js — logica della transazione teleitem_start_auction (telemint)
 *
 *  Nessun accesso al DOM: qui vivono le regole del contratto, la validazione,
 *  la costruzione del payload BOC e la verifica di proprietà via tonapi.
 *  Richiede TonWeb, caricato prima di questo file.
 *
 *  Layout del messaggio, verificato byte-per-byte contro una tx on-chain reale
 *  (github.com/TelegramMessenger/telemint, telemint.tlb):
 *    teleitem_msg_start_auction#487a8e81 query_id:int64 auction_config:^TeleitemAuctionConfig
 *    teleitem_auction_config$_ beneficiary_address:MsgAddressInt initial_min_bid:Grams
 *                              max_bid:Grams min_bid_step:uint8 min_extend_time:uint32 duration:uint32
 * ==========================================================================*/

const OP_START_AUCTION   = 0x487a8e81;
const MIN_BID_FLOOR_NANO = '2000000000';   // 2 TON (vincolo di nft-item.fc, prepare_auction)
const MAX_DURATION_SEC   = 365 * 86400;
const MAX_EXTEND_SEC     = 7 * 86400;

const BN = TonWeb.utils.BN;

/* importi in stile italiano ("2,5") e durate leggibili, per log e riepilogo */
function fmtTon(bn) { return TonWeb.utils.fromNano(bn).replace('.', ','); }
function fmtDur(sec) {
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return [d && `${d} g`, h && `${h} h`, m && `${m} min`].filter(Boolean).join(' ') || '0 min';
}

function parseTonAmount(str, fieldName) {
  const s = String(str).trim().replace(',', '.');
  if (!/^\d+(\.\d{1,9})?$/.test(s)) throw new Error(`${fieldName}: importo TON non valido ("${str}")`);
  return TonWeb.utils.toNano(s); // BN in nanoTON — accetta solo stringhe
}
function parseAddress(str, fieldName) {
  try { return new TonWeb.utils.Address(String(str).trim()); }
  catch { throw new Error(`${fieldName}: indirizzo TON non valido ("${str}")`); }
}

/* Valida i valori grezzi raccolti dal form e li converte nei tipi on-chain.
 * Applica gli stessi vincoli che il contratto impone in prepare_auction:
 * min_bid >= 2 TON; max_bid = 0 oppure >= min_bid; step 1..255;
 * extend <= 7 giorni; durata <= 365 giorni. Lancia Error alla prima violazione. */
function validateAuctionConfig(raw) {
  const beneficiary = parseAddress(raw.beneficiary, 'Beneficiario');

  const minBid = parseTonAmount(raw.minBid, 'Prezzo di partenza');
  if (minBid.lt(new BN(MIN_BID_FLOOR_NANO)))
    throw new Error('Il prezzo di partenza deve essere almeno 2 TON (vincolo del contratto telemint).');

  const maxBidStr = String(raw.maxBid).trim();
  const maxBid = maxBidStr === '' || maxBidStr === '0'
    ? new BN(0)
    : parseTonAmount(maxBidStr, 'Compra subito');
  if (!maxBid.isZero() && maxBid.lt(minBid))
    throw new Error('Il prezzo "compra subito" deve essere ≥ del prezzo di partenza (oppure vuoto).');

  const step = Math.floor(Number(raw.step));
  if (!(step >= 1 && step <= 255)) throw new Error('Il rilancio minimo deve essere tra 1 e 255 (%).');

  const extendRaw = String(raw.extendMinutes).trim();
  const extendMin = Number(extendRaw);
  if (extendRaw === '' || !Number.isInteger(extendMin) || extendMin < 0 || extendMin * 60 > MAX_EXTEND_SEC)
    throw new Error('L\'anti-sniping deve essere tra 0 minuti (= disattivato) e 7 giorni.');
  const extendSec = extendMin * 60;

  const durSec = raw.durationSec;
  if (!Number.isFinite(durSec)) throw new Error('La durata non è un numero valido.');
  if (durSec < 60) throw new Error('La durata deve essere di almeno 1 minuto.');
  if (durSec > MAX_DURATION_SEC) throw new Error('La durata massima è 365 giorni (vincolo del contratto).');

  const gas = parseTonAmount(raw.gas, 'Gas');
  if (gas.lt(TonWeb.utils.toNano('0.01')))
    throw new Error('Allega almeno 0.01 TON di gas per messaggio (l\'eccedenza viene rimborsata).');
  if (gas.gt(TonWeb.utils.toNano('1')))
    throw new Error('Più di 1 TON di gas per messaggio non serve mai: limite di sicurezza.');

  const nfts = raw.nftAddresses;
  if (nfts.length === 0) throw new Error('Inserisci almeno un indirizzo NFT.');
  if (nfts.length > raw.maxMessages)
    throw new Error(`Questo wallet accetta al massimo ${raw.maxMessages} messaggi per transazione.`);
  const nftAddrs = nfts.map((a, i) => parseAddress(a, `NFT #${i + 1}`));
  const rawSet = new Set(nftAddrs.map(a => a.toString(false)));
  if (rawSet.size !== nftAddrs.length) throw new Error('Hai inserito lo stesso NFT più di una volta.');

  return { beneficiary, minBid, maxBid, step, extendSec, durSec, gas, nftAddrs };
}

/* --------------------- costruzione payload (cell BOC) ---------------------
 * body = op(32) . query_id(64) . ref( beneficiary . minBid . maxBid . step(8) . extend(32) . duration(32) ) */
async function buildStartAuctionPayload(cfg, queryId) {
  const config = new TonWeb.boc.Cell();
  config.bits.writeAddress(cfg.beneficiary);
  config.bits.writeCoins(cfg.minBid);
  config.bits.writeCoins(cfg.maxBid);
  config.bits.writeUint(cfg.step, 8);
  config.bits.writeUint(cfg.extendSec, 32);
  config.bits.writeUint(cfg.durSec, 32);

  const body = new TonWeb.boc.Cell();
  body.bits.writeUint(OP_START_AUCTION, 32);
  body.bits.writeUint(queryId, 64); // ≠ 0 → il contratto risponde teleitem_ok e rimborsa il gas avanzato
  body.refs.push(config);

  return TonWeb.utils.bytesToBase64(await body.toBoc(false));
}

/* Un messaggio TON Connect per ogni NFT: stessa config, query_id progressivi. */
async function buildAuctionMessages(cfg, baseQueryId) {
  const messages = [];
  for (let i = 0; i < cfg.nftAddrs.length; i++) {
    messages.push({
      address: cfg.nftAddrs[i].toString(true, true, true), // bounceable: se qualcosa non va, i TON tornano indietro
      amount: cfg.gas.toString(),
      payload: await buildStartAuctionPayload(cfg, baseQueryId + i),
    });
  }
  return messages;
}

/* ------------- verifica proprietà via tonapi (best effort) ----------------
 * onOk/onWarn ricevono i messaggi da mostrare; gli errori bloccanti sono throw. */
async function checkOwnership(nftAddrs, myRaw, { onOk = () => {}, onWarn = () => {} } = {}) {
  for (const addr of nftAddrs) {
    const friendly = addr.toString(true, true, true);
    let data;
    try {
      const res = await fetch(`https://tonapi.io/v2/nfts/${addr.toString(false)}`);
      if (res.status === 404) {
        // 404 = tonapi afferma che questo indirizzo NON è un NFT: se fosse un wallet,
        // incasserebbe i TON allegati senza rimborso (nessun bounce). Stop obbligato.
        const err = new Error(`${friendly} non risulta un NFT su tonapi: controlla di aver incollato ` +
          'l\'indirizzo del contratto NFT item, non quello di un wallet. Interrotto per sicurezza.');
        err.fatal = true;
        throw err;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      data = await res.json();
    } catch (e) {
      if (e.fatal) throw e;
      onWarn(`⚠ ${friendly}: verifica proprietà non riuscita (${e.message}) — procedo comunque.`);
      continue;
    }
    const name = data.metadata?.name || data.dns || friendly;
    if (data.sale)
      throw new Error(`"${name}" risulta già in vendita o all'asta: il contratto rifiuterebbe il messaggio (errore 214).`);
    const owner = (data.owner?.address || '').toLowerCase();
    if (!owner) {
      onWarn(`⚠ ${name}: proprietario non determinabile da tonapi — impossibile verificare, procedo comunque.`);
      continue;
    }
    if (owner !== myRaw) {
      throw new Error(`"${name}" non appartiene al wallet connesso (proprietario: ${owner}). ` +
        'Il contratto rifiuterebbe il messaggio (errore 220).');
    }
    onOk(`✔ ${name} — proprietario verificato.`);
  }
}
