# Automatic Attachment Signatures for Gmail

This Chrome extension automatically adds digital signatures to email attachments on the form of text files.

The use of digital signatures on attachments *should* guarantee the provenance of files: if a file is alleged to have been generated by the email's owner, it should have a valid digital signature file to accompany it. If a file is alleged to come from the email's owner but does NOT have a signature, it should be considered of completely unknown provenance and treated accordingly. In other words, only files with a VALID signature are to be trusted as the True Word of the email account's owner.

The extension was developed on Google Chrome, but it may also work on other Chromium-based browsers. It has been (very lightly!) tested on Brave. No tests have been performed on Edge. Use at your own risk (which you should do, anyways, since this extension accesses your Gmail account and could, in theory, read, alter, intercept and copy any and all messages).

## Installation and use

The extension is provided as an unpacked Chrome extension. I currently have no plans to package it and distribute it on the Chrome Web Store.

To use the extension, therefore, the following steps are required:
1. Clone or download the repository, or at least the `extension` folder.
1. Configure the extension:
    1. Copy the `extension/credentials.js.sample` file to `extension/credentials.js`.
    1. Edit `extension/credentials.js` and fill all fields with your own data. `INBOXSDK_APP_ID` should be generated on InboxSDK's page (the URL is on the `credentials.js` file).
1. Open Chrome/Brave, open the Extensions tab, toggle Developer Mode on (there should be a toggle switch somewhere in the window, or see [here](https://developer.chrome.com/docs/extensions/mv2/getstarted/#manifest) for screenshots)
1. Click the Load Unpacked button, browse to the `extension` folder and select it.
1. The Options page for the newly installed extension should appear. Configure the extension to your liking:
  * The Verification webpage URL should be set to the URL where the companion verifier webpage is hosted (it will appear on email footers and on every signature file). See below for more details on the verifier.
  * Choose a file containing a valid ECDSA P-521 private key, encoded as PEM, for the Private key file field. This private key will be used to generate the signatures, and its corresponding public key should be used to verify them.
1. Open or reload Gmail.
1. Click the New Message button or Reply to a message.
1. Check that a blue "Sign & Send" button appears near the normal Send button.

You're done!

From now on, every time you want to send an email with attachments, click the new "Sign & Send" button instead of the normal Send button. The extension will compute digital signatures for all attachments and add them as new attachments, with the same name as the originals plus a `.signature` extension. These signatures can be verified with the aid of a companion webpage (see below). The extension will also add a footer to your message, explaining what are the new attachments for, and a link to the verification page. This footer is intended for the email recipient.

## Companion verification webpage

The signatures are useless if the email recipients don't verify them. This is the job of the companion webpage, which is contained on the `docs` folder (just because Github Pages wants to serve files located either at the root of the repository or on a `docs` directory. This webpage should prompt the user to upload a file and its signature, verify the signature against the file using a (currently hard-coded) public key, and show the user a big PASS/FAIL message. The public key can be safely hardcoded, because it's... well... public.

My own implementation is hosted on Github Pages, since it comes for free with the repo! The verification webpage is extremely simple: a single HTML file, some JS and some CDN links for Vue and Vuetify. Therefore, it should be hostable virtually anywhere.

Before deployment, you should rename `docs/credentials.js.example` to `docs/credentials.js` and edit it to contain your own public key and name. The key on `docs/credentials.js.example` is not a valid key, and the one that was included on previous versions of the code was (and still is) useless without the matching private key, which I will NOT ever commit to the repo :)

## Cryptography (safely skippable if uninterested/inexperienced)

### Use case

This extension aims to solve the following problem: given an attachment that is alleged to come from person X, how do I, as a random person, verify it? How can I know that the file was not edited to taste? Also, a low technical skill requirement would be nice: verifiers should be able to easily upload the suspect file and see a YES/NO result.

Development of this extension was started when an acquaintance of the author had a very interesting experience: he wrote, printed, hand-signed, scanned and e-mailed a report. It is important to note that the report was originally a paper document (NOT a document saved as a PDF, an actual printed and hand-signed document). The document was resent to him, with some typos, I think, corrected. The "corrected" document was then sent to the final recipient.

Now, this is quite an interesting issue. At least in my experience, scanned, hand-signed documents tend to command greater respect and trust that a simple text document saved as a PDF with a name at the bottom. There is a greater expectation that the author of the document is the person whose signature is in the scan. The aforementioned experience showed that scanned documents are very easily forgeable. The impacts of a forged document vary widely. In this case, the scenario was deemed Scary Enough (an actual real engineering metric used in risk assessments) to warrant some action.

This extension is the action. It solves the problem by using digital signatures, computed on-the-fly and sent along the files. Every attached file gets a new attachment, that contains a ECDSA signature for the attachment. The extension also adds a footer to the email, with a link to a webpage where the attachments can be verified.

### Threat model

This extension protects agains a specific scenario: given that Alice has a file that was (allegedly) produced by Bob, Alice can check that:

* The file was indeed produced by Bob (i.e., Bob himself created the file), and
* The file hasn't been tampered with (no Eve has changed a single bit from the file that Bob had on his hard drive)

This holds true even if Alice didn't get the file directly from Bob (she may have been forwarded the file by Charlie, with the message "Here is the file that Bob gave me for you").

This extension assumes a trusted computer from where the emails are sent. [Immutable Law #3](https://web.archive.org/web/20180110175038/https://technet.microsoft.com/en-us/library/hh278941.aspx) still applies here. If Bad Guy gets his hands on the trusted PC, he can simply open the extension settings and copy the private key.

### Algorithms
We need a way to generate a string that verifies a file: it should be possible to detect even a single bit flip in the file, much like a hash does. Additionally, (and unlike a hash) it should be impossible to generate the signature without some secret knowledge, and it should be possible to verify the signature of a file without the same secret knowledge.

That is essentially the definition of a digital signature (at least for practical purposes). 

The extension uses the [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API), fully supported by all major browsers except IE (of course). In particular, signatures are computed using ECDSA, with SHA-512 as the hashing algorithm.

Keys are generated from the ECDSA P-521 curve, since it's bigger, and more bits are more better. The private key is used to [generate the signatures](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign), and is kept (hopefully) secret.

The verifier uses the public key. The [verification](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/verify) takes the file, the alleged signature and the public key, and returns a VALID/INVALID response.

### Assumptions and limitations
* This extension is COMPLETELY useless if the recipients don't check the received files or if they check the files in a cloned verifier page.
* (Related to the issue above) The extension requires that all recipients expect signatures with their attached files: if the sender signs some attachments but not others, a recipient has no way of knowing if the signature is missing because the sender did not compute it, or if the document was forged and the signature suppressed. There must be a general agreement of "If I get an attachment that is said to come from X, I want the signature verified before I believe it. No exceptions."
* The extension doesn't automatically sign the attached files, since the used SDK (InboxSDK) has trouble with adding new attachments when the Send button is clicked. There is a button, beside the normal Send button, that computes and attaches all signatures. This adds an extra manual step.