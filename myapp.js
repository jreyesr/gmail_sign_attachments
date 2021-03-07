InboxSDK.load(2, CREDENTIALS.INBOXSDK_APP_ID).then(function(sdk){

  // the SDK has been loaded, now do something with it!
  sdk.Compose.registerComposeViewHandler(function(composeView){

    // a compose view has come into existence, do something with it!
    composeView.addButton({
      title: "Sign & Send",
      type: "SEND_ACTION",
      iconUrl: "https://material-icons.github.io/material-icons-png/png/white/edit/baseline-4x.png",
      iconClass: "sendAndSign",
      onClick: function(event) {
        signAndSend(event.composeView);
      },
    });
  });
});

function getAttachments(mailBody) {
  var attachmentLinks = mailBody.querySelectorAll('input[name="attach"] + a');
  return Array.from(attachmentLinks).map(a => a.getAttribute("href"));
}

/** @brief Compute a signature from the contents of a URL
    
    @param url A string containing a URL pointing to the file that will be signed
**/
async function computeSignature(url) {
  // The following two functions are on https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey#pkcs_8_import
  function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
  function importPrivateKey(pem) {
    // fetch the part of the PEM string between header and footer
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).trim();
    // base64 decode the string to get the binary data
    const binaryDerString = window.atob(pemContents);
    // convert from a binary string to an ArrayBuffer
    const binaryDer = str2ab(binaryDerString);

    return window.crypto.subtle.importKey(
      "pkcs8",
      binaryDer,
      {
        name: "ECDSA",
        namedCurve: "P-521"
      },
      true,
      ["sign"]
    );
  }
  
  async function sign(data, key) {
    return await window.crypto.subtle.sign(
      { name: "ECDSA", hash: {name: "SHA-512"} },
      key,
      data
    );
  }
  
  let key = await importPrivateKey(CREDENTIALS.PRIVATE_SIGNING_KEY);
  let fileContents = (await fetch(url)).arrayBuffer();
  let signature = await sign(await fileContents, key);
    
  return signature;
}

function signAndSend(composeView) {  
  let files = [];
  // 1. Iterate over all attachments
  // https://stackoverflow.com/questions/47786892/get-all-attachments-of-gmail-compose-box-using-inboxsdk
  var mailBody = composeView.getBodyElement().closest('div.inboxsdk__compose');
  for(let attachmentUrl of getAttachments(mailBody)) {
    computeSignature(attachmentUrl).then(sig => console.log(btoa(sig)));
  }
  
  // 2. Sign every attachment, create files: Array<Blob>
  // composeView.attachFiles(files);
  
  // 3. Add footer on message explaining attachments & link to verification page
  
  composeView.send();
}
