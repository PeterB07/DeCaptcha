document.getElementById('activate').addEventListener('click', () => {
  const passphrase = document.getElementById('passphrase').value;
  chrome.storage.local.set({ passphrase: passphrase }, () => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: 'auto-apply', enable: true});
    });
  });
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.message === "solver_activated") {
      document.getElementById('status').innerText = 'Solver activated';
    }
  }
);