/*jshint bitwise: false*/
/* globals iqwerty */
/* globals List */
const os = require('os');
const path = require('path');
const fs = require('fs');
const {clipboard, remote, ipcRenderer, shell} = require('electron');
const Store = require('electron-store');
const Mousetrap = require('./extras/mousetrap.min.js');
const autoComplete = require('./extras/auto-complete');
const gutils = require('./gutils.js');
const gSession = require('./gsessions.js');
const svcmain = require('./svc_main.js');

const Menu = remote.Menu;
const settings = new Store({ name: 'Settings' });
const abook = new Store({ name: 'AddressBook', encryptionKey: ['79009fb00ca1b7130832a42d', 'e45142cf6c4b7f33', '3fe6fba5'].join('') });
const wlsession = new gSession();
const win = remote.getCurrentWindow();

const WS_VERSION = settings.get('version', 'unknown');
const DEFAULT_WALLET_PATH = remote.app.getPath('documents');

let WALLET_OPEN_IN_PROGRESS = false;
let FUSION_IN_PROGRESS = false;
let TXLIST_OBJ = null;
let COMPLETION_PUBNODES;
let COMPLETION_ADDRBOOK;

/*  dom elements vars; */
// main section link
let sectionButtons;
// generics
let genericBrowseButton;
let genericFormMessage;
let genericEnterableInputs;
let genericEditableInputs;
let firstTab;
// settings page
let settingsInputDaemonAddress;
let settingsInputDaemonPort;
let settingsInputServiceBin;
let settingsInputMinToTray;
let settingsInputCloseToTray;
let settingsButtonSave;
let settingsDaemonHostFormHelp;
let settingsDaemonPortFormHelp;
// overview page
let overviewWalletAddress;
let overviewWalletCloseButton;
let overviewPaymentIdGen;
let overviewIntegratedAddressGen;
// addressbook page
let addressBookInputName;
let addressBookInputWallet;
let addressBookInputPaymentId;
let addressBookInputUpdate;
let addressBookButtonSave;
// open wallet page
let walletOpenInputPath;
let walletOpenInputPassword;
let walletOpenButtonOpen;
let walletOpenButtons;
// show/export keys page
let overviewShowKeyButton;
let showkeyButtonExportKey;
let showkeyInputViewKey;
let showkeyInputSpendKey;
let showkeyInputSeed;
// send page
let sendInputAddress;
let sendInputAmount;
let sendInputPaymentId;
let sendInputFee;
let sendButtonSend;
let sendMaxAmount;
let sendOptimize;
// create wallet
let overviewButtonCreate;
let walletCreateInputPath;
// let walletCreateInputFilename;
let walletCreateInputPassword;
// import wallet keys
let importKeyButtonImport;
let importKeyInputPath;
// let importKeyInputFilename;
let importKeyInputPassword;
let importKeyInputViewKey;
let importKeyInputSpendKey;
let importKeyInputScanHeight;
// import wallet seed
let importSeedButtonImport;
let importSeedInputPath;
//let importSeedInputFilename;
let importSeedInputPassword;
let importSeedInputMnemonic;
let importSeedInputScanHeight;
// transaction
let txButtonRefresh;
let txButtonSortAmount;
let txButtonSortDate;
let txInputUpdated;
let txInputNotify;
// misc
let thtml;
let dmswitch;
let kswitch;

function populateElementVars(){
    // misc
    thtml = document.querySelector('html');    
    dmswitch = document.getElementById('tswitch');
    kswitch = document.getElementById('kswitch');
    firstTab = document.querySelector('.navbar-button');
    // generics
    genericBrowseButton = document.querySelectorAll('.path-input-button');
    genericFormMessage = document.getElementsByClassName('form-ew');
    genericEnterableInputs = document.querySelectorAll('.section input');
    genericEditableInputs = document.querySelectorAll('textarea:not([readonly]), input:not([readonly]');

    // main section link
    sectionButtons = document.querySelectorAll('[data-section]');

    // settings input & elements
    settingsInputDaemonAddress = document.getElementById('input-settings-daemon-address');
    settingsInputDaemonPort = document.getElementById('input-settings-daemon-port');
    settingsInputServiceBin = document.getElementById('input-settings-path');
    settingsInputMinToTray = document.getElementById('checkbox-tray-minimize');
    settingsInputCloseToTray = document.getElementById('checkbox-tray-close');
    settingsButtonSave = document.getElementById('button-settings-save');
    settingsDaemonHostFormHelp = document.getElementById('daemonHostFormHelp');
    settingsDaemonPortFormHelp = document.getElementById('daemonPortFormHelp');

    // overview pages
    overviewWalletAddress = document.getElementById('wallet-address');
    overviewWalletCloseButton = document.getElementById('button-overview-closewallet');
    overviewPaymentIdGen = document.getElementById('payment-id-gen');
    overviewIntegratedAddressGen = document.getElementById('integrated-wallet-gen');

    // addressbook page
    addressBookInputName = document.getElementById('input-addressbook-name');
    addressBookInputWallet = document.getElementById('input-addressbook-wallet');
    addressBookInputPaymentId = document.getElementById('input-addressbook-paymentid');
    addressBookInputUpdate = document.getElementById('input-addressbook-update');
    addressBookButtonSave = document.getElementById('button-addressbook-save');

    // open wallet page
    walletOpenInputPath = document.getElementById('input-load-path');
    walletOpenInputPassword = document.getElementById('input-load-password');
    walletOpenButtonOpen = document.getElementById('button-load-load');
    walletOpenButtons = document.getElementById('walletOpenButtons');
    // show/export keys page
    overviewShowKeyButton = document.getElementById('button-show-reveal');
    showkeyButtonExportKey = document.getElementById('button-show-export');
    showkeyInputViewKey = document.getElementById('key-show-view');
    showkeyInputSpendKey = document.getElementById('key-show-spend');
    showkeyInputSeed = document.getElementById('seed-show');

    // send page
    sendInputAddress = document.getElementById('input-send-address');
    sendInputAmount = document.getElementById('input-send-amount');
    sendInputPaymentId = document.getElementById('input-send-payid');
    sendInputFee = document.getElementById('input-send-fee');
    sendButtonSend = document.getElementById('button-send-send');
    // maxSendFormHelp = document.getElementById('sendFormHelp');
    sendMaxAmount = document.getElementById('sendMaxAmount');
    sendOptimize = document.getElementById('button-send-optimize');
    // create wallet
    overviewButtonCreate = document.getElementById('button-create-create');
    walletCreateInputPath = document.getElementById('input-create-path');
    //walletCreateInputFilename = document.getElementById('input-create-name');
    walletCreateInputPassword = document.getElementById('input-create-password');
    // import wallet keys
    importKeyButtonImport = document.getElementById('button-import-import');
    importKeyInputPath = document.getElementById('input-import-path');
    //importKeyInputFilename = document.getElementById('input-import-name');
    importKeyInputPassword = document.getElementById('input-import-password');
    importKeyInputViewKey = document.getElementById('key-import-view');
    importKeyInputSpendKey = document.getElementById('key-import-spend');
    importKeyInputScanHeight = document.getElementById('key-import-height');
    // import wallet seed
    importSeedButtonImport = document.getElementById('button-import-seed-import');
    importSeedInputPath = document.getElementById('input-import-seed-path');
    //importSeedInputFilename = document.getElementById('input-import-seed-name');
    importSeedInputPassword = document.getElementById('input-import-seed-password');
    importSeedInputMnemonic = document.getElementById('key-import-seed');
    importSeedInputScanHeight = document.getElementById('key-import-seed-height');
    // tx page
    // transaction
    txButtonRefresh = document.getElementById('button-transactions-refresh');
    txButtonSortAmount = document.getElementById('txSortAmount');
    txButtonSortDate = document.getElementById('txSortTime');
    txInputUpdated = document.getElementById('transaction-updated');
    txInputNotify = document.getElementById('transaction-notify');
    
}

// inject sections tpl
function initSectionTemplates(){
    const importLinks = document.querySelectorAll('link[rel="import"]');
    for (var i = 0; i < importLinks.length; i++){
        let template = importLinks[i].import.getElementsByTagName("template")[0];
        let clone = document.importNode(template.content, true);
        document.getElementById('main-div').appendChild(clone);
    }
    // once all elements in place, safe to populate dom vars
    populateElementVars();
}

// utility: show toast message
function showToast(msg, duration, force){
    duration = duration || 1800;
    force = force || false;
    let datoaste = document.getElementById('datoaste');
    if(datoaste && force) {
        datoaste.parentNode.removeChild(datoaste);
    }
    
    //if(datoaste) return;

    let toastOpts = {
        style: { main: { 
            'padding': '4px 6px','left': '3px','right':'auto','border-radius': '0px'
        }},
        settings: {duration: duration}
    };

    let openedDialog = document.querySelector('dialog[open]');
    if(openedDialog){
        openedDialog.classList.add('dialog-alerted');
        setTimeout(()=>{
            openedDialog.classList.remove('dialog-alerted');
        },duration+100);
    }
    iqwerty.toast.Toast(msg, toastOpts);
}

