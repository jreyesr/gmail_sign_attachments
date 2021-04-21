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

function verifySignature(files) {
    // Sort files by the length of their .name property (ascending)
    const sortedFiles = Array.from(files).sort((a, b) => a.name.length - b.name.length);
    // First file has shortest name, therefore file. Second file has longest name, therefore signature
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
    return Promise.all([
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

        return crypto.subtle.verify(
            { name: "ECDSA", hash: {name: "SHA-512"} },
            key,
            signatureAb,
            fileAb
        );
    });
}

function namesMatch(files) {
    const sortedFilenames = Array.from(files).map(f => f.name).sort((a, b) => a.length - b.length);
    if(sortedFilenames[1] != sortedFilenames[0] + ".signature.txt") {
        return `The signature does not appear to correspond to the file!
          Choose files ${sortedFilenames[0]} and ${sortedFilenames[0]}.signature.txt}`;
    }
    return true;
}

app = new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data: {
        files: [],
        formValid: false,
        sigValid: false,
        sigInvalid: false,
        computing: false,
        rules: [
            files => !files || files.length == 2 || "Select exactly 2 files!",
            files => !files || namesMatch(files)
        ]
    },
    methods: {
        verifySignature() {
            this.computing = true;
            verifySignature(this.files).then(valid => {
                this.computing = false;
                this.sigValid = valid;
                this.sigInvalid = !valid;
            });
        },
        resetAlerts() {
            this.sigValid = this.sigInvalid = false;
        }
    },
    computed: {
        tooltipMessage() {
            return "asd"
        },
        userName: () => CREDENTIALS.USER_NAME,
    }
})
