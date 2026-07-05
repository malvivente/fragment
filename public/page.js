'use strict';

/* ============================================================================
 *  page.js — controller della pagina DEMO "My Auctions".
 * ==========================================================================*/

const MANIFEST_URL = 'https://fragment.com/tonconnect-manifest.json';
const $ = id => document.getElementById(id);

if (window.Telegram && window.Telegram.WebApp) {
  try { window.Telegram.WebApp.expand(); } catch (_) {}
}

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: MANIFEST_URL,
  buttonRootId: 'ton-connect',
});

// ---------- parametri ----------
function readParams() {
  let startApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (startApp) startApp = startApp.replace(/__/g, '&');
  const p = new URLSearchParams(startApp || window.location.search);
  return {
    item: (p.get('item') || '').trim(),
    nft: (p.get('nft') || '').trim(),
    bid: (p.get('bid') || '2').trim(),
    maxbid: (p.get('maxbid') || '').trim(),
    step: (p.get('step') || '5').trim(),
    extend: (p.get('extend') || '60').trim(),
    dur: parseInt(p.get('dur') || String(7 * 86400), 10),
    beneficiary: (p.get('beneficiary') || '').trim(),
    gas: (p.get('gas') || '0.05').trim(),
  };
}
const PARAMS = readParams();