// utility: dark mode
function setDarkMode(dark){
    let tmode = dark ? 'dark' : '';
    if(tmode === 'dark'){
        thtml.classList.add('dark');
        dmswitch.setAttribute('title', 'Leave dark mode');
        dmswitch.firstChild.classList.remove('fa-moon');
        dmswitch.firstChild.classList.add('fa-sun');
        settings.set('darkmode',true);
        dmswitch.firstChild.dataset.icon = 'sun';
    }else{
        thtml.classList.remove('dark');
        dmswitch.setAttribute('title', 'Swith to dark mode');
        dmswitch.firstChild.classList.remove('fa-sun');
        dmswitch.firstChild.classList.add('fa-moon');
        settings.set('darkmode', false);
        dmswitch.firstChild.dataset.icon = 'moon';
    }
}

let keybindingTpl = `<div class="transaction-panel">
<h4>Available Keybindings:</h4>
<table class="custom-table kb-table">
<tbody>
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>Home</kbd></th>
    <td>Switch to <strong>overview/welcome</strong> screen</td>
</tr> 
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>Tab</kbd></th>
    <td>Switch to <strong>next screen</strong></td>
</tr>
<tr>
<th scope="col"><kbd>Ctrl</kbd>+<kbd>n</kbd></th>
<td>Switch to <strong>Create new wallet</strong> screen</td></tr>
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>o</kbd></th>
    <td>Switch to <strong>Open a wallet</strong> screen</td>
</tr>
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>i</kbd></th>
    <td>Switch to <strong>Import wallet from private keys</strong> screen</td>
</tr>
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>i</kbd></th>
    <td>Switch to <strong>Import wallet from mnemonic seed</strong> screen</td>
</tr> 
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>e</kbd></th>
    <td>Switch to <strong>Export private keys/seed</strong> screen (when wallet opened)</td>
</tr> 
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>t</kbd></th>
    <td>Switch to <strong>Transactions</strong> screen (when wallet opened)</td>
</tr> 
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>s</kbd></th>
    <td>Switch to <strong>Send/Transfer</strong> screen (when wallet opened)</td>
</tr> 
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>\\</kbd></th>
    <td>Toggle dark/night mode</td>
</tr>
<tr>
    <th scope="col"><kbd>Ctrl</kbd>+<kbd>/</kbd></th>
    <td>Display shortcut key information (this dialog)</td>
</tr>
<tr>
    <th scope="col"><kbd>Esc</kbd></th>
    <td>Close any opened dialog (like this dialog)</td>
</tr> 
</tbody>
</table>
<div class="div-panel-buttons">
    <button  data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Close</button>
</div>
</div>
`;

function genPaymentId(ret){
    ret = ret || false;
    
    let payId = require('crypto').randomBytes(32).toString('hex');
    if(ret) return payId;
    
    let dialogTpl = `<div class="transaction-panel">
    <h4>Generated Payment ID:</h4>
    <textarea data-cplabel="Payment ID" title="click to copy" class="ctcl default-textarea" rows="1" readonly="readonly">${payId}</textarea>
    <div class="div-panel-buttons">
        <button  data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Close</button>
    </div>
    `;
    let dialog = document.getElementById('ab-dialog');
    if(dialog.hasAttribute('open')) dialog.close();
    dialog.innerHTML = dialogTpl;
    dialog.showModal();
}

function showIntegratedAddressForm(){
    let dialog = document.getElementById('ab-dialog');
    let ownAddress = wlsession.get('loadedWalletAddress');
    if(dialog.hasAttribute('open')) dialog.close();

    let iaform = `<div class="transaction-panel">
    <h4>Generate Integrated Address:</h4>
    <div class="input-wrap">
    <label>Wallet Address</label>
    <textarea id="genInputAddress" class="default-textarea" placeholder="Required, put any valid TRTL address..">${ownAddress}</textarea>
    </div>
    <div class="input-wrap">
    <label>Payment Id (<a id="makePaymentId" class="wallet-tool inline-tool" title="generate random payment id...">generate</a>)</label>
    <input id="genInputPaymentId" type="text" required="required" class="text-block" placeholder="Required, enter a valid payment ID, or click generate to get random ID" />
    </div>
    <div class="input-wrap">
    <textarea data-cplabel="Integrated address" placeholder="Fill the form &amp; click generate, integrated address will appear here..." rows="3" id="genOutputIntegratedAddress" class="default-textarea ctcl" readonly="readonly"></textarea>
    </div>
    <div class="input-wrap">
        <span class="form-ew form-msg text-spaced-error hidden" id="text-gia-error"></span>
    </div>
    <div class="div-panel-buttons">
        <button id="doGenIntegratedAddr" type="button" class="button-green dialog-close-default">Generate</button>
        <button  data-target="#ab-dialog" type="button" class="button-gray dialog-close-default">Close</button>
    </div>
    `;
    dialog.innerHTML = iaform;
    dialog.showModal();
}

function showKeyBindings(){
    let dialog = document.getElementById('ab-dialog');
    if(dialog.hasAttribute('open')) dialog.close();
    dialog.innerHTML = keybindingTpl;
    dialog.showModal();
}

function switchTab(){
    if(WALLET_OPEN_IN_PROGRESS){
        showToast('Opening wallet in progress, please wait...');
        return;
    }
    let isServiceReady = wlsession.get('serviceReady') || false;
    let activeTab = document.querySelector('.btn-active');
    let nextTab = activeTab.nextElementSibling || firstTab;
    let nextSection = nextTab.dataset.section.trim();
    let skippedSections = [];
    if(!isServiceReady){
        skippedSections = ['section-send', 'section-transactions'];
        if(nextSection === 'section-overview') nextSection = 'section-welcome';
    }

    while(skippedSections.indexOf(nextSection) >=0){
        nextTab = nextTab.nextElementSibling;
        nextSection = nextTab.dataset.section.trim();
    }
    changeSection(nextSection);
}

// section switcher
function changeSection(sectionId, isSettingRedir) {
    if(WALLET_OPEN_IN_PROGRESS){
        showToast('Opening wallet in progress, please wait...');
        return;
    }
    formMessageReset();
    isSettingRedir = isSettingRedir || false;
    let targetSection = sectionId.trim();
    let untoast = false;
    if(targetSection === 'section-welcome'){
        targetSection = 'section-overview';
        untoast = true;
    }

    let isSynced = wlsession.get('synchronized') || false;
    let isServiceReady = wlsession.get('serviceReady') || false;
    let needServiceReady = ['section-transactions', 'section-send', 'section-overview'];
    let needServiceStopped = 'section-welcome';
    let needSynced = ['section-send'];
    if(needSynced.indexOf(targetSection) && FUSION_IN_PROGRESS){
        showToast('Wallet optimization in progress, please wait');
        return;
    }

    let finalTarget = targetSection;
    let toastMsg = '';
    
    if(needServiceReady.indexOf(targetSection) >=0 && !isServiceReady){
        // no access to wallet, send, tx when no wallet opened
        finalTarget = 'section-welcome';
        toastMsg = "Please create/open your wallet!";
    }else if(needServiceStopped.indexOf(targetSection) >=0 && isServiceReady){
        finalTarget = 'section-overview';
    }else if(needSynced.indexOf(targetSection) >=0 && !isSynced){
        // just return early
        showToast("Please wait until syncing process completed!");
        return;
    }else{
        // re-randomize public node selection
        if(targetSection === 'section-settings'){           
            let defaultText = 'Type first few character(s) and select from public node list, or type to your own node address';
            if(isServiceReady){
                settingsInputDaemonAddress.setAttribute('disabled','disabled');
                settingsInputDaemonPort.setAttribute('disabled','disabled');
                settingsDaemonHostFormHelp.innerHTML = "Please close your current wallet if you want to update node setting";
                settingsDaemonPortFormHelp.innerHTML = "Please close your current wallet if you want to update node setting";
            }else{
                settingsInputDaemonAddress.removeAttribute('disabled');
                settingsInputDaemonPort.removeAttribute('disabled');
                settingsDaemonHostFormHelp.innerHTML = defaultText;
                settingsDaemonPortFormHelp.innerHTML = '';
                initNodeCompletion();
            }
        }
        finalTarget = targetSection;
        toastMsg = '';
    }

    let section = document.getElementById(finalTarget);
    if(section.classList.contains('is-shown')){
        if(toastMsg.length && !isSettingRedir && !untoast) showToast(toastMsg);
        section.dispatchEvent(new Event('click')); // make it focusable
        return; // don't do anything if section unchanged
    }

    // navbar active section indicator, only for main section
    let finalButtonTarget = (finalTarget === 'section-welcome' ? 'section-overview' : finalTarget);
    let newActiveNavbarButton = document.querySelector(`.navbar button[data-section="${finalButtonTarget}"]`);
    if(newActiveNavbarButton){
        const activeButton = document.querySelector(`.btn-active`);
        if(activeButton) activeButton.classList.remove('btn-active');    
        if(newActiveNavbarButton) newActiveNavbarButton.classList.add('btn-active');
    }

    // toggle section
    const activeSection = document.querySelector('.is-shown');
    if(activeSection) activeSection.classList.remove('is-shown');
    section.classList.add('is-shown');
    section.dispatchEvent(new Event('click')); // make it focusable
    // show msg when needed
    if(toastMsg.length && !isSettingRedir && !untoast) showToast(toastMsg);
    // notify section was changed
    let currentButton = document.querySelector(`button[data-section="${finalButtonTarget}"]`);
    if(currentButton){
        svcmain.onSectionChanged(currentButton.getAttribute('id'));
    }
}


