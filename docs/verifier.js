function flashMessage(msg, delay=750) {
  var status = document.getElementById('status');
  status.textContent = msg;
  setTimeout(function() {
    status.textContent = '';
  }, delay);
}

function importPublicKey(pem) {
  function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

  // fetch the part of the PEM string between header and footer
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length).trim();
  // base64 decode the string to get the binary data
  const binaryDerString = window.atob(pemContents);
  // convert from a binary string to an ArrayBuffer
  const binaryDer = str2ab(binaryDerString);

  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "ECDSA",
      namedCurve: "P-521"
    },
    true,
    ["verify"]
  );
}

function verifySignature() {
  // Sort files by the length of their .name property (ascending)
  const sortedFiles = Array.from(filesElement.files).sort((a, b) => a.name.length - b.name.length);
  let file = sortedFiles[0], signature = sortedFiles[1];

  // Just a couple of helper functions to read a file to an ArrayBuffer/string
  async function readToArrayBuffer(file) {
    return await file.arrayBuffer();
  }
  async function readToString(file) {
    return await file.text();
  }
  async function readToCryptoKey(pem) {
    return await importPublicKey(pem);
  }

  // Read both files (original file and signature), wait for all promises to resolve and then keep working
  Promise.all([
      readToArrayBuffer(file),
      readToString(signature),
      readToCryptoKey(CREDENTIALS.PUBLIC_VERIFICATION_KEY),
  ]).then(results => {
    let fileAb = results[0], signatureString = results[1], key = results[2];
    let base64Signature = signatureString.split("\n")[2];
    let binarySignature = window.atob(base64Signature);
    let len = binarySignature.length;
    let signatureBuffer = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        signatureBuffer[i] = binarySignature.charCodeAt(i);
    }
    let signatureAb = signatureBuffer.buffer;

    crypto.subtle.verify(
      { name: "ECDSA", hash: {name: "SHA-512"} },
      key,
      signatureAb,
      fileAb
    ).then(valid => {
      //alert(valid);
      document.getElementById(valid ? "valid_message" : "invalid_message").style.display = "block";
    });
  });
}

const filesElement = document.getElementById("files");
const verifyButton = document.getElementById("verify");

verifyButton.addEventListener("click", verifySignature);
filesElement.addEventListener("change", handleFileChange, false);
function handleFileChange() {
  // Hide the two result divs (valid & invalid signature)
  document.getElementById("valid_message").style.display = "none";
  document.getElementById("invalid_message").style.display = "none";

  const files = filesElement.files;

  let valid = true;
  // Assert that there are only 2 files
  if(files.length != 2) {
    flashMessage("Select exactly 2 files!");
    verifyButton.disabled = true;
    return;
  }

  // Check if files have same name and one has suffix .signature.txt
  // Get filenames, sort by length (ascending)
  const sortedFilenames = Array.from(files).map(f => f.name).sort((a, b) => a.length - b.length);
  if(sortedFilenames[1] != sortedFilenames[0] + ".signature.txt") {
    flashMessage(`The signature does not appear to correspond to the file!
      Choose files ${sortedFilenames[0]} and ${sortedFilenames[0] + ".signature.txt"}`, 2000);
    verifyButton.disabled = true;
    return;
  }

  // If all checks succeeded, everything is OK. Enable Submit button and fill filename
  verifyButton.disabled = false;
  for(const e of document.getElementsByClassName("filename")) {
    e.textContent = sortedFilenames[0];
  }
}