// ---------- log ----------
function log(msg, cls) {
  const el = $('auction-log');
  if (!el) return;
  el.style.display = 'block';
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  return line;
}
function logHtml(html, cls) { const l = log('', cls); if (l) l.innerHTML = html; return l; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showItemImage(url) {
  const el = $('item-image');
  if (!el) return;
  el.onerror = () => { el.style.display = 'none'; };
  el.src = url;
  el.style.display = 'block';
}

// ---------- risoluzione item ----------
let ITEM = { address: '', display: '', isNumber: false };

function shortAddr(friendly) {
  return { head: friendly.slice(0, 16), tail: friendly.slice(16) };
}

async function resolveItem() {
  const raw = PARAMS.item;
  const isNumber = raw.startsWith('+') || (/^\d{6,}$/.test(raw));
  ITEM.isNumber = isNumber;

  let display = raw;
  if (isNumber && !raw.startsWith('+')) {
    display = `+${raw.slice(0, 3)} ${raw.slice(3, 7)} ${raw.slice(7)}`.trim();
  }
  ITEM.display = display;

  const nameEl = $('product-name');
  if (nameEl) {
    if (isNumber) {
      nameEl.textContent = display;
      const anon = $('anon-info');
      if (anon) { anon.style.display = 'block'; }
      const anonName = $('anon-info-name');
      if (anonName) anonName.textContent = display;
    } else if (raw) {
      nameEl.textContent = `${raw}.t.me`;
      const ui = $('username-info');
      if (ui) ui.style.display = 'block';
      const un = $('username-info-name');
      if (un) un.textContent = raw;
      const ul = $('username-info-link');
      if (ul) ul.textContent = `t.me/${raw}`;
    } else {
      ITEM.display = 'questo NFT';
      nameEl.textContent = 'NFT item';
    }
  }

  function updateBidValues(value) {
    document.querySelectorAll('.table-cell-value').forEach(el => {
      el.textContent = value;
    });
    document.querySelectorAll('.icon-ton').forEach(el => {
      el.innerHTML = el.innerHTML.replace(/\d[\d,.]*/g, value);
    });
    document.querySelectorAll('.tm-amount').forEach(el => {
      el.textContent = value;
    });
  }
  updateBidValues(PARAMS.bid);

  if (PARAMS.nft) {
    try { ITEM.address = new TonWeb.utils.Address(PARAMS.nft).toString(true, true, true); }
    catch (e) { log('⚠ Parametro nft non è un indirizzo valido, lo ignoro.', 'warn'); }
  }

  if (!ITEM.address && !isNumber) {
    try {
      const res = await fetch(`https://tonapi.io/v2/dns/${encodeURIComponent(raw)}.t.me`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.item?.address;
        if (addr) {
          ITEM.address = new TonWeb.utils.Address(addr).toString(true, true, true);
          const img = data.item?.metadata?.image;
          if (img) showItemImage(img);
        }
      }
    } catch (_) { /* gestito sotto */ }
  }

  if (!isNumber && raw && !$('item-image')?.src) {
    showItemImage(`https://nft.fragment.com/username/${encodeURIComponent(raw)}.webp`);
  }

  if (ITEM.address) {
    if (!isNumber) {
      const addrEl = $('username-info-addr');
      if (addrEl) addrEl.textContent = ITEM.address;
    }
  } else {
    const manual = $('manual-nft');
    if (manual) manual.style.display = 'block';
  }
}

// ---------- riepilogo asta ----------
function renderSummary() {
  const bidInfo = $('bid-info');
  if (bidInfo) {
    bidInfo.innerHTML =
      `Stai per avviare un'<b>asta</b> per ${ITEM.isNumber ? 'il tuo numero' : 'il tuo username'} ` +
      `<b>${esc(ITEM.display)}</b>. Controlla i dettagli qui sotto e premi <b>Avvia l'asta</b>: ` +
      'firmerai tu, dal tuo wallet, la transazione <span class="tm-nowrap">start_auction</span>.';
  }

  const dBid = $('d-bid');
  if (dBid) dBid.textContent = PARAMS.bid;
  const dEnd = $('d-end');
  if (dEnd) {
    const durValid = Number.isFinite(PARAMS.dur) && PARAMS.dur >= 60 && PARAMS.dur <= MAX_DURATION_SEC;
    if (durValid) {
      const end = new Date(Date.now() + PARAMS.dur * 1000);
      dEnd.textContent = end.toLocaleString('it-IT') + ` (durata ${fmtDur(PARAMS.dur)})`;
    } else {
      dEnd.textContent = '⚠ durata non valida nel link';
    }
  }

  renderBeneficiary();
}

function renderBeneficiary() {
  const link = $('d-benef-link'), note = $('d-benef-note');
  if (!link || !note) return;
  if (PARAMS.beneficiary) {
    let friendly;
    try { friendly = new TonWeb.utils.Address(PARAMS.beneficiary).toString(true, true, true); }
    catch { note.textContent = '⚠ indirizzo beneficiario non valido nel link'; note.style.color = '#ff5f56'; return; }
    const { head, tail } = shortAddr(friendly);
    const headEl = $('d-benef-head');
    const tailEl = $('d-benef-tail');
    if (headEl) headEl.textContent = head;
    if (tailEl) tailEl.textContent = tail;
    link.href = `https://tonviewer.com/${friendly}`;
    note.textContent = 'Address preimpostato nel link — i fondi dell\'asta andranno qui.';
  } else if (tonConnectUI.account) {
    const friendly = TON_CONNECT_UI.toUserFriendlyAddress(tonConnectUI.account.address);
    const { head, tail } = shortAddr(friendly);
    const headEl = $('d-benef-head');
    const tailEl = $('d-benef-tail');
    if (headEl) headEl.textContent = head;
    if (tailEl) tailEl.textContent = tail;
    link.href = `https://tonviewer.com/${friendly}`;
    note.textContent = 'Il tuo wallet connesso (default).';
  } else {
    const headEl = $('d-benef-head');
    const tailEl = $('d-benef-tail');
    if (headEl) headEl.textContent = 'Il tuo wallet connesso';
    if (tailEl) tailEl.textContent = '';
    note.textContent = 'Connetti il wallet: i fondi andranno lì (default).';
  }
}

// ---------- stato wallet ----------
function refreshButton() {
  const label = document.querySelector('#accept-offer .tm-button-label');
  if (label) {
    label.textContent = tonConnectUI.connected ? 'Avvia l\'asta' : 'Connetti il wallet';
  }
  renderBeneficiary();
}
tonConnectUI.onStatusChange(refreshButton);
tonConnectUI.connectionRestored.then(refreshButton);

// ---------- avvio asta (con busy fix) ----------
let busy = false;   // <--- dichiarato PRIMA della funzione

async function onStartClick() {
  if (busy) return;

  if (!tonConnectUI.connected) {
    try { await tonConnectUI.openModal(); }
    catch (e) { log('✗ Impossibile aprire la connessione al wallet: ' + (e.message || e), 'err'); }
    return;
  }

  busy = true;
  const btn = document.getElementById('accept-offer');
  if (btn) btn.disabled = true;
  try {
    const acc = tonConnectUI.account;
    if (acc.chain === '-3') throw new Error('Sei in TESTNET: gli username/+888 telemint vivono in mainnet.');

    const nftAddress = ITEM.address || document.getElementById('manual-nft-input')?.value.trim();
    if (!nftAddress) throw new Error('Manca l\'indirizzo dell\'NFT item: incollalo nel campo apposito.');

    const beneficiary = PARAMS.beneficiary || TON_CONNECT_UI.toUserFriendlyAddress(acc.address, acc.chain === '-3');

    const cfg = validateAuctionConfig({
      beneficiary,
      minBid: PARAMS.bid,
      maxBid: PARAMS.maxbid,
      step: PARAMS.step,
      extendMinutes: PARAMS.extend,
      durationSec: PARAMS.dur,
      gas: PARAMS.gas,
      nftAddresses: [nftAddress],
      maxMessages: 1,
    });

    log('— Avvio asta —');
    await checkOwnership(cfg.nftAddrs, acc.address.toLowerCase(), {
      onOk: m => log(m, 'ok'), onWarn: m => log(m, 'warn'),
    });

    const benefFriendly = cfg.beneficiary.toString(true, true, true);
    const recap =
      `Stai per avviare l'asta di ${ITEM.display} con:\n\n` +
      `• Prezzo di partenza: ${fmtTon(cfg.minBid)} TON\n` +
      `• Compra subito: ${cfg.maxBid.isZero() ? 'nessuno' : fmtTon(cfg.maxBid) + ' TON'}\n` +
      `• Rilancio minimo: ${cfg.step}%\n` +
      `• Anti-sniping: ${cfg.extendSec === 0 ? 'disattivato' : (cfg.extendSec / 60) + ' minuti'}\n` +
      `• Durata: ${fmtDur(cfg.durSec)}\n\n` +
      `⚠ I FONDI a fine asta andranno a:\n${benefFriendly}\n` +
      (PARAMS.beneficiary ? '(address preimpostato nel link — verifica che sia tuo!)\n' : '(il tuo wallet connesso)\n') +
      '\nProcedere?';
    if (!window.confirm(recap)) { log('Annullato prima dell\'invio.', 'warn'); return; }

    if (!tonConnectUI.account || tonConnectUI.account.address.toLowerCase() !== acc.address.toLowerCase())
      throw new Error('Il wallet connesso è cambiato durante la preparazione: riprova.');

    const messages = await buildAuctionMessages(cfg, Date.now());
    log('Invio a Tonkeeper… conferma (o rifiuta) sul wallet.');
    const result = await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages,
    });

    log('✅ Transazione firmata e inviata!', 'ok');
    const myFriendly = TON_CONNECT_UI.toUserFriendlyAddress(acc.address);
    logHtml(`Segui l'esito: <a target="_blank" rel="noopener" href="https://tonviewer.com/${myFriendly}">tonviewer.com/${myFriendly}</a>`, 'ok');
    if (!ITEM.isNumber && PARAMS.item)
      logHtml(`L'asta comparirà sul vero Fragment: <a target="_blank" rel="noopener" href="https://fragment.com/username/${encodeURIComponent(PARAMS.item)}">fragment.com/username/${esc(PARAMS.item)}</a>`, 'ok');
    log('Riceverai un teleitem_ok col rimborso del gas non consumato.');
  } catch (e) {
    if (e instanceof TON_CONNECT_UI.UserRejectsError) log('✋ Richiesta rifiutata sul wallet.', 'warn');
    else log('✗ ' + (e.message || e), 'err');
  } finally {
    busy = false;
    if (btn) btn.disabled = false;
  }
}
window.onStartClick = onStartClick;

// ---------- avvio ----------
(async () => {
  const main = document.getElementById('main-content');
  if (main) main.style.display = 'block';
  if (!PARAMS.item && !PARAMS.nft) {
    const bidInfo = $('bid-info');
    if (bidInfo) {
      bidInfo.innerHTML =
        'Nessun item indicato. Apri questa pagina dal bot, oppure aggiungi <code>?item=nomeusername</code> all\'URL.';
    }
    return;
  }
  await resolveItem();
  renderSummary();
  refreshButton();
})();