// public nodes autocompletion
function initNodeCompletion(){
    if(!settings.has('pubnodes_data')) return;
    try{
        if(COMPLETION_PUBNODES) COMPLETION_PUBNODES.destroy();
    }catch(e){}

    let publicNodes = settings.has('pubnodes_custom') ? gutils.arrShuffle(settings.get('pubnodes_data')) : [];
    let nodeChoices = settings.get('pubnodes_custom').concat(publicNodes);


    COMPLETION_PUBNODES = new autoComplete({
        selector: 'input[name="nodeAddress"]',
        minChars: 0,
        source: function(term, suggest){
            term = term.toLowerCase();
            var choices = nodeChoices;
            var matches = [];
            for (var i=0; i<choices.length; i++){
                let phost = choices[i].split(':')[0];
                if (~choices[i].toLowerCase().indexOf(term) && phost.length > term.length){
                    matches.push(choices[i]);
                }
            }
            suggest(matches);
        },
        onSelect: function(e, term){
            settingsInputDaemonAddress.value = term.split(':')[0];
            settingsInputDaemonPort.value = term.split(':')[1];
            settingsInputDaemonAddress.dispatchEvent(new Event('blur'));
            return settingsButtonSave.dispatchEvent(new Event('focus'));
        }
    });
}

// initial settings value or updater
function initSettingVal(values){
    values = values || null;
    if(values){
        // save new settings
        settings.set('service_bin', values.service_bin);
        settings.set('daemon_host', values.daemon_host);
        settings.set('daemon_port', values.daemon_port);
        settings.set('tray_minimize', values.tray_minimize);
        settings.set('tray_close', values.tray_close);
    }
    settingsInputServiceBin.value = settings.get('service_bin');
    settingsInputDaemonAddress.value = settings.get('daemon_host');
    settingsInputDaemonPort.value = settings.get('daemon_port');
    settingsInputMinToTray.checked = settings.get('tray_minimize');
    settingsInputCloseToTray.checked = settings.get('tray_close');

    // if custom node, save it
    let mynode = `${settings.get('daemon_host')}:${settings.get('daemon_port')}`;
    let pnodes = settings.get('pubnodes_data');
    if(!settings.has('pubnodes_custom')) settings.set('pubnodes_custom', []);
    let cnodes = settings.get('pubnodes_custom');
    if(pnodes.indexOf(mynode) === -1 && cnodes.indexOf(mynode) === -1){
        cnodes.push(mynode);
        settings.set('pubnodes_custom', cnodes);
    }
}
// address book completions
function initAddressCompletion(){
    var nodeAddress = [];

    Object.keys(abook.get()).forEach((key) => {
        let et = abook.get(key);
        nodeAddress.push(`${et.name}###${et.address}###${(et.paymentId ? et.paymentId : '')}`);
    });

    try{
        if(COMPLETION_ADDRBOOK) COMPLETION_ADDRBOOK.destroy();
    }catch(e){
        console.log(e);
    }

    COMPLETION_ADDRBOOK = new autoComplete({
        selector: 'input[id="input-send-address"]',
        minChars: 1,
        cache: false,
        source: function(term, suggest){
            term = term.toLowerCase();
            var choices = nodeAddress;
            var matches = [];
            for (var i=0; i<choices.length; i++)
                if (~choices[i].toLowerCase().indexOf(term)) matches.push(choices[i]);
            suggest(matches);
        },
        renderItem: function(item, search){
            search = search.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            var re = new RegExp("(" + search.split(' ').join('|') + ")", "gi");
            var spl = item.split("###");
            var wname = spl[0];
            var waddr = spl[1];
            var wpayid = spl[2];
            return `<div class="autocomplete-suggestion" data-paymentid="${wpayid}" data-val="${waddr}">${wname.replace(re, "<b>$1</b>")}<br><span class="autocomplete-wallet-addr">${waddr.replace(re, "<b>$1</b>")}<br>Payment ID: ${(wpayid ? wpayid.replace(re, "<b>$1</b>") : 'N/A')}</span></div>`;
        },
        onSelect: function(e, term, item){               
            document.getElementById('input-send-payid').value = item.getAttribute('data-paymentid');
        }
    });
}

// generic form message reset
function formMessageReset(){
    if(!genericFormMessage.length) return;
    for(var i=0; i < genericFormMessage.length;i++){
        genericFormMessage[i].classList.add('hidden');
        gutils.clearChild(genericFormMessage[i]);
    }
}

function formMessageSet(target, status, txt){
    // clear all msg
    formMessageReset();
    let the_target = `${target}-${status}`;
    let the_el = null;
    try{ 
        the_el = document.querySelector('.form-ew[id$="'+the_target+'"]');
    }catch(e){}
    
    if(the_el){
        the_el.classList.remove('hidden');
        gutils.innerHTML(the_el, txt);
    }
}

// sample address book, only on first use
function insertSampleAddresses(){
    let flag = 'addressBookFirstUse';
    if(!settings.get(flag, true)) return;

    const sampleData = [
        { name: 'labaylabay rixombea',
          address: 'TRTLv1A26ngXApin33p1JsSE9Yf6REj97Xruz15D4JtSg1wuqYTmsPj5Geu2kHtBzD8TCsfd5dbdYRsrhNXMGyvtJ61AoYqLXVS',
          paymentId: 'DF794857BC4587ECEC911AF6A6AB02513FEA524EC5B98DA8702FAC92195A94B2', 
        },
        { name: 'Macroshock',
          address: 'TRTLv3R17LWbVw8Qv4si2tieyKsytUfKQXUgsmjksgrgJsTsnhzxNAeLKPjsyDGF7HGfjqkDegu2LPaC5NeVYot1SnpfcYmjwie',
          paymentId: '', 
        },
        { name: 'RockSteady',
          address: 'TRTLuxEnfjdF46cBoHhyDtPN32weD9fvL43KX5cx2Ck9iSP4BLNPrJY3xtuFpXtLxiA6LDYojhF7n4SwPNyj9M64iTwJ738vnJk',
          paymentId: '', 
        }
    ];

    sampleData.forEach((item) => {
        let ahash = gutils.b2sSum(item.address + item.paymentId);
        let aqr = gutils.genQrDataUrl(item.address);
        item.qrCode = aqr;
        abook.set(ahash, item);
    });
    settings.set(flag, false);
    initAddressCompletion();
}
// utility: blank tx filler
function setTxFiller(show){
    show = show || false;
    let fillerRow = document.getElementById('txfiller');
    let txRow = document.getElementById('transaction-lists');

    if(!show && fillerRow){
        fillerRow.classList.add('hidden');
        txRow.classList.remove('hidden');
    }else{
        let hasItemRow = document.querySelector('#transaction-list-table > tbody > tr.txlist-item');
        if(!hasItemRow)  {
            txRow.classList.add('hidden');
            fillerRow.classList.remove('hidden');
        }
    }
}

// display initial page, settings page on first run, else overview page
function showInitialPage(){
    // other initiations here
    formMessageReset();
    initSettingVal(); // initial settings value
    initNodeCompletion(); // initial public node completion list
    initAddressCompletion(); // initiate address book completion list
    insertSampleAddresses(); // sample address book

    if(!settings.has('firstRun') || settings.get('firstRun') !== 0){
        changeSection('section-settings');
        settings.set('firstRun', 0);
    }else{
        changeSection('section-welcome');
    }

    let versionInfo = document.getElementById('walletShellVersion');
    if(versionInfo) versionInfo.innerHTML = WS_VERSION;
}

// settings page handlers
function handleSettings(){
    settingsButtonSave.addEventListener('click', function(){
        formMessageReset();
        let serviceBinValue = settingsInputServiceBin.value ? settingsInputServiceBin.value.trim() : '';
        let daemonHostValue = settingsInputDaemonAddress.value ? settingsInputDaemonAddress.value.trim() :'';
        let daemonPortValue = settingsInputDaemonPort.value ? parseInt(settingsInputDaemonPort.value.trim(),10) : '';
        
        if(!serviceBinValue.length || !daemonHostValue.length || !Number.isInteger(daemonPortValue)){
            formMessageSet('settings','error',`Settings can't be saved, please enter correct values`);
            return false;
        }

        if(!gutils.isRegularFileAndWritable(serviceBinValue)){
            formMessageSet('settings','error',`Unable to find turtle-service, please enter the correct path`);
            return false;
        }
        
        let validHost = daemonHostValue === 'localhost' ? true : false;
        if(require('net').isIP(daemonHostValue)) validHost = true;
        if(!validHost){
            let domRe = new RegExp(/([a-z])([a-z0-9]+\.)*[a-z0-9]+\.[a-z.]+/ig);
            if(domRe.test(daemonHostValue)) validHost = true;
        }
        if(!validHost){
            formMessageSet('settings','error',`Invalid daemon/node address!`);
            return false;
        }

        if(daemonPortValue <=0){
            formMessageSet('settings','error',`Invalid daemon/node port number!`);
            return false;
        }

        let vals = {
            service_bin: serviceBinValue,
            daemon_host: daemonHostValue,
            daemon_port: daemonPortValue,
            tray_minimize: settingsInputMinToTray.checked,
            tray_close: settingsInputCloseToTray.checked
        };
        initSettingVal(vals);
        formMessageReset();
        initNodeCompletion();
        let goTo = wlsession.get('loadedWalletAddress').length ? 'section-overview' : 'section-welcome';
        changeSection(goTo, true);
        showToast('Settings has been updated.',10000);
    });
}

