function activateSolver() {
  chrome.storage.local.get(['passphrase'], function(result) {
    const passphrase = result.passphrase;
    chrome.runtime.sendMessage({message: "activate", passphrase: passphrase}, function(response) {
      if (response.message === "success") {
        console.log("Solver activated with correct passphrase!");
        // Automatically check the checkbox CAPTCHA
        const checkbox = document.getElementById('notabot');
        if (checkbox) {
          checkbox.checked = true;
        }
        
        // Fetch the solution for the grid CAPTCHA and select the correct images
        fetch('http://127.0.0.1:5000/solution')
          .then(response => response.json())
          .then(data => {
            const solution = data.solution;
            const cells = document.querySelectorAll('#grid .cell');
            cells.forEach(cell => {
              const img = cell.querySelector('img');
              if (img) {
                const imgSrc = img.src.split('/').pop(); // Get the filename
                if (solution.includes(imgSrc)) {
                  cell.classList.add('selected');
                }
              }
            });
            // Send a success message back to the popup
            chrome.runtime.sendMessage({message: "solver_activated"});
          });
      } else {
        console.log("Incorrect passphrase!");
      }
    });
  });
}

function analyzeCaptcha(captchaArea) {
  const rect = captchaArea.getBoundingClientRect();
  chrome.runtime.sendMessage({action: "capture", rect: rect}, function(response) {
    const dataUrl = response.dataUrl;
    // Crop the image to the rect
    const croppedDataUrl = cropImage(dataUrl, rect);
    // Send the cropped dataUrl to the server
    sendDataUrlToServer(croppedDataUrl);
  });
}

function cropImage(dataUrl, rect) {
  const canvas = document.createElement('canvas');
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext('2d');
  const img = new Image();
  img.src = dataUrl;
  img.onload = function() {
    ctx.drawImage(img, 0, 0, rect.width, rect.height, 0, 0, rect.width, rect.height);
  };
  return canvas.toDataURL();
}

function sendDataUrlToServer(dataUrl, captchaArea) {
  fetch('http://127.0.0.1:5000/predict', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({image: dataUrl, mode: 'grid'})
  })
  .then(response => response.json())
  .then(data => {
    // Overlay suggestion outlines on the grid cells
    overlaySuggestions(data.suggestions, captchaArea);
  });
}

function overlaySuggestions(suggestions, captchaArea) {
  const grid = captchaArea.querySelector('#grid');
  if (grid) {
    const cells = grid.querySelectorAll('.cell');
    suggestions.forEach(suggestion => {
      const cellIndex = suggestion.cell;
      if (cellIndex >= 0 && cellIndex < cells.length) {
        const cell = cells[cellIndex];
        cell.classList.add('suggested');
      }
    });
  }
}

function injectAnalyzeButton(captchaArea) {
  const button = document.createElement('button');
  button.innerText = 'Analyze';
  button.addEventListener('click', () => {
    analyzeCaptcha(captchaArea);
  });
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.action === "enable-assist") {
      // Inject analyze button near each captcha area
      const captchaAreas = document.querySelectorAll('.captcha-box');
      captchaAreas.forEach(captchaArea => {
        injectAnalyzeButton(captchaArea);
      });
    }
    if (request.action === "auto-apply") {
      activateSolver();
      console.log("Auto-apply enabled");
    }
  }
);