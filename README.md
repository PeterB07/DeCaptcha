# Local CAPTCHA Project

This project demonstrates a local-only CAPTCHA test and an owner-only assistive solver.

## Run Instructions

**Step A: Place nine images into `site/images/` named `1.jpg` .. `9.jpg`. Use public-domain images.**

**Step B: Start static server:**

```bash
cd local_captcha_project/site
python -m http.server 8000
```

**Step C: Install server dependencies and run Flask server:**

```bash
cd ../server
python -m venv venv
source venv/bin/activate    # or venv\\Scripts\\activate on Windows
pip install -r requirements.txt
python app.py
```

**Step D: Load extension in Chrome as unpacked extension (select `local_captcha_project/extension`).**

**Step E: Open `http://127.0.0.1:8000`, set passphrase in popup, enable assist, click Analyze on either captcha, observe suggestions overlayed, manually confirm or use Auto-Apply with passphrase.**

## Security and constraints

*   The extension manifest restricts host\_permissions to `http://127.0.0.1:8000/*` only.
*   The extension requires a passphrase for any automated clicks.
*   The server binds to localhost only and is for local owner-only use.

## Troubleshooting

*   If capture fails, allow extension capture permission.