function handleAddressBook(){
    function listAddressBook(force){
        force = force || false;
        let currentLength = document.querySelectorAll('.addressbook-item:not([data-hash="fake-hash"])').length;
        let abookLength =abook.size;
        let perPage = 9;
    
        if(currentLength >= abookLength  && !force)  return;
    
        let listOpts = {
            valueNames: [
                {data: ['hash', 'nameval','walletval','paymentidval','qrcodeval']},
                'addressName','addressWallet','addressPaymentId'
            ],
            indexAsync: true
        };
    
        if(abookLength > perPage){
            listOpts.page = perPage;
            listOpts.pagination = true;
        }
    
        const addressList = new List('addressbooks', listOpts);
        addressList.clear();
        Object.keys(abook.get()).forEach((key) => {
            let et = abook.get(key);
            addressList.add({
                hash: key,
                addressName: et.name,
                addressWallet: et.address,
                addressPaymentId: et.paymentId || '-',
                nameval: et.name,
                walletval: et.address,
                paymentidval: et.paymentId || '-',
                qrcodeval: et.qrCode || ''
            });
        });
    
        addressList.remove('hash', 'fake-hash');
    }

    function displayAddressBookEntry(){
        let dialog = document.getElementById('ab-dialog');
        if(dialog.hasAttribute('open')) dialog.close();
        let tpl = `
             <div class="div-transactions-panel">
                 <h4>Address Detail</h4>
                 <div class="addressBookDetail">
                     <div class="addressBookDetail-qr">
                         <img src="${this.dataset.qrcodeval}" />
                     </div>
                     <div class="addressBookDetail-data">
                         <dl>
                             <dt>Name:</dt>
                             <dd data-cplabel="Name" class="tctcl" title="click to copy">${this.dataset.nameval}</dd>
                             <dt>Wallet Address:</dt>
                             <dd data-cplabel="Wallet address" class="tctcl" title="click to copy">${this.dataset.walletval}</dd>
                             <dt>Payment Id:</dt>
                             <dd  data-cplabel="Payment ID" class="tctcl" title="click to copy">${this.dataset.paymentidval ? this.dataset.paymentidval : '-'}</dd>
                         </dl>
                     </div>
                 </div>
             </div>
             <div class="div-panel-buttons">
                     <button data-addressid="${this.dataset.hash}" type="button" class="form-bt button-green" id="button-addressbook-panel-edit">Edit</button>
                     <button type="button" class="form-bt button-red" id="button-addressbook-panel-delete">Delete</button>
                     <button data-addressid="${this.dataset.hash}" type="button" class="form-bt button-gray" id="button-addressbook-panel-close">Close</button>
             </div>
        `;
     
        gutils.innerHTML(dialog, tpl);
        // get new dialog
        dialog = document.getElementById('ab-dialog');
        dialog.showModal();
        document.getElementById('button-addressbook-panel-close').addEventListener('click', () => {
             let abdialog = document.getElementById('ab-dialog');
             abdialog.close();
             gutils.clearChild(abdialog);
         });
     
         let deleteBtn = document.getElementById('button-addressbook-panel-delete');
         deleteBtn.addEventListener('click', () => {
             let tardel = this.dataset.nameval;
             let tarhash = this.dataset.hash;
             if(!confirm(`Are you sure you want to delete ${tardel} from the address book?`)){
                 return;
             }else{
                 abook.delete(tarhash);
                 let abdialog = document.getElementById('ab-dialog');
                 abdialog.close();
                 gutils.clearChild(abdialog);
                 listAddressBook(true);
                 if(!document.getElementById('datoaste')){
                     iqwerty.toast.Toast("Address book entry was deleted.", {settings: {duration:1800}});
                 }
             }
         });
     
         let editBtn = document.getElementById('button-addressbook-panel-edit');
         editBtn.addEventListener('click', ()=>{
             let origHash = this.dataset.hash;
             let entry = abook.get(origHash);
             if(!entry){
                 iqwerty.toast.Toast("Invalid address book entry.", {settings: {duration:1800}});
             }else{
                 const nameField = document.getElementById('input-addressbook-name');
                 const walletField = document.getElementById('input-addressbook-wallet');
                 const payidField = document.getElementById('input-addressbook-paymentid');
                 const updateField = document.getElementById('input-addressbook-update');
                 nameField.value = entry.name;
                 nameField.dataset.oldhash = origHash;
                 walletField.value = entry.address;
                 payidField.value = entry.paymentId;
                 updateField.value = 1;
             }
             changeSection('section-addressbook-add');
             let axdialog = document.getElementById('ab-dialog');
             axdialog.close();
             gutils.clearChild(axdialog);
         });
     }

     function setAbPaymentIdState(addr){
        if(addr.length > 99){
            addressBookInputPaymentId.value = '';
            addressBookInputPaymentId.setAttribute('disabled', true);
        }else{
            addressBookInputPaymentId.removeAttribute('disabled');
        }
    }

    addressBookInputWallet.addEventListener('change', (event) => {
         let val = event.target.value || '';
         setAbPaymentIdState(val);
     });

     addressBookInputWallet.addEventListener('keyup', (event) => {
        let val = event.target.value || '';
        setAbPaymentIdState(val);
    });

    addressBookButtonSave.addEventListener('click', () => {
        formMessageReset();
        let nameValue = addressBookInputName.value ? addressBookInputName.value.trim() : '';
        let walletValue = addressBookInputWallet.value ? addressBookInputWallet.value.trim() : '';
        let paymentIdValue = addressBookInputPaymentId.value ? addressBookInputPaymentId.value.trim() : '';
        let isUpdate = addressBookInputUpdate.value ? addressBookInputUpdate.value : 0;

        if( !nameValue || !walletValue ){
            formMessageSet('addressbook','error',"Name and wallet address can not be left empty!");
            return;
        }

        if(!gutils.validateTRTLAddress(walletValue)){
            formMessageSet('addressbook','error',"Invalid TurtleCoin address");
            return;
        }
        
        if( paymentIdValue.length){
            if( !gutils.validatePaymentId(paymentIdValue) ){
                formMessageSet('addressbook','error',"Invalid Payment ID");
                return;
            }
        }

        if(walletValue.length > 99) paymentIdValue.value = '';

        let entryName = nameValue.trim();
        let entryAddr = walletValue.trim();
        let entryPaymentId = paymentIdValue.trim();
        let entryHash = gutils.b2sSum(entryAddr + entryPaymentId);


        if(abook.has(entryHash) && !isUpdate){
            formMessageSet('addressbook','error',"This combination of address and payment ID already exist, please enter new address or different payment id.");
            return;
        }
   
        try{
            abook.set(entryHash, {
                name: entryName,
                address: entryAddr,
                paymentId: entryPaymentId,
                qrCode: gutils.genQrDataUrl(entryAddr)
            });
            let oldHash = addressBookInputName.dataset.oldhash || '';
            let isNew = (oldHash.length && oldHash !== entryHash);
            
            if(isUpdate && isNew){
                abook.delete(oldHash);
            }
        }catch(e){
            formMessageSet('addressbook','error',"Address book entry can not be saved, please try again");
            return;
        }
        addressBookInputName.value = '';
        addressBookInputName.dataset.oldhash = '';
        addressBookInputWallet.value = '';
        addressBookInputPaymentId.value = '';
        addressBookInputUpdate.value = 0;
        listAddressBook(true);
        initAddressCompletion();
        formMessageReset();
        changeSection('section-addressbook');
        showToast('Address book entry has been saved.');
    });

    // entry detail
    gutils.liveEvent('.addressbook-item','click',displayAddressBookEntry);
    listAddressBook();
}

