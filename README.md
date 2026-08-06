# PulseJam AI — Unified Multi-Lane AI Studio Console & Desktop Companion

PulseJam AI is a 100% client-side, zero-backend Next.js application that listens to live instrument input via microphone or audio interface and dynamically accompanies the player in real-time.

It unifies real-time WebAudio DSP, local WASM AI inference, and standalone native desktop packaging into a seamless studio workspace.

---

## 🌟 Architecture & Core Features

### 1. Unified Multi-Lane AI MIDI Studio Console (Stage 1 & Stage 2)
The core application interface (`/studio`) features a console with per-instrument track lanes for **Live Input** (`AUDIO TRACK 01`), **Lead Synth** (`MIDI TRACK 01`), **Bassline** (`MIDI TRACK 02`), and **Drums Companion** (`MIDI TRACK 03`):

- **Independent Per-Lane REC**:
  - **Live Input REC**: Clicking REC on the Live Input lane captures microphone audio in isolation with **zero side-effect sound or MIDI generation** from any other lane.
  - **MIDI Lane REC**: Clicking REC on an individual MIDI lane (e.g. Lead Synth) generates AI MIDI notes for that specific track alone without microphone capture.
  - **Global Transport REC**: Main bottom transport bar records all currently armed tracks together in sync.
- **Full MUTE & SOLO Controls**:
  - **MUTE**: Instantly silences audio output for that track in both live generation and playback.
  - **SOLO**: Isolates soloed tracks, silencing all non-soloed tracks.
- **60fps Reactive Live Input Waveform**: Real-time `requestAnimationFrame` loop streaming peak amplitude golden bars (`#f2ca50`) across the Live Input timeline as the user performs.
- **Synchronized Session Playback**: Global **PLAY** synchronizes stored in-memory live audio takes with generated MIDI bar sequences using WebAudio `AudioContext.currentTime`.
- **Clean Initial State**: Launches 100% clean with zero pre-existing mock blocks, ready for live recording.

### 2. Local AI Web Worker Generation (Stage 2)
- Runs **Magenta.js** (`@magenta/music` with TensorFlow.js WASM backend) inside a dedicated Web Worker (`public/workers/magenta-worker.js`).
- Offloads **DrumsRNN** and **MelodyRNN** inference off main UI and audio threads.
- Listens to YIN monophonic pitch detection from `AudioWorkletProcessor` (`public/worklets/dsp-processor.js`) and generates 1-bar lookahead drum + bass/melody accompaniment.

### 3. Cloud "Vibe" Layer (Stage 3 — BYOK)
- Generative ambient/textural overlay powered by Google's **Lyria RealTime model** (`models/lyria-realtime-exp`), driven by live playing telemetry.
- 100% **Bring Your Own Key (BYOK)**: API key stored strictly in browser `localStorage`.
- **9-Minute Session Rotation**: Automatically connects a secondary WebSocket at 9 minutes (540s), pre-buffers audio, smoothly crossfades over 500ms, and closes the old session to avoid Google's 10-minute cap.

### 4. Standalone macOS Desktop App (Stage 4)
- Tauri-wrapped native macOS application (`.dmg` installer) generated from the same single codebase.
- Configured to launch directly into the **Studio Console App UI** (`/studio`).

---

## 📱 App Navigation Structure

The application navigation (`/studio`) features a streamlined 3-screen switcher:

1. **WELCOME** (`ImmersiveWelcomeHomeScreen`): Interactive studio initialization & onboarding.
2. **STUDIO HUB** (`StudioHubRefinedScreen`): Session overview, acoustic input status, and track setup.
3. **MIDI STUDIO** (`MultiLaneMIDIStudioScreen`): Full multi-lane AI studio console.

---

## 🛠️ Build Targets (Single Codebase)

### 1. Web App Build Target (Vercel)
```bash
# Install dependencies
npm install

# Run local web dev server (http://localhost:3000 = Website, http://localhost:3000/studio = App UI)
npm run dev

# Static export build (generates out/ directory)
npm run build
```

### 2. Standalone macOS Desktop App Build Target (Tauri)
```bash
# Run Tauri in dev mode (opens desktop app directly to studio console)
npm run tauri:dev

# Build production unsigned macOS .dmg installer
npm run tauri:build
```
The output `.dmg` installer is generated at `src-tauri/target/release/bundle/dmg/PulseJam_0.1.0_aarch64.dmg` and hosted at `/downloads/PulseJam_0.1.0_aarch64.dmg` for free download on the marketing website (`/`).

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
Tauri Content Security Policy allows direct WebSocket streaming to Google AI APIs:
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
> 4. If macOS security flags persist, run: `xattr -cr /Applications/PulseJam.app` in Terminal.

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
> **If you deploy PulseJam AI to a publicly accessible URL, NEVER share or hardcode a single API key across visitors.** Every visitor must supply their OWN key in their browser Settings panel.

### 3. Personal Billing Notice
> [!WARNING]
> **Personal Account Billing**:
> Usage of the Cloud Vibe layer makes real API calls billed to your personal Google AI Studio account per Google's pricing. Use the red **[STOP CLOUD VIBE]** button whenever you finish playing to disconnect immediately.

---

## 📜 Model Checkpoints & Licensing Notice

Stage 2 uses pretrained Google Magenta model checkpoints (`drum_kit` and `basic_rnn`) hosted on Google Cloud Storage. Review official Magenta license terms at [Google Magenta Repository](https://github.com/magenta/magenta-js).
