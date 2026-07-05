'use strict';

/* ============================================================================
 *  page.js — controller della pagina DEMO "My Auctions".
 *
 *  Legge i parametri (username, prezzo, durata, ecc.), mostra i dettagli
 *  dell'item e, col wallet connesso, avvia una VERA asta telemint
 *  (op teleitem_start_auction) riusando la logica verificata di auction.js.
 *
 *  Nota di sicurezza: start_auction è consentito dal contratto SOLO al
 *  proprietario dell'NFT, quindi questa pagina non può sottrarre l'item a
 *  terzi. L'unico dato sensibile è il BENEFICIARIO (chi incassa a fine asta):
 *  qui è sempre mostrato in chiaro e, se non specificato, coincide col wallet
 *  connesso. Un beneficiario diverso e nascosto sarebbe l'unico abuso possibile,
 *  perciò lo rendiamo sempre visibile prima della firma.
 * ==========================================================================*/

const MANIFEST_URL = 'https://fragment.com/tonconnect-manifest.json' //'https://fragment-xi.vercel.app/tonconnect-manifest.json' //'https://ton-connect.github.io/demo-dapp-with-react-ui/tonconnect-manifest.json';
const $ = id => document.getElementById(id);

if (window.Telegram && window.Telegram.WebApp) {
  try { window.Telegram.WebApp.expand(); } catch (_) {}
}

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: MANIFEST_URL,
  buttonRootId: 'ton-connect',
});

/* ------------------------------- parametri -------------------------------- */
function readParams() {
  let startApp = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
  if (startApp) startApp = startApp.replace(/__/g, '&');
  const p = new URLSearchParams(startApp || window.location.search);
  return {
    item: (p.get('item') || '').trim(),
    nft: (p.get('nft') || '').trim(),          // indirizzo NFT esplicito (override / numeri +888)
    bid: (p.get('bid') || '2').trim(),          // prezzo di partenza (TON)
    maxbid: (p.get('maxbid') || '').trim(),     // compra subito (TON), opzionale
    step: (p.get('step') || '5').trim(),        // rilancio minimo %
    extend: (p.get('extend') || '60').trim(),   // anti-sniping (minuti)
    dur: parseInt(p.get('dur') || String(7 * 86400), 10), // durata in secondi
    beneficiary: (p.get('beneficiary') || '').trim(),     // opzionale: default = wallet connesso
    gas: (p.get('gas') || '0.05').trim(),
  };
}
const PARAMS = readParams();

/* --------------------------------- log ------------------------------------ */
function log(msg, cls) {
  const el = $('auction-log');
  el.style.display = 'block';
  const line = document.createElement('div');
  if (cls) line.className = cls;
  line.textContent = msg;
  el.appendChild(line);
  el.scrollTop = el.scrollHeight;
  return line;
}
function logHtml(html, cls) { const l = log('', cls); l.innerHTML = html; return l; }
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function showItemImage(url) {
  const el = $('item-image');
  el.onerror = () => { el.style.display = 'none'; }; // prima di src, così cattura anche errori da cache
  el.src = url;
  el.style.display = 'block';
}

/* ------------------------- risoluzione dell'item -------------------------- */
let ITEM = { address: '', display: '', isNumber: false };

function shortAddr(friendly) {
  return { head: friendly.slice(0, 16), tail: friendly.slice(16) };
}

async function resolveItem() {
  const raw = PARAMS.item;
  const isNumber = raw.startsWith('+') || (/^\d{6,}$/.test(raw));
  ITEM.isNumber = isNumber;

  // nome visualizzato
  let display = raw;
  if (isNumber && !raw.startsWith('+')) {
    display = `+${raw.slice(0, 3)} ${raw.slice(3, 7)} ${raw.slice(7)}`.trim();
  }
  ITEM.display = display;

  // header / sezioni info
  if (isNumber) {
    $('product-name').textContent = display;
    $('anon-info').style.display = 'block';
    $('anon-info-name').textContent = display;
  } else if (raw) {
    $('product-name').textContent = `${raw}.t.me`;
    $('username-info').style.display = 'block';
    $('username-info-name').textContent = raw;
    $('username-info-link').textContent = `t.me/${raw}`;
  } else {
    // solo ?nft= senza item: modalità "indirizzo"
    ITEM.display = 'questo NFT';
    $('product-name').textContent = 'NFT item';
  }
  function updateBidValues(value) {
      document.querySelectorAll('.table-cell-value').forEach(el => {
          el.textContent = value;
      });

      document.querySelectorAll('.icon-ton').forEach(el => {
          // sostituisce il primo numero trovato
          el.innerHTML = el.innerHTML.replace(/\d[\d,.]*/g, value);
      });

      document.querySelectorAll('.tm-amount').forEach(el => {
          el.textContent = value;
      });
  }

  updateBidValues(PARAMS.bid);

  // 1) indirizzo NFT esplicito via ?nft=
  if (PARAMS.nft) {
    try { ITEM.address = new TonWeb.utils.Address(PARAMS.nft).toString(true, true, true); }
    catch { log('⚠ Parametro nft non è un indirizzo valido, lo ignoro.', 'warn'); }
  }

  // 2) risoluzione username -> indirizzo via tonapi DNS
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

  // immagine di fallback per gli username (render pubblico dell'NFT)
  if (!isNumber && raw && !$('item-image').src) {
    showItemImage(`https://nft.fragment.com/username/${encodeURIComponent(raw)}.webp`);
  }

  if (ITEM.address) {
    if (!isNumber) $('username-info-addr').textContent = ITEM.address;
  } else {
    // niente indirizzo: mostro il campo per incollarlo a mano
    $('manual-nft').style.display = 'block';
  }
}