function handleWalletOpen(){
    if(settings.has('recentWallet')){
        walletOpenInputPath.value = settings.get('recentWallet');
    }

    function setOpenButtonsState(isInProgress){
        isInProgress = isInProgress ? 1 : 0;
        if(isInProgress){
            walletOpenButtons.classList.add('hidden');
        }else{
            walletOpenButtons.classList.remove('hidden');
        }
    }

    walletOpenButtonOpen.addEventListener('click', () => {
        formMessageReset();
        if(!walletOpenInputPath.value){
            formMessageSet('load','error', "Invalid wallet file path");
            WALLET_OPEN_IN_PROGRESS = false;
            setOpenButtonsState(0);
            return;
        }

        function onError(err){
            formMessageReset();
            formMessageSet('load','error', err);
            WALLET_OPEN_IN_PROGRESS = false;
            setOpenButtonsState(0);
            return false;
        }

        //function onSuccess(theWallet, scanHeight){
        function onSuccess(){
            walletOpenInputPath.value = settings.get('recentWallet');
            overviewWalletAddress.value = wlsession.get('loadedWalletAddress');
            svcmain.getNodeFee();
            WALLET_OPEN_IN_PROGRESS = false;
            changeSection('section-overview');
            setTimeout(()=>{
                setOpenButtonsState(0);
            },300);
        }

        let walletFile = walletOpenInputPath.value;
        let walletPass = walletOpenInputPassword.value;
        let scanHeight = 0;
        fs.access(walletFile, fs.constants.R_OK, (err) => {
            if(err){
                formMessageSet('load','error', "Invalid wallet file path");
                setOpenButtonsState(0);
                WALLET_OPEN_IN_PROGRESS = false;
                return false;
            }

            setOpenButtonsState(1);
            WALLET_OPEN_IN_PROGRESS = true;
            settings.set('recentWallet', walletFile);
            formMessageSet('load','warning', "Accessing wallet...<br><progress></progress>");
            svcmain.stopService(true).then(() => {
                formMessageSet('load','warning', "Starting wallet service...<br><progress></progress>");
                setTimeout(() => {
                    formMessageSet('load','warning', "Opening wallet, please be patient...<br><progress></progress>");
                    svcmain.startService(walletFile, walletPass, scanHeight, onError, onSuccess);
                },800);
            }).catch(() => {
                formMessageSet('load','error', "Unable to start service");
                WALLET_OPEN_IN_PROGRESS = false;
                setOpenButtonsState(0);
                return false;
            });
        });
    });
}

function handleWalletClose(){
    overviewWalletCloseButton.addEventListener('click', (event) => {
        event.preventDefault();
        if(!confirm('Are you sure want to close your wallet?')) return;

        let dialog = document.getElementById('main-dialog');
        let htmlStr = '<div class="div-save-main" style="text-align: center;padding:1rem;"><i class="fas fa-spinner fa-pulse"></i><span style="padding:0px 10px;">Saving &amp; closing your wallet...</span></div>';
        gutils.innerHTML(dialog, htmlStr);

        dialog = document.getElementById('main-dialog');
        dialog.showModal();
        // save + SIGTERMed wallet daemon
        svcmain.stopWorker();
        svcmain.stopService(true).then(() => {
            setTimeout(function(){
                // cleare form err msg
                formMessageReset();
                changeSection('section-overview');
                // update/clear tx
                txInputUpdated.value = 1;
                txInputUpdated.dispatchEvent(new Event('change'));
                // send fake blockUpdated event
                let resetdata = {
                    type: 'blockUpdated',
                    data: {
                        blockCount: -100,
                        displayBlockCount: -100,
                        knownBlockCount: -100,
                        displayKnownBlockCount: -100,
                        syncPercent: -100
                    }
                };
                svcmain.handleWorkerUpdate(resetdata);
                dialog = document.getElementById('main-dialog');
                if(dialog.hasAttribute('open')) dialog.close();
                svcmain.resetGlobals();
                gutils.clearChild(dialog);
                try{
                    if(null !== TXLIST_OBJ){
                        TXLIST_OBJ.clear();
                        TXLIST_OBJ.update();
                    }

                    TXLIST_OBJ = null;
                }catch(e){}
                setTxFiller(true);
            }, 1200);
        }).catch((err) => {
            console.log(err);
        });
    });
}

function handleWalletCreate(){
    overviewButtonCreate.addEventListener('click', () => {
        formMessageReset();
        let filePathValue = walletCreateInputPath.value ? walletCreateInputPath.value.trim() : '';
        let passwordValue =  walletCreateInputPassword.value ? walletCreateInputPassword.value.trim() : '';

        // validate path
        gutils.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath)=>{
            // validate password
            if(!passwordValue.length){
                formMessageSet('create','error', `Please enter a password, creating wallet without a password will not be supported!`);
                return;
            }

            settings.set('recentWalletDir', path.dirname(finalPath));

            // user already confirm to overwrite
            if(gutils.isRegularFileAndWritable(finalPath)){
                try{
                    // for now, backup instead of delete, just to be save
                    let ts = new Date().getTime();
                    let backfn = `${finalPath}.bak${ts}`;
                    fs.renameSync(finalPath, backfn);
                    //fs.unlinkSync(finalPath);
                }catch(err){
                   formMessageSet('create','error', `Unable to overwrite existing file, please enter new wallet file path`);
                   return;
                }
           }

            // create
            svcmain.createWallet(
                finalPath,
                passwordValue
            ).then((walletFile) => {
                settings.set('recentWallet', walletFile);
                walletOpenInputPath.value = walletFile;
                changeSection('section-overview-load');
                showToast('Wallet has been created, you can now open your wallet!',12000);
            }).catch((err) => {
                formMessageSet('create', 'error', err.message);
                return;
            });
        }).catch((err) => {
            formMessageSet('create','error', err.message);
            return;
        });
    });
}

function handleWalletImportKeys(){
    importKeyButtonImport.addEventListener('click', () => {
        formMessageReset();
        let filePathValue = importKeyInputPath.value ? importKeyInputPath.value.trim() : '';
        let passwordValue =  importKeyInputPassword.value ? importKeyInputPassword.value.trim() : '';
        let viewKeyValue = importKeyInputViewKey.value ? importKeyInputViewKey.value.trim() : '';
        let spendKeyValue = importKeyInputSpendKey.value ? importKeyInputSpendKey.value.trim() : '';
        let scanHeightValue = importKeyInputScanHeight.value ? parseInt(importKeyInputScanHeight.value,10) : 1;
        
        // validate path
        gutils.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath)=>{
            if(!passwordValue.length){
                formMessageSet('import','error', `Please enter a password, creating wallet without a password will not be supported!`);
                return;
            }


            if(scanHeightValue < 0 || scanHeightValue.toPrecision().indexOf('.') !== -1){
                formMessageSet('import','error', 'Invalid scan height!');
                return;
            }

            // validate viewKey
            if(!viewKeyValue.length || !spendKeyValue.length){
                formMessageSet('import','error', 'View Key and Spend Key can not be left blank!');
                return;
            }
    
            if(!gutils.validateSecretKey(viewKeyValue)){
                formMessageSet('import','error', 'Invalid view key!');
                return;
            }
            // validate spendKey
            if(!gutils.validateSecretKey(spendKeyValue)){
                formMessageSet('import','error', 'Invalid spend key!');
                return;
            }

            settings.set('recentWalletDir', path.dirname(finalPath));

            // user already confirm to overwrite
            if(gutils.isRegularFileAndWritable(finalPath)){
                try{
                    // for now, backup instead of delete, just to be save
                    let ts = new Date().getTime();
                    let backfn = `${finalPath}.bak${ts}`;
                    fs.renameSync(finalPath, backfn);
                    //fs.unlinkSync(finalPath);
                }catch(err){
                formMessageSet('import','error', `Unable to overwrite existing file, please enter new wallet file path`);
                return;
                }
            }

            svcmain.importFromKey(
                finalPath,// walletfile
                passwordValue,
                viewKeyValue,
                spendKeyValue,
                scanHeightValue
            ).then((walletFile) => {
                settings.set('recentWallet', walletFile);
                walletOpenInputPath.value = walletFile;
                changeSection('section-overview-load');
                showToast('Wallet has been imported, you can now open your wallet!', 12000);
            }).catch((err) => {
                formMessageSet('import', 'error', err);
                return;
            });

        }).catch((err)=>{
            formMessageSet('import','error', err.message);
            return;
        });
    });
}

function handleWalletImportSeed(){
    importSeedButtonImport.addEventListener('click', () => {
        formMessageReset();

        let filePathValue = importSeedInputPath.value ? importSeedInputPath.value.trim() : '';
        let passwordValue =  importSeedInputPassword.value ? importSeedInputPassword.value.trim() : '';
        let seedValue = importSeedInputMnemonic.value ? importSeedInputMnemonic.value.trim() : '';
        let scanHeightValue = importSeedInputScanHeight.value ? parseInt(importSeedInputScanHeight.value,10) : -1;
        // validate path
        gutils.validateWalletPath(filePathValue, DEFAULT_WALLET_PATH).then((finalPath)=>{
            // validate password
            if(!passwordValue.length){
                formMessageSet('import-seed','error', `Please enter a password, creating wallet without a password will not be supported!`);
                return;
            }

            if(scanHeightValue < 0 || scanHeightValue.toPrecision().indexOf('.') !== -1){
                formMessageSet('import-seed','error', 'Invalid scan height!');
                return;
            }

            if(!gutils.validateMnemonic(seedValue)){
                formMessageSet('import-seed', 'error', 'Invalid mnemonic seed value!');
                return;
            }

            settings.set('recentWalletDir', path.dirname(finalPath));

            // user already confirm to overwrite
            if(gutils.isRegularFileAndWritable(finalPath)){
                try{
                    // for now, backup instead of delete, just to be save
                    let ts = new Date().getTime();
                    let backfn = `${finalPath}.bak${ts}`;
                    fs.renameSync(finalPath, backfn);
                    //fs.unlinkSync(finalPath);
                }catch(err){
                   formMessageSet('import-seed','error', `Unable to overwrite existing file, please enter new wallet file path`);
                   return;
                }
           }

            svcmain.importFromSeed(
                finalPath,
                passwordValue,
                seedValue,
                scanHeightValue
            ).then((walletFile) => {
                settings.set('recentWallet', walletFile);
                walletOpenInputPath.value = walletFile;
                changeSection('section-overview-load');
                showToast('Wallet has been imported, you can now open your wallet!', 12000);
            }).catch((err) => {
                formMessageSet('import-seed', 'error', err);
                return;
            });

        }).catch((err)=>{
            formMessageSet('import-seed', 'error', err.message);
            return;
        });
    });
}

