# PulseJam AI — Real-Time On-Device Audio Companion

> An intelligent, zero-latency audio studio companion that listens to your live instrument and streams reactive neural accompaniment in real time.

![PulseJam AI Studio Console](public/images/vision_console.jpg)

---

## 📖 Description

**PulseJam AI** is a real-time, 100% on-device AI studio companion designed for musicians, guitarists, synthesists, and vocalists. By analyzing incoming microphone or audio interface signals directly in the browser through low-latency WebAudio DSP worklets, PulseJam AI detects fundamental pitch, attack dynamics, tempo, and key tonality in real time.

It supports a **Dual Generative AI Architecture**:
1. **In-Browser Neural Accompaniment Engine (`LocalGenerativeCompanion`)**: Generates polyphonic accompaniment (pads, bass, leads, and quantized drum grooves) 100% client-side with zero external dependencies.
2. **Native Apple Silicon MLX GPU Sidecar**: Connects over zero-copy binary WebSockets (`0x504A`) to stream continuous, studio-grade neural audio with sub-20ms latency.

---

## 📑 Table of Contents

- [Description](#-description)
- [System Architecture](#-system-architecture)
- [Audio Processing & Mixing Graph](#-audio-processing--mixing-graph)
- [Key Features](#-key-features)
- [Installation](#-installation)
- [Usage](#-usage)
  - [1. Running in Web Development Mode](#1-running-in-web-development-mode)
  - [2. Using the Studio Console](#2-using-the-studio-console)
  - [3. Building the macOS Desktop App](#3-building-the-macos-desktop-app)
- [Project Structure](#-project-structure)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🏗️ System Architecture

PulseJam AI coordinates client-side WebAudio DSP, local harmonic intelligence, dynamic stem crossfading, and real-time generative neural engines:

```mermaid
flowchart TD
    subgraph Acoustic_Input["🎤 Live Input & DSP Analysis"]
        Mic[Live Instrument / Mic] --> Worklet[pulsejam-dsp-processor Worklet\n48kHz YIN Pitch, RMS dB, Onsets]
        Worklet --> Intelligence[Harmonic & Rhythmic Intelligence\nTempoTracker & Chroma Extractor]
    end

    subgraph Conditioning["⚡ Conditioning & Dispatch"]
        Intelligence --> Bridge[ConditioningBridge\n40ms Conditioning Frames]
    end

    subgraph Dual_AI["🧠 Dual AI Music Generation Engine"]
        Bridge -->|Auto Fallback| LocalGen[LocalGenerativeCompanion\nIn-Browser Polyphonic Synthesis]
        Bridge <-->|Binary ws://localhost:9090| Sidecar[Native MLX Sidecar\nApple Silicon GPU]
        LocalGen --> BinaryFrames[0x504A Binary PCM Frames]
        Sidecar --> BinaryFrames
    end

    subgraph Audio_Pipeline["🎛️ Audio Mixer & Mastering Graph"]
        BinaryFrames --> Receiver[AIAudioReceiver\nJitter Buffer + Concealment Worklet]
        Receiver --> AIGain[AI Audio Gain]
        Worklet --> LiveMon[Mic Monitoring Gain + Limiter]
        Stems[StemEngine\nDynamic Equal-Power Crossfade] --> StemGain[Stem Bus]
        
        AIGain --> Mastering[3-Band Neural Mastering Chain\nTube Warmth, Stereo Widener, Reverb]
        StemGain --> Mastering
        Mastering --> MasterGain[Master Gain Bus]
        LiveMon --> MasterGain
        MasterGain --> Output[🔊 Studio Audio Output]
        MasterGain --> OPFS[💾 OPFS Multi-Take Recorder\n& 48kHz WAV Stem Exporter]
    end
```

### Core Technical Pillars:

1. **Dual Generative AI Accompaniment**:
   - **Local-First**: `LocalGenerativeCompanion` ensures instant real-time jam capability directly in any browser without needing external daemons or Python setup.
   - **High-Performance Sidecar**: Seamless failover to `ws://localhost:9090` when running the native MLX GPU sidecar for deep neural generation.
2. **Binary Zero-Copy Audio Streaming**: Packed 16-byte header (`[Magic 0x504A 'PJ' | MsgType | Seq | Timestamp]`) + raw interleaved `Float32Array` PCM audio bytes ($1920 \times 2 = 3840$ floats $= 15,360$ bytes), eliminating JSON serialization overhead.
3. **Dynamic BPM Synchronization**: Real-time Inter-Onset Interval (IOI) autocorrelation calculating live tempo (40–240 BPM), dynamically locking `StemEngine` crossfades and generative accompaniment to the musician's pulse.
4. **12-Bin Chroma Profiler & Key Estimator**: Computes Pitch Class Profiles and applies the Krumhansl-Schmuckler Key-Finding algorithm in real time.
5. **Integrated Mastering Chain**: 3-band mastering EQ, tube saturation warmth, stereo field widener, convolution reverb, and a -0.1 dBFS ceiling limiter.
6. **Curated Musical Style Presets**: Signature genre catalogue (*Neo-Soul Warmth*, *Lo-Fi Midnight*, *Indie Rock Drive*, *Synthwave 80s*, *Cinematic Ambient*, *Funk Pocket*).
7. **Hardware Ergonomics & Web MIDI**: Native Web MIDI pedalboard / footswitch support (CC#64 Sustain Pedal toggle, CC#81/82 tier shifting).
8. **OPFS Multi-Take Recording & Stem Export**: Crash-resilient chunked jam recorder with broadcast-grade 16-bit 48kHz stereo WAV export.

---

## 🎛️ Key Features

- **⚡ Zero-Latency On-Device Jamming**: In-browser neural companion and native MLX GPU streaming.
- **🚀 Binary Zero-Copy Protocol**: 15KB binary WebSocket chunks with sub-1ms serialization overhead.
- **🎸 Hands-Free Acoustic Count-In**: 4-beat rhythmic tap/strum auto-locks BPM and arms recording.
- **🎼 Live Key & Tonality Detection**: Real-time Krumhansl-Schmuckler harmonic analysis with interactive Circle of Fifths.
- **🎹 Web MIDI Footswitch Integration**: Hands-free pedalboard control for guitarists and keyboardists.
- **💾 OPFS Multi-Take Management**: Infinite-length jam recording without browser memory exhaustion.
- **📦 48kHz WAV Stem Exporter**: One-click DAW drag-and-drop stem exports for Ableton, Logic, Pro Tools, and Reaper.
- **🎯 Dynamic Confidence Gating**: Automatically falls back between `midi+audio` and `audio-only` conditioning.
- **🖥️ Standalone Desktop App**: Native desktop companion built with Tauri v2.

---

## 📦 Installation

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **Browser**: Chrome, Safari, or Edge (supporting Web Audio Worklets)
- **Optional for Native Desktop**: Rust & Cargo (for Tauri v2 desktop build)
- **Optional for MLX GPU Sidecar**: Python 3.11 with Apple Silicon (`mlx`)

### Step-by-Step Setup

```bash
# 1. Clone the repository
git clone https://github.com/aaronnguyen26/pulsejam.git
cd pulsejam

# 2. Install Node.js dependencies
npm install

# 3. Verify test suite passes (46 unit & integration tests)
npm test
```

---

## 🚀 Usage

### 1. Running in Web Development Mode

To run PulseJam AI in your local browser:

```bash
# Start Next.js development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

*(Optional)* To run the dedicated local WebSocket sidecar daemon:
```bash
npm run sidecar
```

### 2. Using the Studio Console

1. Navigate to `/studio` or click **Launch Live Jam Studio** from the landing page.
2. Click **Start Calibration** to run the 3-step acoustic noise-floor check.
3. Select your musical style preset (**Neo-Soul**, **Lo-Fi**, **Indie Rock**, **Synthwave**, etc.).
4. Use **4-Beat Acoustic Count-In** or press your MIDI sustain pedal to start jamming.
5. Play your instrument—the AI companion continuously generates responsive accompaniment matching your tempo, energy, and key center.
6. Click **EXPORT .WAV** to download broadcast-grade 48kHz WAV stems for your DAW.

### 3. Building the macOS Desktop App

To bundle PulseJam AI as a native standalone macOS application (`.dmg` / `.app`):

```bash
# Build the production frontend and Tauri desktop binary
npm run tauri:build
```

The resulting installer will be located in `src-tauri/target/release/bundle/dmg/`.

---

## 📁 Project Structure

```
pulsejam/
├── src/
│   ├── app/                    # Next.js App Router (Landing & Studio routes)
│   ├── components/             # Active studio screens, modals, and telemetry UI
│   │   ├── screens/            # MultiLaneMIDIStudioScreen, StudioHubRefinedScreen, etc.
│   │   └── RefinedCalibrationModal.tsx
│   └── lib/audio/              # AudioEngine, ConditioningBridge, AIAudioReceiver,
│                               # LocalGenerativeCompanion, StemEngine, MasteringChain,
│                               # TempoTracker, ChromaFeatureExtractor, WebMIDIManager,
│                               # OPFSRecorder, StemExporter, StylePresets
├── scripts/
│   └── sidecar/                # Standalone WebSocket sidecars (server.mjs, server.py)
├── src-tauri/                  # Tauri v2 desktop host & native permissions
└── public/
    └── worklets/               # Low-latency AudioWorklet DSP processors
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/amazing-feature`)
3. **Ensure All Tests Pass**:
   ```bash
   npm test
   npm run build
   ```
4. **Commit Your Changes** (`git commit -m 'feat: add amazing feature'`)
5. **Push to the Branch** (`git push origin feature/amazing-feature`)
6. **Open a Pull Request**

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
