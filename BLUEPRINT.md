# PulseJam AI (Pulsemate) — Complete Application Blueprint & Implementation Specification

> **Document Version:** 1.0.0  
> **Target Environment:** Next.js 15 (App Router), WebAudio API, Web Workers, TensorFlow.js WASM, Google Lyria RealTime WebSocket API, Tauri macOS Desktop  
> **Design Language:** Refined Brand Experience (Warm Brass, Obsidian, Glassmorphism)

---

## Executive Summary

**PulseJam AI** (also referenced as **Pulsemate**) is a zero-backend, 100% client-side desktop and web companion designed for musicians, guitarists, synthesists, and vocalists. It Listens to live acoustic or line instrument input via microphone and dynamically generates real-time accompaniment that adapts instantaneously to playing volume, attack density, and detected pitch.

The system is engineered as a zero-latency single codebase that targets both high-performance web browsers (via Next.js static export) and native macOS desktop hardware (via Tauri WKWebView).

---

## Architecture Overview & Core Technical Pillars

```
                     ┌────────────────────────────────────────────────────────┐
                     │              Live Instrument / Microphone              │
                     └───────────────────────────┬────────────────────────────┘
                                                 │ AudioStream (48kHz)
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │            WebAudio API AudioContext Master            │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │ AudioWorkletProcessor (public/worklets/dsp-processor)  │
                     │  - RMS dB Volume Calculation & Peak Detection          │
                     │  - YIN Monophonic Pitch Detection (Hz -> MIDI)         │
                     │  - Attack Density & Hysteresis Dwell Engine            │
                     └──────────┬────────────────────┬────────────────────┬───┘
                                │ Telemetry          │ MIDI Notes         │ Metrics
                                ▼                    ▼                    ▼
┌─────────────────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────────────┐
│     Stage 1: Stems Engine       │   │ Stage 2: Local AI Worker  │   │   Stage 3: Cloud Vibe Layer   │
│  - Chill Stem (-∞ to -24dB)     │   │  - Magenta.js (TF.js WASM)│   │  - Google Lyria RealTime API    │
│  - Groove Stem (-24 to -12dB)   │   │  - DrumsRNN & MelodyRNN   │   │  - 9-Min Session Auto-Rotate    │
│  - Peak Stem (-12 to 0dB)       │   │  - Local MIDI Synth Engine│   │  - Telemetry-to-Prompt Mapping  │
└────────────────┬────────────────┘   └─────────────┬─────────────┘   └────────────────┬────────────────┘
                 │ Audio                            │ Audio                            │ Audio
                 └────────────────────────┬─────────┴──────────────────────────────────┘
                                          ▼
                     ┌────────────────────────────────────────────────────────┐
                     │                 Master Studio Output                   │
                     └───────────────────────────┬────────────────────────────┘
                                                 │
                                                 ▼
                     ┌────────────────────────────────────────────────────────┐
                     │             Stage 4: Tauri Native macOS App            │
                     │     Unsigned .dmg / Hardware Microphone / CSP          │
                     └────────────────────────────────────────────────────────┘
```

---

## Stage-by-Stage Implementation Blueprint

---

### Stage 1: Dynamic Stems Crossfader Mode (`Stems Mode`)

#### 1. Stage Overview & Objectives
Stage 1 establishes the foundational acoustic responsiveness of PulseJam AI. It loads pre-rendered or programmatically synthesized multi-track audio stems representing three distinct energy levels (**Chill**, **Groove**, **Peak**) and crossfades between them dynamically based on the musician's live playing intensity.

#### 2. Built Features & Technical Implementation
- **AudioWorklet DSP Processor (`public/worklets/dsp-processor.js`)**:
  - Off-main-thread audio frame analysis operating at 128 samples per quantum.
  - Extracts Root Mean Square (RMS) decibels ($dB = 20 \log_{10}(RMS)$).
  - Peak Onset Detection measuring sudden acoustic attacks.
  - Attack Density Counter measuring notes/transients per second.
  - **Hysteresis & Dwell Time Engine**: Implements a configurable dwell timer (e.g., 800ms) that prevents abrupt tier switching during silent pauses between phrases or accidental volume spikes.
