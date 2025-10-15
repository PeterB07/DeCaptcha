chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "capture") {
      chrome.tabs.captureVisibleTab(sender.tab.windowId, {format: 'png'}, function(dataUrl) {
        sendResponse({dataUrl: dataUrl});
      });
      return true;  // Important: Indicate that you wish to send a response asynchronously
    } else if (request.message === "activate") {
      // Here you can add any background processing needed for activation
      // For now, just send a success response back to the content script
      sendResponse({message: "success"});
      return true;
    }
  }
);