const DEFAULT_VERIFICATION_PAGE = "https://example.com";

function showMessage(msg, delay=750) {
  var status = document.getElementById('status');
  status.textContent = msg;
  setTimeout(function() {
    status.textContent = '';
  }, delay);
}

function _saveOptions({footer, verificationPage, privateKey}) {
  chrome.storage.sync.set({
    footer: footer,
    verificationPage: verificationPage,
    privateKey: privateKey,
  }, function() {
    // Update status to let user know options were saved.
    showMessage('Options saved.', 750);
    restore_options();
  });
}

// Saves options to chrome.storage
function save_options() {
  var footer = document.getElementById('footer').checked;
  var verificationPage = document.getElementById('verificationPage').value;

  if(verificationPage == DEFAULT_VERIFICATION_PAGE) {
    showMessage("Please enter a valid verification page");
    return;
  }

  var fileChooser = document.getElementById("privateKeyUpload");
  const currentPrivateKey = document.getElementById('privateKey').value
  var privateKeyExists = currentPrivateKey != "";

  // User wants to update private key (PK), read & save it
  if (fileChooser.files.length == 1) {
    // Read file from #privateKeyUpload, save string to pk variable
    fileChooser.files[0].text().then(pk => {
      _saveOptions({footer: footer, verificationPage: verificationPage, privateKey: pk})
    });
  } else { // User didn't specify a PK file, see if there is one already set
    if(privateKeyExists) { // Just preserve current PK
      _saveOptions({footer: footer, verificationPage: verificationPage, privateKey: currentPrivateKey})
    } else { // No PK file provided and no current PK, show error message
      showMessage("Please choose a private key!", 1000);
      return;
    }
  }
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restore_options() {
  // Use default value color = 'red' and likesColor = true.
  chrome.storage.sync.get({
    footer: true,
    verificationPage: DEFAULT_VERIFICATION_PAGE,
    privateKey: "",
  }, function(items) {
    document.getElementById('footer').checked = items.footer;
    document.getElementById('verificationPage').value = items.verificationPage;
    document.getElementById('privateKey').value = items.privateKey;
  });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('save').addEventListener('click',
    save_options);