- **Multi-Tier Stem Crossfader Engine (`src/lib/audio/StemEngine.ts`)**:
  - Manages gain nodes for 3 concurrent audio tracks (`Chill`, `Groove`, `Peak`).
  - Implements equal-power gain curves ($G_{stem1}^2 + G_{stem2}^2 = 1$) during transitions to maintain uniform acoustic loudness without dip or clipping.
  - Supports synthetic fallback providers (`SyntheticStemProvider.ts`) using WebAudio oscillators when audio files are unavailable.
- **Tactile Stems Console UI (`src/components/screens/PerformanceStemsScreen.tsx` & `TierGauge.tsx`)**:
  - Real-time animated VU meter displays live input volume in dB.
  - Tier Gauge component visualizing energy thresholds and active tier highlighting.
  - Stem track mixer with individual gain faders, mute/solo controls, and tier override switches.

#### 3. Reasoning & Architecture Rationale
- **Sub-5ms Latency**: Running DSP in an `AudioWorkletProcessor` keeps main-thread JS execution free from audio frame processing, preventing audio stutter or dropping frames during heavy UI renders.
- **Musical Coherence**: Crossfading between harmonious, locked-tempo stems ensures that no matter how abruptly the user changes volume, the accompaniment always sounds professional, structured, and in-key.
- **Hysteresis Smoothing**: Prevents "tier chatter"—rapid, distracting back-and-forth toggling between Chill and Groove when playing around boundary decibel levels.

#### 4. User Interaction Flow
1. **Calibration**: The user clicks **Calibrate Input** to launch the acoustic wizard, which sets their ambient quiet room baseline (e.g., -45 dB) and max playing peak (e.g., -6 dB).
2. **Performance**:
   - The user starts playing their instrument softly $\rightarrow$ System remains in **Chill Mode** (soft pad textures, light brushes).
   - The user increases strumming/picking dynamics $\rightarrow$ Smooth 400ms crossfade transitions into **Groove Mode** (driving bassline, steady rhythm guitar).
   - The user digs into a high-energy solo or heavy riff $\rightarrow$ Instantaneous elevation to **Peak Mode** (full drums, synth leads, distorted brass).
3. **Manual Overrides**: The user can hit the **Lock Tier** toggle on the screen to pin the performance to a specific tier regardless of playing volume, or tweak gain knobs directly on the rack UI.

---

### Stage 2: Real-Time AI Pitch Detection & Local Generative Accompaniment (`AI Generation Mode`)

#### 1. Stage Overview & Objectives
Stage 2 transitions PulseJam AI from dynamic audio playback to real-time artificial intelligence composition. It detects monophonic pitch from the microphone, converts live notes into discrete MIDI sequences, and feeds them to an on-device neural network that generates 1-bar lookahead drum and bass/melody accompaniment.

#### 2. Built Features & Technical Implementation
- **AudioWorklet YIN Pitch Detector (`public/worklets/dsp-processor.js`)**:
  - Implements the YIN monophonic pitch detection algorithm directly in JavaScript inside the `AudioWorkletGlobalScope`.
  - Calculates Cumulative Mean Normalized Difference Function (CMNDF) to resolve pitch frequency ($Hz$) and MIDI note number ($0-127$).
  - Filters out sub-harmonic errors and noise below the acoustic confidence threshold.
- **Off-Main-Thread TensorFlow.js Web Worker (`public/workers/magenta-worker.js`)**:
  - Loads `@magenta/music` neural network checkpoints hosted locally or via Google Cloud Storage (`drum_kit` for DrumsRNN, `basic_rnn` for MelodyRNN).
  - Configures `@tensorflow/tfjs-backend-wasm` (WebAssembly) backend for hardware-accelerated CPU inference.
  - Receives serialized MIDI note events over `postMessage`, updates NoteSequences, runs `continueSequence()`, and returns generated 16th-note quantized step events back to the audio thread.
