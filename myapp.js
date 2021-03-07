InboxSDK.load(2, CREDENTIALS.INBOXSDK_APP_ID).then(function(sdk){

  // the SDK has been loaded, now do something with it!
  sdk.Compose.registerComposeViewHandler(function(composeView){

    // a compose view has come into existence, do something with it!
    composeView.addButton({
      title: "My Nifty Button!",
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

/** @brief Compute a 
    
    @param 
**/
function computeSignature(url) {
  fetch(url)
    .then(response => response.arrayBuffer())
    .then(data => console.log(data));
}

function signAndSend(composeView) {  
  let files = [];
  // 1. Iterate over all attachments
  // https://stackoverflow.com/questions/47786892/get-all-attachments-of-gmail-compose-box-using-inboxsdk
  var mailBody = composeView.getBodyElement().closest('div.inboxsdk__compose');
  for(let attachmentUrl of getAttachments(mailBody)) {
    computeSignature(attachmentUrl);
  }
  
  // 2. Sign every attachment, create files: Array<Blob>
  // composeView.attachFiles(files);
  
  // 3. Add footer on message explaining attachments & link to verification page
  
  composeView.send();
}