function handleWalletExport(){
    overviewShowKeyButton.addEventListener('click', () => {
        formMessageReset();
        if(!overviewWalletAddress.value) return;
        svcmain.getSecretKeys(overviewWalletAddress.value).then((keys) => {
            showkeyInputViewKey.value = keys.viewSecretKey;
            showkeyInputSpendKey.value = keys.spendSecretKey;
            showkeyInputSeed.value = keys.mnemonicSeed;
        }).catch(() => {
            formMessageSet('secret','error', "Failed to get key, please try again in a few seconds");
        });
    });

    showkeyButtonExportKey.addEventListener('click', () => {
        formMessageReset();
        let filename = remote.dialog.showSaveDialog({
            title: "Export keys to file...",
            filters: [
                { name: 'Text files', extensions: ['txt'] }
              ]
        });
        if(filename){
            svcmain.getSecretKeys(overviewWalletAddress.value).then((keys) => {
                let textContent = `Wallet Address:${os.EOL}${wlsession.get('loadedWalletAddress')}${os.EOL}`;
                textContent += `${os.EOL}View Secret Key:${os.EOL}${keys.viewSecretKey}${os.EOL}`;
                textContent += `${os.EOL}Spend Secret Key:${os.EOL}${keys.spendSecretKey}${os.EOL}`;
                textContent += `${os.EOL}Mnemonic Seed:${os.EOL}${keys.mnemonicSeed}${os.EOL}`;
                try{
                    fs.writeFileSync(filename, textContent);
                    formMessageSet('secret','success', 'Your keys have been exported, please keep the file secret!');
                }catch(err){
                    formMessageSet('secret','error', "Failed to save your keys, please check that you have write permission to the file");
                }
            }).catch(() => {
                formMessageSet('secret','error', "Failed to get keys, please try again in a few seconds");
            });
        }
    });
}

function handleSendTransfer(){
    sendMaxAmount.addEventListener('click', (event) => {
        let maxsend = event.target.dataset.maxsend;
        if(maxsend) sendInputAmount.value = maxsend;
        
    });
    sendInputFee.value = 0.1;
    function setPaymentIdState(addr){
        if(addr.length > 99){
            sendInputPaymentId.value = '';
            sendInputPaymentId.setAttribute('disabled', true);
        }else{
            sendInputPaymentId.removeAttribute('disabled');
        }
    }
    sendInputAddress.addEventListener('change', (event) => {
        let addr = event.target.value || '';
        if(!addr.length) initAddressCompletion();
        setPaymentIdState(addr);
    });
    sendInputAddress.addEventListener('keyup', (event) => {
        let addr = event.target.value || '';
        if(!addr.length) initAddressCompletion();
        setPaymentIdState(addr);
    });


    sendButtonSend.addEventListener('click', () => {
        formMessageReset();
        function precision(a) {
            if (!isFinite(a)) return 0;
            let e = 1, p = 0;
            while (Math.round(a * e) / e !== a) { e *= 10; p++; }
            return p;
        }

        let recAddress = sendInputAddress.value ? sendInputAddress.value.trim() : '';
        let recPayId = sendInputPaymentId.value ? sendInputPaymentId.value.trim() : '';
        let amount = sendInputAmount.value ?  parseFloat(sendInputAmount.value) : 0;
        let fee = sendInputFee.value ? parseFloat(sendInputFee.value) : 0;

        let tobeSent = 0;

        if(!recAddress.length || !gutils.validateTRTLAddress(recAddress)){
            formMessageSet('send','error','Sorry, invalid TRTL address');
            return;
        }

        if(recAddress === wlsession.get('loadedWalletAddress')){
            formMessageSet('send','error',"Sorry, can't send to your own address");
            return;
        }

        if(recPayId.length){
            if(!gutils.validatePaymentId(recPayId)){
                formMessageSet('send','error','Sorry, invalid Payment ID');
                return;
            }
        }

        if(recAddress.length > 99) recPayId = '';
        
        if (amount <= 0) {
            formMessageSet('send','error','Sorry, invalid amount');
            return;
        }

        if (precision(amount) > 2) {
            formMessageSet('send','error',"Amount can't have more than 2 decimal places");
            return;
        }

        let rAmount = amount; // copy raw amount for dialog
        tobeSent += amount;
        let minFee = 0.10;
        amount *= 100;

        if (fee < 0.10) {
            formMessageSet('send','error',`Fee can't be less than ${(minFee).toFixed(2)}`);
            return;
        }

        if (precision(fee) > 2) {
            formMessageSet('send','error',"Fee can't have more than 2 decimal places");
            return;
        }
        let rFee = fee; // copy raw fee for dialog
        tobeSent += fee;
        fee *= 100;
        

        let nodeFee = wlsession.get('nodeFee') || 0;
        tobeSent = (tobeSent+nodeFee).toFixed(2);

        const availableBalance = wlsession.get('walletUnlockedBalance') || (0).toFixed(2);

        if(parseFloat(tobeSent) > parseFloat(availableBalance)){
            formMessageSet(
                'send',
                'error', 
                `Sorry, you don't have enough funds to process this transfer. Transfer amount+fees: ${(tobeSent)}`
            );
            return;
        }

        let tx = {
            address: recAddress,
            fee: parseInt(fee,10),
            amount: parseInt(amount,10)
        };
        if(recPayId.length) tx.paymentId = recPayId;
        let tpl = `
            <div class="div-transaction-panel">
                <h4>Transfer Confirmation</h4>
                <div class="transferDetail">
                    <p>Please confirm that you have everything entered correctly.</p>
                    <dl>
                        <dt>Recipient address:</dt>
                        <dd>${tx.address}</dd>
                        <dt>Payment ID:</dt>
                        <dd>${recPayId.length ? recPayId : 'N/A'}</dd>
                        <dt class="dt-ib">Amount:</dt>
                        <dd class="dd-ib">${rAmount} TRTL</dd>
                        <dt class="dt-ib">Transaction Fee:</dt>
                        <dd class="dd-ib">${rFee} TRTL</dd>
                        <dt class="dt-ib">Node Fee:</dt>
                        <dd class="dd-ib">${(nodeFee > 0 ? nodeFee : '0.00')} TRTL</dd>
                        <dt class="dt-ib">Total:</dt>
                        <dd class="dd-ib">${tobeSent} TRTL</dd>
                    </dl>
                </div>
            </div>
            <div class="div-panel-buttons">
                <button data-target='#tf-dialog' type="button" class="form-bt button-red dialog-close-default" id="button-send-ko">Cancel</button>
                <button data-target='#tf-dialog' type="button" class="form-bt button-green" id="button-send-ok">OK, Send it!</button>
            </div>`;

        let dialog = document.getElementById('tf-dialog');
        gutils.innerHTML(dialog, tpl);
        dialog = document.getElementById('tf-dialog');
        dialog.showModal();

        let sendBtn = dialog.querySelector('#button-send-ok');

        sendBtn.addEventListener('click', (event) => {
            let md = document.querySelector(event.target.dataset.target);
            md.close();
            formMessageSet('send', 'warning', 'Sending transaction, please wait...<br><progress></progress>');
            svcmain.sendTransaction(tx).then((result) => {
                formMessageReset();
                let okMsg = `Transaction sent!<br>Tx. hash: ${result.transactionHash}.<br>Your balance may appear incorrect while transaction not fully confirmed.`;
                formMessageSet('send', 'success', okMsg);
                // check if it's new address, if so save it
                let newId = gutils.b2sSum(recAddress + recPayId);
                if(!abook.has(newId)){
                    let now = new Date().toISOString();
                    let newName = `unnamed (${now.split('T')[0].replace(/-/g,'')}_${now.split('T')[1].split('.')[0].replace(/:/g,'')})`;
                    let newBuddy = {
                        name: newName,
                        address: recAddress,
                        paymentId: recPayId,
                        qrCode: gutils.genQrDataUrl(recAddress)
                    };
                    abook.set(newId,newBuddy);
                }
                sendInputAddress.value = '';
                sendInputPaymentId.value = '';
                sendInputAmount.value = '';
            }).catch((err) => {
                formMessageSet('send', 'error', `Failed to send transaction:<br><small>${err}</small>`);
            });
            gutils.clearChild(md);
        });
    });

    sendOptimize.addEventListener('click', () => {
        if(!wlsession.get('synchronized', false)){
            showToast('Synchronization is in progress, please wait.');
            return;
        }

        if(!confirm('You are about to perform wallet optimization. This process may took a while to complete, are you sure?')) return;
        showToast('Optimization started, your balance may appear incorrect during the process', 3000);
        FUSION_IN_PROGRESS = true;
        svcmain.fusionTx.optimize().then((res) => {
            showToast(res, 6000);
            FUSION_IN_PROGRESS = false;
        });
        return;
    });
}