- **Web Audio MIDI Synthesizer (`src/lib/audio/MIDISynthEngine.ts`)**:
  - Custom Web Audio synthesizer producing kick, snare, closed/open hi-hats, and analog bass/lead voices using ADSR gain envelopes and filter sweeps.
  - Zero network dependency for sound generation.
- **AI Monitor Console (`src/components/AIGenerationMonitor.tsx` & `PerformanceAIScreen.tsx`)**:
  - Real-time Note & Pitch Display showing current note (e.g., `A4 - 440.0 Hz`).
  - Model selector (DrumsRNN vs MelodyRNN), temperature slider ($0.5$ to $1.5$ creativity scale), BPM tempo control, and live inference latency tracker ($ms$).

#### 3. Reasoning & Architecture Rationale
- **Zero Cloud Latency & Cost**: Running inference entirely inside browser WASM via Web Workers guarantees zero API subscription costs and avoids round-trip network delays (achieving sub-30ms generation latency).
- **Thread Isolation**: Isolating TensorFlow.js memory allocations and tensor computations inside a dedicated Web Worker prevents UI jank or main-thread browser freezing.
- **Lookahead Pattern Buffer**: Generating 1 bar ahead into a quantized buffer ensures uninterrupted playback sync even if CPU load momentarily spikes.

#### 4. User Interaction Flow
1. **Mode Switch**: User clicks **AI Generation Mode** on the main navigation bar.
2. **Note Input**: User plays single notes, basslines, or solos on their instrument.
3. **Visual Feedback**: The UI visualizer displays detected notes in real-time on a digital tuner/stave display.
4. **AI Accompaniment**:
   - DrumsRNN listens to the user's note density and tempo, automatically dropping matching drum grooves.
   - MelodyRNN listens to key and root notes, generating counter-melodies or harmony lines.
5. **Real-time Tweaking**: The user can adjust the **Temperature** slider (lower = tighter adherence to key; higher = wilder jazz solos) or change the **BPM** on the fly.

---

### Stage 3: Cloud "Vibe" Generative Texture Layer (`Google Lyria RealTime, BYOK`)

#### 1. Stage Overview & Objectives
Stage 3 adds an expansive, atmospheric cloud layer to the local audio session. Powered by Google's state-of-the-art **Lyria RealTime model** (`models/lyria-realtime-exp`), this feature continuously streams 48kHz stereo generative ambient textures and pads driven dynamically by live playing telemetry.

#### 2. Built Features & Technical Implementation
- **Bring Your Own Key (BYOK) Security Architecture (`src/components/CloudVibeSettingsModal.tsx`)**:
  - Google AI Studio API keys are saved exclusively in browser `localStorage`.
  - Keys are sent directly over encrypted WebSockets (`wss://generativelanguage.googleapis.com`) to Google's API—never stored on external servers.
- **Telemetry-to-Prompt Mapping Engine (`src/lib/lyria/TelemetryPromptMapper.ts`)**:
  - Translates live acoustic metrics (energy dB, note density, detected pitch root, current performance tier) into natural language prompt instructions for Lyria in real-time.
  - Example output prompt: *"Warm ethereal ambient pads in A minor, slow reverb swell, acoustic energy -18dB, high harmonic density."*
- **Seamless 9-Minute Session Rotation (`src/lib/lyria/LyriaSessionManager.ts` & `LyriaAudioStreamer.ts`)**:
  - **The 10-Minute Cap Problem**: Google's Lyria API enforces a hard 10-minute disconnection limit per WebSocket session.
  - **The Solution**: At **9 minutes (540 seconds)**, `LyriaSessionManager` automatically initiates a background secondary WebSocket connection, negotiates session handshakes, pre-buffers incoming 48kHz PCM audio chunks, performs a 500ms equal-power audio crossfade, and safely terminates the expiring session without dropping audio frames.
- **Cloud Vibe Control & Safeguard Toolbar (`src/components/CloudVibeToolbar.tsx`)**:
  - Live status indicator ("Connected", "Rotating", "Disconnected").
  - Session elapsed timer and dedicated Cloud Vibe volume fader.
  - **Red [STOP CLOUD VIBE] Emergency Button**: Instantly severs WebSocket connections and halts audio streaming to protect against unwanted API usage charges.

