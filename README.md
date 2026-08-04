# PulseJam AI — Complete Stage 1, Stage 2, Stage 3 & Stage 4 Desktop Companion

PulseJam AI is a 100% client-side, zero-backend Next.js application that listens to live instrument input via microphone and dynamically accompanies the player in real-time.

It features four integrated layers & targets:
1. **Stems Mode (Stage 1)**: Dynamically crossfades between 3 tiers of backing-track stems (**Chill / Groove / Peak**) based on playing volume and attack density.
2. **AI Generation Mode (Stage 2)**: Runs real-time YIN monophonic pitch detection in AudioWorklet, feeds discrete MIDI note sequences to a dedicated Web Worker running **Magenta.js** (`@magenta/music` with TensorFlow.js WASM backend), and generates 1-bar lookahead drum + bass/melody accompaniment.
3. **Cloud "Vibe" Layer (Stage 3)**: An optional, slow-morphing generative ambient/textural overlay powered by Google's **Lyria RealTime model** (`models/lyria-realtime-exp`), driven by live playing telemetry. 100% **Bring Your Own Key (BYOK)**.
4. **Standalone macOS Desktop App (Stage 4)**: Tauri-wrapped native macOS application (`.dmg` installer) generated from the same single codebase.

---

## 🚀 Key Features & Architecture

- **Zero-Backend & Static Export**: 100% client-side WebAudio DSP, local WASM AI inference, and browser-direct WebSockets. Deployable to Vercel free tier or as a native desktop app.
- **AudioWorklet DSP & Pitch Detection**: RMS dB extraction, peak onset detection, YIN monophonic pitch detection, EMA smoothing, and hysteresis dwell logic run entirely in `AudioWorkletProcessor` (`public/worklets/dsp-processor.js`).
- **Local AI Web Worker**: Web Worker (`public/workers/magenta-worker.js`) running TensorFlow.js with WASM backend (`@tensorflow/tfjs-backend-wasm`) offloading DrumsRNN and MelodyRNN inference off main and audio threads.
- **Cloud Vibe Layer (Google Lyria RealTime, BYOK)**:
  - **BYOK Architecture**: Google AI Studio API key stored exclusively in browser `localStorage`.
  - **9-Minute Seamless Session Rotation**: Automatically connects a secondary WebSocket at 9 minutes (540s), pre-buffers 48kHz stereo PCM audio, smoothly crossfades over 500ms, and closes the old session to stay under Google's 10-minute cap without dropouts.
  - **Emergency Stop & Billing Safeguards**: Visible **"Cloud Vibe: Connected"** status pill, live session timer, dedicated volume slider, and an unmistakable red **[STOP CLOUD VIBE]** emergency button.
- **Tauri macOS Desktop App (Stage 4)**:
  - Native WKWebView wrapper configured with `NSMicrophoneUsageDescription` permission and WebSocket CSP allowlist (`wss://generativelanguage.googleapis.com`).
  - Intentionally unsigned `.dmg` build target.

---

## 🛠️ Build Targets (Single Codebase)

### 1. Web App Build Target (Vercel)
```bash
# Install dependencies
npm install

# Run local web dev server
npm run dev

# Static export build (generates out/ directory)
npm run build
```

### 2. Standalone macOS Desktop App Build Target (Tauri)
```bash
# Run Tauri in dev mode (interactive desktop app window)
npm run tauri:dev

# Build production unsigned macOS .dmg installer
npm run tauri:build
```
The output `.dmg` installer will be generated in `src-tauri/target/release/bundle/dmg/PulseJam_0.1.0_x64.dmg`.

---

##  Stage 4 Desktop App & Gatekeeper Guidance

### 1. Native macOS Microphone Permission Manifest
Microphone usage is declared in `src-tauri/tauri.conf.json`:
```json
{
  "bundle": {
    "macOS": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "PulseJam listens to your live instrument playing to dynamically crossfade backing stems and generate AI accompaniment in real time."
      }
    }
  }
}
```

