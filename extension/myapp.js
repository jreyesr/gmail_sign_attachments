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
  return Array
    .from(attachmentLinks) // Convert NodeList to array
    .map(a => [a.firstChild.textContent, a.getAttribute("href")]) // firstChild is text, second is size, href points to Google servers
    .filter(a => !a[0].endsWith(".signature.txt")); // Don't compute the signature of signatures!
}

/** @brief Compute a signature from the contents of a URL

    @param url A string containing a URL pointing to the file that will be signed
**/
async function computeSignature(filename, url) {
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

  return [filename, signature];
}

function signAndSend(composeView) {
  let signaturePromises = [];
  // 1. Iterate over all attachments
  // https://stackoverflow.com/questions/47786892/get-all-attachments-of-gmail-compose-box-using-inboxsdk
  var mailBody = composeView.getBodyElement().closest('div.inboxsdk__compose');
  for(let [filename, attachmentUrl] of getAttachments(mailBody)) {
    signaturePromises.push(computeSignature(filename, attachmentUrl));
  }

  // https://stackoverflow.com/a/9458996
  function _arrayBufferToBase64( buffer ) {
    let binary = '';
    let bytes = new Uint8Array( buffer );
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode( bytes[ i ] );
    }
    return window.btoa( binary );
  }

  // Wait for all signatures to resolve
  Promise.all(signaturePromises).then(signatures => {
    // First map turns the signature into a Base64 string
    // Second map turns the Base64 string into a Blob with a header and a footer
    let blobs = signatures
      .map(sig => [sig[0], _arrayBufferToBase64(sig[1])])
      .map(sig => [
        sig[0],
        new Blob([
          "This is the signature for file ",
          sig[0], "\n\n", sig[1],
          "\n\n You can verify the signature on ",
          CREDENTIALS.VERIFICATION_URL])]);

    // Per https://inboxsdk.github.io/inboxsdk-docs/compose#attachfilesfiles, Blob objects MUST have their name property set
    blobs.forEach(b => b[1].name = b[0] + ".signature.txt"); // Set attachment name to original name plus ".signature.txt" suffix
    blobs = blobs.map(b => b[1]); // The filename is no longer required, just take it out

    // 2. Attach signatures as files to message
    composeView.attachFiles(blobs);

    // 3. Add footer on message explaining attachments & link to verification page
    if(signatures.length > 0) {
      let footer = document.createElement("div");
      footer.innerHTML = `<hr>This email's attachments are digitally signed to guarantee that they come from A B. To verify the signatures, visit <a href="${CREDENTIALS.VERIFICATION_URL}">${CREDENTIALS.VERIFICATION_URL}</a>`;
      composeView.setBodyHTML(composeView.getHTMLContent() + footer.outerHTML);
    }

    // 4. Send message (finally!)
    composeView.send();
  });
}