#### 3. Reasoning & Architecture Rationale
- **Next-Gen Atmospheric Soundscapes**: While local WASM models handle discrete MIDI drums and bass, Google's Lyria model generates hyper-realistic, continuous, studio-grade ambient textures impossible to recreate on local client hardware.
- **Zero-Dropout Performance**: The 9-minute auto-rotation system allows long jam sessions (1+ hours) without sudden audio cuts.
- **Billing Transparency & User Control**: Providing BYOK and prominent emergency stop controls builds trust and ensures users are always aware of active API calls.

#### 4. User Interaction Flow
1. **API Key Setup**: User opens **BYOK Settings ⚙️**, pastes their Google AI Studio key, and clicks **Save & Enable**.
2. **Engagement**: User toggles **Cloud Vibe: ON**.
3. **Acoustic Synthesis**: As the user plays gently, Lyria streams soft, evolving ambient string pads. When the user plays passionately, the telemetry mapper shifts the prompt to intense synth textures.
4. **Monitoring**: The user monitors live session time in the header. At 09:00, the status briefly flashes "Auto-Rotating Session..." as the crossfade occurs seamlessly in the background.
5. **Termination**: Hitting the red **[STOP CLOUD VIBE]** button instantly stops the cloud stream and silences the channel.

---

### Stage 4: Native Standalone macOS Desktop Application (`Tauri Integration`)

#### 1. Stage Overview & Objectives
Stage 4 packages the entire web application into a lightweight, native macOS desktop executable (`.dmg` installer) using Tauri, providing low-overhead system hardware access, offline execution, and a dedicated desktop window.

#### 2. Built Features & Technical Implementation
- **Tauri Integration Core (`src-tauri/`)**:
  - Configures Rust-based native wrapper bundling the Next.js static web export (`out/` directory).
  - Target binary: `PulseJam_0.1.0_x64.dmg`.
- **Native Hardware Permission Declarations (`src-tauri/tauri.conf.json` & `Info.plist`)**:
  - Declares native macOS microphone usage key: `NSMicrophoneUsageDescription`: *"PulseJam listens to your live instrument playing to dynamically crossfade backing stems and generate AI accompaniment in real time."*
- **Network Content Security Policy (CSP) Allowlist**:
  - Configured in `tauri.conf.json` to allow direct outbound WebSockets to Google API endpoints:
    ```
    connect-src 'self' wss://generativelanguage.googleapis.com https://storage.googleapis.com https://cdn.jsdelivr.net blob: data:;
    ```
- **Unsigned Build Gatekeeper Bypass Guide (`README.md` & `DesktopDownloadBanner.tsx`)**:
  - Complete guidance on opening unsigned apps on macOS (Control-Click / Right-Click $\rightarrow$ Open) to avoid annual $99/yr Apple Developer Certificate requirements for local distribution.

#### 3. Reasoning & Architecture Rationale
- **Ultra-Light Footprint**: Unlike Electron (which bundles full Chromium binaries taking >200MB memory), Tauri leverages macOS native WKWebView, executing with under 40MB RAM usage and minimal CPU overhead.
- **Unified Single Codebase**: 100% of the web code is re-used without duplicating business logic or audio processing scripts.

#### 4. User Interaction Flow
1. **Download & Mount**: User clicks **Download Desktop App (.dmg)** from the web app banner or builds via `npm run tauri:build`.
2. **First Launch Gatekeeper Bypass**:
   - User mounts `PulseJam_0.1.0_x64.dmg` and drags `PulseJam.app` to Applications.
   - User right-clicks `PulseJam.app` $\rightarrow$ selects **Open** $\rightarrow$ confirms **Open** in macOS security prompt.
3. **Hardware Authorization**: On first launch, macOS presents the native microphone permission prompt. User clicks **Allow**.
4. **Desktop Jamming**: App opens in a frameless or custom-styled dark studio window with full hardware audio input.

---

## Design System & Studio UX Architecture

Extracted directly from the brand specification (`DESIGN.md`), PulseJam AI follows a **Refined Brand Experience** inspired by high-end analog studio consoles.