### 2. Network CSP Allowlist for Stage 3 Cloud Layer
Tauri Content Security Policy allows direct WebSocket streaming:
```
connect-src 'self' wss://generativelanguage.googleapis.com https://storage.googleapis.com https://cdn.jsdelivr.net blob: data:;
```

### 3. Unsigned Build Gatekeeper Bypass Instructions
> [!IMPORTANT]
> **First-Time macOS Launch (Unsigned Build)**:
> Because this standalone desktop app is intentionally built unsigned (avoiding annual developer subscription fees), macOS Gatekeeper will block double-clicking on first launch ("PulseJam can't be opened because it is from an unidentified developer").
>
> **How to bypass Gatekeeper on first launch**:
> 1. Drag **PulseJam.app** from the `.dmg` into your **Applications** folder.
> 2. In Applications, **Right-Click** (or Control-Click) **PulseJam.app** and select **Open**.
> 3. Click **Open** in the confirmation dialog. *(This one-time step authorizes the app for all future double-click launches).*

### 4. Code Signing & Notarization Roadmap (Optional)
If you decide to sign and notarize the desktop app in the future:
1. Join the Apple Developer Program ($99/yr).
2. Export your Developer ID Application certificate.
3. Configure `APPLE_SIGNING_IDENTITY` and `APPLE_NOTARIZATION_USERNAME` / `APPLE_NOTARIZATION_PASSWORD` in Tauri's environment configuration.

---

## 🎯 Stage 3 BYOK Setup & Security Notices

### 1. BYOK Setup Instructions
1. Click **BYOK Settings ⚙️** on the Cloud Vibe toolbar.
2. Enter your personal **Google AI Studio API Key** (`AIzaSy...`).
3. Click **Save & Enable**.
4. Toggle **Cloud Vibe: ON**. Live ambient textures generated by Google's Lyria RealTime model will blend into your session.

### 2. Public Deployment Security Warning
> [!CAUTION]
> **API Key Storage & DevTools Visibility**:
> The API key is stored strictly in your browser's `localStorage` and sent directly via WebSocket to Google's API (`generativelanguage.googleapis.com`).
> **If you deploy PulseJam AI to a publicly accessible URL, NEVER share or hardcode a single API key across visitors.** Every visitor must supply their OWN key in their browser Settings panel, as keys stored in browser storage are readable in client DevTools.

### 3. Personal Billing Notice
> [!WARNING]
> **Personal Account Billing**:
> Usage of the Cloud Vibe layer makes real API calls billed to your personal Google AI Studio account per Google's current pricing. Use the prominent red **[STOP CLOUD VIBE]** button whenever you finish playing to disconnect immediately.

### 4. Session Rotation Behavior
> [!NOTE]
> **10-Minute Limit & 9-Minute Rotation**:
> Google's Lyria RealTime model enforces a hard 10-minute cap per WebSocket session. PulseJam AI automatically initiates a secondary WebSocket connection at **9 minutes (540 seconds)**, pre-buffers incoming PCM audio, crossfades over 500ms, and gracefully terminates the previous session so your performance never suffers an audible gap.

### 5. Experimental Model Notice (`-exp`)
> [!IMPORTANT]
> **Experimental Model (`models/lyria-realtime-exp`)**:
> The Cloud Vibe layer integrates Google's experimental Lyria RealTime model (`models/lyria-realtime-exp`). Endpoint availability, parameters, and behavior may be modified by Google over time. If connection errors or quota limits occur, PulseJam AI halts retries after 3 attempts and surfaces plain error text.

---

## 📜 Model Checkpoints & Licensing Notice

Stage 2 uses pretrained Google Magenta model checkpoints (`drum_kit` and `basic_rnn`) hosted on Google Cloud Storage. Review official Magenta license terms at [Google Magenta Repository](https://github.com/magenta/magenta-js).