function handleTransactions(){
    // tx list options
    let txListOpts = {
        valueNames: [
            { data: [
                'rawPaymentId', 'rawHash', 'txType', 'rawAmount', 'rawFee',
                'fee', 'timestamp', 'blockIndex', 'extra', 'isBase', 'unlockTime'
            ]},
            'amount','timeStr','paymentId','transactionHash','fee'
        ],
        item: `<tr title="click for detail..." class="txlist-item">
                <td class="txinfo">
                    <p class="timeStr tx-date"></p>
                    <p class="tx-ov-info">Tx. Hash: <span class="transactionHash"></span></p>
                    <p class="tx-ov-info">Payment ID: <span class="paymentId"></span></p>
                </td><td class="amount txamount"></td>
        </tr>`,
        searchColumns: ['transactionHash','paymentId','timeStr','amount'],
        indexAsync: true
    };
    // tx detail
    function showTransaction(el){
        let tx = (el.name === "tr" ? el : el.closest('tr'));
        let txdate = new Date(tx.dataset.timestamp*1000).toUTCString();
        let dialogTpl = `
                <div class="div-transactions-panel">
                    <h4>Transaction Detail</h4>
                    <table class="custom-table" id="transactions-panel-table">
                        <tbody>
                            <tr><th scope="col">Hash</th>
                                <td data-cplabel="Tx. hash" class="tctcl">${tx.dataset.rawhash}</td></tr>
                            <tr><th scope="col">Address</th>
                                <td data-cplabel="Address" class="tctcl">${wlsession.get('loadedWalletAddress')}</td></tr>
                            <tr><th scope="col">Payment Id</th>
                                <td data-cplabel="Payment ID" class="tctcl">${tx.dataset.rawpaymentid}</td></tr>
                            <tr><th scope="col">Amount</th>
                                <td data-cplabel="Tx. amount" class="tctcl">${tx.dataset.rawamount}</td></tr>
                            <tr><th scope="col">Fee</th>
                                <td  data-cplabel="Tx. fee" class="tctcl">${tx.dataset.rawfee}</td></tr>
                            <tr><th scope="col">Timestamp</th>
                                <td data-cplabel="Tx. date" class="tctcl">${tx.dataset.timestamp} (${txdate})</td></tr>
                            <tr><th scope="col">Block Index</th>
                                <td data-cplabel="Tx. block index" class="tctcl">${tx.dataset.blockindex}</td></tr>
                            <tr><th scope="col">Is Base?</th>
                                <td>${tx.dataset.isbase}</td></tr>
                            <tr><th scope="col">Extra</th>
                                <td data-cplabel="Tx. extra" class="tctcl">${tx.dataset.extra}</td></tr>
                            <tr><th scope="col">Unlock Time</th>
                                <td>${tx.dataset.unlocktime}</td></tr>
                        </tbody>
                    </table> 
                </div>
                <div class="div-panel-buttons">
                    <button data-target="#tx-dialog" type="button" class="form-bt button-red dialog-close-default" id="button-transactions-panel-close">Close</button>
                </div>
            `;

        let dialog = document.getElementById('tx-dialog');
        gutils.innerHTML(dialog, dialogTpl);
        dialog = document.getElementById('tx-dialog');
        dialog.showModal();
    }

    function sortAmount(a, b){
        var aVal = parseFloat(a._values.amount.replace(/[^0-9.-]/g, ""));
        var bVal = parseFloat(b._values.amount.replace(/[^0-9.-]/g, ""));
        if (aVal > bVal) return 1;
        if (aVal < bVal) return -1;
        return 0;
    }

    function resetTxSortMark(){
        let sortedEl = document.querySelectorAll('#transaction-lists .asc, #transaction-lists .desc');
        Array.from(sortedEl).forEach((el)=>{
            el.classList.remove('asc');
            el.classList.remove('desc');
        });
    }

    function listTransactions(){
        if(wlsession.get('txLen') <= 0){
            setTxFiller(true);
            return;
        }

        let txs = wlsession.get('txNew');
        if(!txs.length) {
            if(TXLIST_OBJ === null || TXLIST_OBJ.size() <= 0) setTxFiller(true);
            return;
        }

        setTxFiller(false);
        let txsPerPage = 20;
        if(TXLIST_OBJ === null){
            if(txs.length > txsPerPage){
                txListOpts.page = txsPerPage;
                txListOpts.pagination = [{
                    innerWindow: 2,
                    outerWindow: 1
                }]; 
            }
            TXLIST_OBJ = new List('transaction-lists', txListOpts, txs);
            TXLIST_OBJ.sort('timestamp', {order: 'desc'});
            resetTxSortMark();
            txButtonSortDate.classList.add('desc');
            txButtonSortDate.dataset.dir = 'desc';
        }else{
            setTxFiller(false);
            TXLIST_OBJ.add(txs);
            TXLIST_OBJ.sort('timestamp', {order: 'desc'});
            resetTxSortMark();
            txButtonSortDate.classList.add('desc');
            txButtonSortDate.dataset.dir = 'desc';
        }
    }

    // listen to tx update
    txInputUpdated.addEventListener('change', (event) => {
        let updated = parseInt(event.target.value, 10) === 1;
        if(!updated) return;
        txInputUpdated.value = 0;
        listTransactions();
    });
    // listen to tx notify
    txInputNotify.addEventListener('change', (event)=>{
        let notify = parseInt(event.target.value, 10) === 1;
        if(!notify) return;
        txInputNotify.value = 0; // reset
        changeSection('section-transactions');
    });

    // tx detail
    gutils.liveEvent('.txlist-item', 'click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        return showTransaction(event.target);
    },document.getElementById('transaction-lists'));

    txButtonSortAmount.addEventListener('click',(event)=>{
        event.preventDefault();
        let currentDir = event.target.dataset.dir;
        let targetDir = (currentDir === 'desc' ? 'asc' : 'desc');
        event.target.dataset.dir = targetDir;
        resetTxSortMark();
        event.target.classList.add(targetDir);
        TXLIST_OBJ.sort('amount', {
            order: targetDir,
            sortFunction: sortAmount
        });
    });

    txButtonSortDate.addEventListener('click',(event)=>{
        event.preventDefault();
        let currentDir = event.target.dataset.dir;
        let targetDir = (currentDir === 'desc' ? 'asc' : 'desc');
        event.target.dataset.dir = targetDir;
        resetTxSortMark();
        event.target.classList.add(targetDir);
        TXLIST_OBJ.sort('timestamp', {
            order: targetDir
        });
    });

    txButtonRefresh.addEventListener('click', listTransactions);
}