### 1. Aesthetic Palette & Tokens

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `background` | `#131313` | Primary page & workstation dark background |
| `surface-container-lowest` | `#0e0e0e` | Deepest recessed bays & track troughs |
| `surface-container-low` | `#1c1b1b` | Base rack module background |
| `surface-container` | `#201f1f` | Standard rack panel background |
| `surface-container-high` | `#2a2a2a` | Elevated module & card faces |
| `primary` | `#f2ca50` | Primary Warm Brass Gold accent, active playheads, primary buttons |
| `primary-container` | `#d4af37` | Secondary Brass Gold, progress meters |
| `tertiary` | `#e7c9a6` | Warm Champagne text accents & badges |
| `on-surface` | `#e5e2e1` | High-contrast warm off-white body text |
| `on-surface-variant` | `#d0c5af` | Secondary telemetry text & subtitles |
| `outline` | `#99907c` | Subdued borders & panel dividers |
| `error` | `#ffb4ab` | Clipping meters & emergency stop highlight |

### 2. Typography Hierarchy

- **Display Headlines (`display-lg`):** `EB Garamond`, 88px / 96px, 500 weight with italic emphasis.
- **Section Headlines (`headline-md`):** `EB Garamond`, 48px / 56px, 400 weight.
- **UI Body Text (`body-md`):** `Hanken Grotesk`, 16px / 24px, 400 weight.
- **Labels & Badges (`label-caps`):** `Hanken Grotesk`, 12px / 16px, 600 weight (uppercase, letter-spacing `0.1em`).
- **Timecode & Telemetry (`timecode`):** `JetBrains Mono`, 16px / 16px, 700 weight (tabular figures).

### 3. Glassmorphism & Metallic Effects

- **Glassmorphism Panels (`.glass-panel`):**
  ```css
  background: rgba(42, 42, 42, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  ```
- **Brass Text Gradient (`.text-gradient-brass`):**
  ```css
  background: linear-gradient(135deg, #f2ca50 0%, #e7c9a6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  ```

---

## Screen Architecture & Navigation Flow

PulseJam AI is organized into 6 core interactive screens (`src/components/screens/`):

```
                        ┌──────────────────────────────────────────────┐
                        │      RefinedBrandExperienceScreen            │
                        │    (Hero, Vision, Architecture, Download)    │
                        └──────────────────────┬───────────────────────┘
                                               │
                                               ▼
                        ┌──────────────────────────────────────────────┐
                        │              StudioHubScreen                 │
                        │   (Master Bus, Visualizer, Quick Controls)   │
                        └──────┬───────────────┬───────────────┬───────┘
                               │               │               │
      ┌────────────────────────┘               │               └────────────────────────┐
      ▼                                        ▼                                        ▼
┌───────────────────────────┐    ┌───────────────────────────┐    ┌───────────────────────────┐
│ PerformanceStemsScreen    │    │ PerformanceAIScreen       │    │ InputCalibrationScreen    │
│ (Chill/Groove/Peak Stems) │    │ (Magenta WASM + Pitch)    │    │ (Mic Level & Noise Floor) │
└───────────────────────────┘    └───────────────────────────┘    └───────────────────────────┘
                                               │
                                               ▼
                                 ┌───────────────────────────┐
                                 │ LibraryScreen             │
                                 │ (Master Tapes & Presets)  │
                                 └───────────────────────────┘
```

1. **`RefinedBrandExperienceScreen.tsx`**: High-impact brand experience page featuring interactive vision statements, bento grid features, security disclosures, desktop download callout, and smooth scrolling via Lenis.
2. **`StudioHubScreen.tsx`**: Central DAW studio hub combining real-time audio visualizers, master volume controls, Cloud Vibe toolbars, and mode toggles.
3. **`PerformanceStemsScreen.tsx`**: Stage 1 Stems rack featuring multi-track gain controls, tier gauges, and dynamic crossfading monitors.
4. **`PerformanceAIScreen.tsx`**: Stage 2 AI console featuring live pitch detection display, Magenta WASM status, temperature sliders, and MIDI synth routing.
5. **`InputCalibrationScreen.tsx`**: Interactive microphone wizard for establishing noise floors, acoustic room baselines, and peak volume thresholds.
6. **`LibraryScreen.tsx`**: Virtual master tape browser for managing stem files, user presets, and recorded sessions.