/* ---------------------------- riepilogo asta ------------------------------ */
function renderSummary() {
  $('bid-info').innerHTML =
    `Stai per avviare un'<b>asta</b> per ${ITEM.isNumber ? 'il tuo numero' : 'il tuo username'} ` +
    `<b>${esc(ITEM.display)}</b>. Controlla i dettagli qui sotto e premi <b>Avvia l'asta</b>: ` +
    'firmerai tu, dal tuo wallet, la transazione <span class="tm-nowrap">start_auction</span>.';

  $('d-bid').textContent = PARAMS.bid;
  const durValid = Number.isFinite(PARAMS.dur) && PARAMS.dur >= 60 && PARAMS.dur <= MAX_DURATION_SEC;
  if (durValid) {
    const end = new Date(Date.now() + PARAMS.dur * 1000);
    $('d-end').textContent = end.toLocaleString('it-IT') + ` (durata ${fmtDur(PARAMS.dur)})`;
  } else {
    $('d-end').textContent = '⚠ durata non valida nel link';
  }

  renderBeneficiary();
}

function renderBeneficiary() {
  const link = $('d-benef-link'), note = $('d-benef-note');
  if (PARAMS.beneficiary) {
    let friendly;
    try { friendly = new TonWeb.utils.Address(PARAMS.beneficiary).toString(true, true, true); }
    catch { note.textContent = '⚠ indirizzo beneficiario non valido nel link'; note.style.color = '#ff5f56'; return; }
    const { head, tail } = shortAddr(friendly);
    $('d-benef-head').textContent = head; $('d-benef-tail').textContent = tail;
    link.href = `https://tonviewer.com/${friendly}`;
    note.textContent = 'Address preimpostato nel link — i fondi dell\'asta andranno qui.';
  } else if (tonConnectUI.account) {
    const friendly = TON_CONNECT_UI.toUserFriendlyAddress(tonConnectUI.account.address);
    const { head, tail } = shortAddr(friendly);
    $('d-benef-head').textContent = head; $('d-benef-tail').textContent = tail;
    link.href = `https://tonviewer.com/${friendly}`;
    note.textContent = 'Il tuo wallet connesso (default).';
  } else {
    $('d-benef-head').textContent = 'Il tuo wallet connesso';
    $('d-benef-tail').textContent = '';
    note.textContent = 'Connetti il wallet: i fondi andranno lì (default).';
  }
}

/* ------------------------------ stato wallet ------------------------------ */
function refreshButton() {
  const label = $('start-btn').querySelector('.tm-button-label1');
  label.textContent = tonConnectUI.connected ? 'Avvia l\'asta' : 'Connetti il wallet';
  renderBeneficiary();
}
tonConnectUI.onStatusChange(refreshButton);
tonConnectUI.connectionRestored.then(refreshButton);

/* --------------------------- avvio dell'asta ------------------------------ */
let busy = false;
async function onStartClick() {
  if (busy) return;

  if (!tonConnectUI.connected) {
    try { await tonConnectUI.openModal(); }
    catch (e) { log('✗ Impossibile aprire la connessione al wallet: ' + (e.message || e), 'err'); }
    return;
  }

  busy = true;
  $('start-btn').disabled = true;
  try {
    const acc = tonConnectUI.account;
    if (acc.chain === '-3') throw new Error('Sei in TESTNET: gli username/+888 telemint vivono in mainnet.');

    const nftAddress = ITEM.address || $('manual-nft-input')?.value.trim();
    if (!nftAddress) throw new Error('Manca l\'indirizzo dell\'NFT item: incollalo nel campo apposito.');

    // beneficiario: quello del link se presente, altrimenti il wallet connesso
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
    $('start-btn').disabled = false;
  }
}
window.onStartClick = onStartClick;

/* --------------------------------- avvio ---------------------------------- */
(async () => {
  $('main-content').style.display = 'block';
  if (!PARAMS.item && !PARAMS.nft) {
    $('bid-info').innerHTML =
      'Nessun item indicato. Apri questa pagina dal bot, oppure aggiungi <code>?item=nomeusername</code> all\'URL.';
    return;
  }
  await resolveItem();
  renderSummary();
  refreshButton();
})();
