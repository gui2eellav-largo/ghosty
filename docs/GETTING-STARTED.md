# Getting Started with Ghosty

You just downloaded Ghosty. Here's how to go from zero to your first voice command in under 2 minutes.

---

## 1. Install and open

1. Open the `.dmg` file and drag Ghosty to your Applications folder
2. **Important — first launch requires one Terminal command:**
   - macOS blocks unsigned apps by default. Open **Terminal** (search "Terminal" in Spotlight) and paste:
   ```
   xattr -cr /Applications/Ghosty.app
   ```
   - Press Enter. You only need to do this once.
3. Launch Ghosty from your Applications folder
4. Grant **microphone access** when prompted (System Settings > Privacy > Microphone)

## 2. Set up your API key

Ghosty uses AI services to transcribe and transform your voice. You need at least one API key.

**Option A — Groq (recommended to start)**
- Go to [console.groq.com/keys](https://console.groq.com/keys)
- Create a free account
- Generate an API key (starts with `gsk_`)
- Paste it in the onboarding screen and select "Groq"
- Groq is fast (~0.5s transcription) and has a generous free tier

**Option B — OpenAI**
- Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- Create an account and add a payment method
- Generate an API key (starts with `sk-`)
- Cost: ~$0.006/min of audio, pay-as-you-go (no subscription)

**Best setup (later):** Use Groq for transcription (fast) and OpenAI for text transformation (best quality). You can configure this in Settings > Models after onboarding.

## 3. Make your first recording

1. Open any app where you type (Notes, Slack, browser, email...)
2. Click in a text field
3. **Hold `Ctrl+Shift+Space`** and speak your idea
4. **Release** — Ghosty transcribes and pastes the result

That's it. Your text appears where your cursor was.

## 4. Understand the modes

The colored dot in the floating widget shows your active mode. Scroll on it to switch.

| Mode | What it does | Example |
|------|-------------|---------|
| **Direct** (blue) | Clean transcription — no AI rewrite | "Send the report to Marc before Friday" → same text, cleaned up |
| **Shape** (green) | Organize and tighten | "I need to uh write an email about the budget thing" → "Draft an email requesting Q2 budget review" |
| **Reframe** (orange) | Rephrase with strategic context | "Help me with the presentation" → "Create a 10-slide investor pitch covering traction, market size, and ask" |
| **Build** (purple) | Expand into a full structured request | "Calendar app" → Full product brief with features, user stories, and technical requirements |

**Direct mode** is best for quick dictation. **Shape** is the sweet spot for most AI interactions.

## 5. The floating widget

The small dot at the top of your screen is always there. It's your main control:

- **Hover** to reveal the record button
- **Scroll** on the dot to switch modes
- **Click** the dot to open the mode menu
- The dot color = your current mode

## 6. Customize (optional)

Open the Dashboard (click the tray icon or press `Cmd+Shift+D`):

- **Home** — See your recording history, copy past results
- **Modes** — Create custom modes with your own instructions
- **Dictionary** — Add words Ghosty often mishears (names, acronyms, jargon)
- **Settings** — Change shortcut, switch providers, adjust behavior

## Tips

- **Short recordings work best.** 3-10 seconds is the sweet spot.
- **Speak naturally.** Ghosty removes filler words ("uh", "like", "you know").
- **Use Shape mode** when writing prompts for ChatGPT or Claude — it compresses your intent.
- **Use Direct mode** for messages, emails, and notes — it just cleans up your speech.
- **Add your name and company to the Dictionary** so Ghosty transcribes them correctly.
- **VPN can block Groq.** If you get "Connection blocked" errors, try disabling your VPN.

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Space` | Hold to record (hands-free toggle) |
| `Ctrl+Space` | Hold to record (push-to-talk) |
| `Escape` | Stop recording |
| `Ctrl+Cmd+V` | Paste last result |
| `Cmd+Shift+D` | Open Dashboard |

All shortcuts can be customized in Settings > Shortcuts.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Nothing happens when I press the shortcut | Check microphone permission in System Settings > Privacy > Microphone |
| "Connection blocked" error | Disable VPN — Groq blocks VPN/proxy IPs |
| "Missing API key" error | Go to Settings > API Keys and add your key |
| Text not pasted | Click in a text field first, then record. Ghosty pastes into the focused app |
| Wrong language | Go to Settings > Models > Default language |
| Word always misspelled | Add it to Dictionary with the correct spelling |