// event handlers
function initHandlers(){
    initSectionTemplates();
    let darkStart = settings.get('darkmode', false);
    setDarkMode(darkStart);
    

    //external link handler
    gutils.liveEvent('a.external', 'click', (event) => {
        event.preventDefault();
        shell.openExternal(event.target.getAttribute('href'));
        return false;
    });

    // main section link handler
    for(var ei=0; ei < sectionButtons.length; ei++){
        sectionButtons[ei].addEventListener('click', (event) => {
            let target = event.currentTarget.dataset.section;
            changeSection(target);
        }, false);
    }

    // inputs click to copy handlers
    gutils.liveEvent('textarea.ctcl, input.ctcl', 'click', (event) => {
        let el = event.target;
        let wv = el.value ? el.value.trim() : '';
        let cplabel = el.dataset.cplabel ? el.dataset.cplabel : '';
        let cpnotice = cplabel ? `${cplabel} copied to clipboard!` : 'Copied to clipboard';
        el.select();
        if(!wv.length) return;
        clipboard.writeText(wv);
        showToast(cpnotice);
    });
    // non-input elements ctc handlers
    gutils.liveEvent('.tctcl', 'click', (event) => {
        let el = event.target;
        let wv = el.textContent.trim();
        let cplabel = el.dataset.cplabel ? el.dataset.cplabel : '';
        let cpnotice = cplabel ? `${cplabel} copied to clipboard!` : 'Copied to clipboard';
        gutils.selectText(el);
        if(!wv.length) return;
        clipboard.writeText(wv);
        showToast(cpnotice);
    });

    // overview page address ctc
    overviewWalletAddress.addEventListener('click', function(){
        if(!this.value) return;
        let wv = this.value;
        let clipInfo = document.getElementById('form-help-wallet-address');
        let origInfo = clipInfo.value;
        if(wv.length >= 10){
            //this.select();
            clipboard.writeText(wv.trim());
            clipInfo.textContent = "Address copied to clipboard!";
            clipInfo.classList.add('help-hl');
            setTimeout(function(){
                clipInfo.textContent = origInfo;
                clipInfo.classList.remove('help-hl');
            }, 1800);
        }
    });

    //genpaymentid+integAddress
    overviewPaymentIdGen.addEventListener('click', ()=>{
        genPaymentId(false);
    });

    gutils.liveEvent('#makePaymentId', 'click', () => {
        let payId = genPaymentId(true);
        document.getElementById('genInputPaymentId').value = payId;
    });

    overviewIntegratedAddressGen.addEventListener('click', showIntegratedAddressForm);
    gutils.liveEvent('#doGenIntegratedAddr', 'click', () => {
        formMessageReset();
        let genInputAddress = document.getElementById('genInputAddress');
        let genInputPaymentId = document.getElementById('genInputPaymentId');
        let outputField = document.getElementById('genOutputIntegratedAddress');
        let addr = genInputAddress.value ? genInputAddress.value.trim() : '';
        let pid = genInputPaymentId.value ? genInputPaymentId.value.trim() : '';
        outputField.value = '';
        outputField.removeAttribute('title');
        if(!addr.length || !pid.length){
            formMessageSet('gia','error', 'Address & Payment ID is required');
            return;
        }
        if(!gutils.validateTRTLAddress(addr)){
            formMessageSet('gia','error', 'Invalid TRTL address');
            return;
        }
        // only allow standard address
        if(addr.length > 99){
            formMessageSet('gia','error', 'Only standard TRTL address are supported');
            return;
        }
        if(!gutils.validatePaymentId(pid)){
            console.log(pid);
            formMessageSet('gia','error', 'Invalid Payment ID');
            return;
        }

        svcmain.genIntegratedAddress(pid, addr).then((res) => {
            formMessageReset();
            outputField.value = res.integratedAddress;
            outputField.setAttribute('title', 'click to copy');
        }).catch((err) => {
            formMessageSet('gia','error', err.message);
        });
    });

    // generic browse path btn event
    for (var i = 0; i < genericBrowseButton.length; i++) {
        let targetInputId = genericBrowseButton[i].dataset.targetinput;
        let targetprop =  genericBrowseButton[i].dataset.selection;
        let targetFileObj = genericBrowseButton[i].dataset.fileobj;
        
        genericBrowseButton[i].addEventListener('click', () => {
            var targetinput = document.getElementById(targetInputId);
            let objectName = (targetFileObj ? targetFileObj : 'file');
            let recentDir = settings.get('recentWalletDir','');
            if(targetprop === 'saveFile'){
                let saveOpts = {
                    title: `Select directory to store your ${objectName}, and give it a filename.`,
                    buttonLabel: 'OK'
                };
                if(recentDir.length) saveOpts.defaultPath = recentDir;
                remote.dialog.showSaveDialog(saveOpts, (file)=>{
                    if (file) targetinput.value = file;
                });
            }else{
                remote.dialog.showOpenDialog({properties: [targetprop]}, function (files) {
                    if (files) targetinput.value = files[0];
                });
            }
        });
    }

    // generic dialog closer
    gutils.liveEvent('.dialog-close-default','click', (event) => {
        let el = event.target;
        if(el.dataset.target){
            let tel = document.querySelector(el.dataset.target);
            tel.close();
        }
    });

    // try to respons to enter
    for(var oi=0;oi<genericEnterableInputs.length;oi++){
        let el = genericEnterableInputs[oi];
        el.addEventListener('keyup', (e) => {  
            if(e.key === 'Enter'){
                let section = el.closest('.section');
                let target = section.querySelector('button:not(.path-input-button)');
                if(target) target.dispatchEvent(new Event('click'));
            }
        });
    }

    let tp = document.querySelectorAll('.togpass');
    for(var xi=0; xi<tp.length; xi++){
        tp[xi].addEventListener('click', function(e){
            let targetId = e.currentTarget.dataset.pf;
            if(!targetId) return;
            let target = document.getElementById(targetId);
            if(!target) return;
            if(target.type === "password"){
                target.type = 'text';
                e.currentTarget.firstChild.dataset.icon = 'eye-slash';
            }else{
                target.type = 'password';
                e.currentTarget.firstChild.dataset.icon = 'eye';
            }
        });
    }

    // allow paste by mouse
    const pasteMenu = Menu.buildFromTemplate([
        { label: 'Paste', role: 'paste'}
    ]);

    for(var ui=0;ui<genericEditableInputs.length;ui++){
        let el = genericEditableInputs[ui];
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            pasteMenu.popup(remote.getCurrentWindow());
        }, false);
    }

    dmswitch.addEventListener('click', ()=>{
        let tmode = thtml.classList.contains('dark') ? '' : 'dark';
        setDarkMode(tmode);
    });

    kswitch.addEventListener('click', showKeyBindings);
  

    // settings handlers
    handleSettings();
    // addressbook handlers
    handleAddressBook();
    // open wallet
    handleWalletOpen();
    // close wallet
    handleWalletClose();
    // create wallet
    handleWalletCreate();
    // export keys/seed
    handleWalletExport();
    // send transfer
    handleSendTransfer();
    // import keys
    handleWalletImportKeys();
    // import seed
    handleWalletImportSeed();
    // transactions
    handleTransactions();
}

function initKeyBindings(){
    let walletOpened;
    // switch tab: ctrl+tab
    Mousetrap.bind(['ctrl+tab','command+tab'], switchTab);
    Mousetrap.bind(['ctrl+o','command+o'], () => {
        walletOpened = wlsession.get('serviceReady') || false;
        if(walletOpened){
            showToast('Please close current wallet before opening another wallet!');
            return;
        }
        return changeSection('section-overview-load');
    });
    // display/export private keys: ctrl+e
    Mousetrap.bind(['ctrl+e','command+e'],() => {
        walletOpened = wlsession.get('serviceReady') || false;
        if(!walletOpened) return;
        return changeSection('section-overview-show');
    });
    // create new wallet: ctrl+n
    Mousetrap.bind(['ctrl+n','command+n'], ()=> {
        walletOpened = wlsession.get('serviceReady') || false;
        if(walletOpened){
            showToast('Please close current wallet before creating/importing new wallet');
            return;
        }
        return changeSection('section-overview-create');
    });
    // import from keys: ctrl+i
    Mousetrap.bind(['ctrl+i','command+i'],() => {
        walletOpened = wlsession.get('serviceReady') || false;
        if(walletOpened){
            showToast('Please close current wallet before creating/importing new wallet');
            return;
        }
        return changeSection('section-overview-import-key');
    });
    // tx page: ctrl+t
    Mousetrap.bind(['ctrl+t','command+t'],() => {
        walletOpened = wlsession.get('serviceReady') || false;
        if(!walletOpened){
            showToast('Please open your wallet to view your transactions');
            return;
        }
        return changeSection('section-transactions');
    });
    // send tx: ctrl+s
    Mousetrap.bind(['ctrl+s','command+s'],() => {
        walletOpened = wlsession.get('serviceReady') || false;
        if(!walletOpened){
            showToast('Please open your wallet to make a transfer');
            return;
        }
        return changeSection('section-send');
    });
    // import from mnemonic seed: ctrl+shift+i
    Mousetrap.bind(['ctrl+shift+i','command+shift+i'], () => {
        walletOpened = wlsession.get('serviceReady') || false;
        if(walletOpened){
            showToast('Please close current wallet before creating/importing new wallet');
            return;
        }
        return changeSection('section-overview-import-seed');
    });

    // back home
    Mousetrap.bind(['ctrl+home','command+home'], ()=>{
        let section = walletOpened ? 'section-overview' : 'section-welcome';
        return changeSection(section);
    });

    // show key binding
    Mousetrap.bind(['ctrl+/','command+/'], () => {
        let openedDialog = document.querySelector('dialog[open]');
        if(openedDialog) return openedDialog.close();
        return showKeyBindings();
    });

    Mousetrap.bind('esc', () => {
        let openedDialog = document.querySelector('dialog[open]');
        if(openedDialog) return openedDialog.close();
    });

    Mousetrap.bind([`ctrl+\\`,`command+\\`], ()=>{
        setDarkMode(!document.documentElement.classList.contains('dark'));
    });
}

// spawn event handlers
document.addEventListener('DOMContentLoaded', () => {
    initHandlers();
    showInitialPage();
    initKeyBindings();
}, false);


// ipc listeners
//ipcRenderer.on('cleanup', (event, message) => {
ipcRenderer.on('cleanup', () => {
    if(!win.isVisible()) win.show();
    if(win.isMinimized()) win.restore();

    win.focus();

    var dialog = document.getElementById('main-dialog');
    let htmlText = 'Terminating WalletShell...';
    if(wlsession.get('loadedWalletAddress') !== ''){
        htmlText = 'Saving &amp; closing your wallet...';
    }

    let htmlStr = `<div class="div-save-main" style="text-align: center;padding:1rem;"><i class="fas fa-spinner fa-pulse"></i><span style="padding:0px 10px;">${htmlText}</span></div>`;
    dialog.innerHTML = htmlStr;
    dialog.showModal();
    try{ svcmain.stopWorker();}catch(e){}
    svcmain.stopService().then(() => {
        setTimeout(function(){
            dialog.innerHTML = 'Good bye!';
            win.close();
        }, 1200);
    }).catch((err) => {
        win.close();
        console.log(err);
    });
});