---

## Complete File Directory Structure

```
pulsejam/
├── DESIGN.md                          # Studio brand & visual design tokens
├── README.md                          # Documentation & build instructions
├── BLUEPRINT.md                       # Comprehensive app blueprint (this document)
├── package.json                       # Project dependencies & scripts
├── next.config.ts                     # Next.js configuration (static export enabled)
├── tauri.conf.json                    # Tauri desktop app configuration
├── public/
│   ├── workers/
│   │   └── magenta-worker.js          # Off-main-thread Magenta.js TF.js WASM worker
│   └── worklets/
│       └── dsp-processor.js           # AudioWorklet processor (RMS dB, YIN pitch, hysteresis)
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout with SmoothScroll wrapper
│   │   ├── page.tsx                   # Main entry point (RefinedBrandExperienceScreen)
│   │   └── globals.css                # Studio CSS theme & utility tokens
│   ├── components/
│   │   ├── AIGenerationMonitor.tsx     # Stage 2 AI status dashboard
│   │   ├── CalibrationWizard.tsx      # Acoustic calibration modal
│   │   ├── CloudVibeSettingsModal.tsx # Stage 3 BYOK settings modal
│   │   ├── CloudVibeToolbar.tsx       # Stage 3 toolbar & emergency stop
│   │   ├── ControlPanel.tsx           # Audio control sliders & toggles
│   │   ├── DesktopDownloadBanner.tsx  # Tauri desktop download banner
│   │   ├── LatencyMonitor.tsx         # Real-time latency graph
│   │   ├── ModeToggle.tsx             # Stems vs AI mode toggle switcher
│   │   ├── StatusBanner.tsx           # Audio engine status bar
│   │   ├── TierGauge.tsx              # Stage 1 tier gauge visualizer
│   │   ├── Visualizer.tsx             # Frequency spectrum visualizer canvas
│   │   └── screens/
│   │       ├── InputCalibrationScreen.tsx
│   │       ├── LibraryScreen.tsx
│   │       ├── PerformanceAIScreen.tsx
│   │       ├── PerformanceStemsScreen.tsx
│   │       ├── RefinedBrandExperienceScreen.tsx
│   │       └── StudioHubScreen.tsx
│   └── lib/
│       ├── audio/
│       │   ├── AIGenerationEngine.ts   # Stage 2 worker orchestrator
│       │   ├── AudioEngine.ts          # Master audio context manager
│       │   ├── MIDISynthEngine.ts      # WebAudio MIDI synthesizer
│       │   ├── StemEngine.ts          # Stage 1 stem crossfader
│       │   ├── StemProviders.ts       # Synthetic & file stem loaders
│       │   ├── constants.ts            # Default threshold constants
│       │   └── types.ts                # TypeScript interfaces
│       └── lyria/
│           ├── LyriaAudioStreamer.ts  # PCM audio buffer & playback stream
│           ├── LyriaSessionManager.ts # 9-min session rotation manager
│           └── TelemetryPromptMapper.ts # Telemetry to AI prompt converter
└── src-tauri/                         # Tauri native macOS app wrapper
    ├── Cargo.toml
    ├── Info.plist                     # macOS NSMicrophoneUsageDescription
    └── tauri.conf.json                # App bundle & CSP settings
```

---

## Summary of Build Target Commands

| Target | Command | Result Artifact |
| :--- | :--- | :--- |
| **Web Dev Server** | `npm run dev` | Local interactive server (`http://localhost:3000`) |
| **Web Static Export** | `npm run build` | Portable static web bundle in `out/` directory |
| **Desktop Dev Server** | `npm run tauri:dev` | Interactive native macOS desktop window |
| **Desktop Production Build** | `npm run tauri:build` | Unsigned macOS installer in `src-tauri/target/release/bundle/dmg/PulseJam_0.1.0_x64.dmg` |

---

*End of Application Blueprint.*
