# PulseJam AI — Refined Brand & Studio Design System

Extracted directly from the Stitch MCP screen resource: **`PulseJam: Refined Brand Experience`** (`projects/13103449190037058115/screens/f377a580635343ff8e3bf4ab2d692dd3`).

---

## 1. Brand Identity & Aesthetic Direction

The **PulseJam Refined Brand Experience** blends the timeless sophistication of high-end analog audio consoles (brass knobs, warm tungsten backlighting, brushed metal panels) with modern dark-mode digital workstation architecture.

- **Vibe:** Night-owl studio focus, tactile luxury, zero-latency acoustic companion.
- **Surface Elevation:** Translucent obsidian & charcoal layers (`#0e0e0e` to `#353534`) elevated with frosted glass backdrop blurs (`backdrop-blur(24px)`).
- **Accents:** Warm Brass (`#f2ca50`), Gold Amber (`#d4af37`), and Muted Champagne (`#e7c9a6`).

---

## 2. Color Palette & Tokens

| Token Name | Hex Code | Purpose / Usage |
| :--- | :--- | :--- |
| `background` / `surface-dim` | `#131313` | Primary page & canvas background |
| `surface-container-lowest` | `#0e0e0e` | Deepest recessed bays & track troughs |
| `surface-container-low` | `#1c1b1b` | Base module background |
| `surface-container` | `#201f1f` | Standard rack panel background |
| `surface-container-high` | `#2a2a2a` | Elevated card & module faces |
| `surface-container-highest` | `#353534` | Hover states & interactive active panels |
| `primary` | `#f2ca50` | Primary Warm Brass Gold accent, active playheads, CTA buttons |
| `primary-container` | `#d4af37` | Secondary Brass Gold, progress fills |
| `primary-fixed` | `#ffe088` | High-light gold highlights |
| `tertiary` | `#e7c9a6` | Warm Champagne text accents & badges |
| `tertiary-fixed-dim` | `#dfc29f` | Muted metallic borders & timeline guides |
| `on-surface` | `#e5e2e1` | High-contrast warm off-white body text |
| `on-surface-variant` | `#d0c5af` | Secondary subtitle & telemetry label text |
| `outline` | `#99907c` | Subdued borders & dividers |
| `outline-variant` | `#4d4635` | Warm dark hairline borders |
| `error` | `#ffb4ab` | Clipping meters & warning indicators |

---

## 3. Typography System

| Style Token | Font Family | Size / Line-Height | Weight / Details |
| :--- | :--- | :--- | :--- |
| `display-lg` | `EB Garamond` | `88px` / `96px` | `500` (-0.02em tracking, italic emphasis) |
| `display-lg-mobile`| `EB Garamond` | `48px` / `52px` | `500` (-0.01em tracking) |
| `headline-md` | `EB Garamond` | `48px` / `56px` | `400` |
| `headline-sm` | `EB Garamond` | `32px` / `40px` | `400` |
| `body-lg` | `Hanken Grotesk` | `20px` / `32px` | `300` |
| `body-md` | `Hanken Grotesk` | `16px` / `24px` | `400` |
| `label-caps` | `Hanken Grotesk` | `12px` / `16px` | `600` (uppercase, `0.1em` letter-spacing) |
| `timecode` | `JetBrains Mono` | `16px` / `16px` | `700` (tabular figures) |

---

## 4. Layout, Spacing & Container Tokens

- **Max Container Width:** `1280px` (`max-w-container-max`)
- **Desktop Margin:** `80px` (`px-margin-desktop`)
- **Mobile Margin:** `24px` (`px-margin-mobile`)
- **Gutter:** `32px` (`gap-gutter`)
- **Section Gap:** `200px` (`py-section-gap`)
- **Border Radius System:**
  - `DEFAULT`: `0.125rem` (`2px`)
  - `lg`: `0.25rem` (`4px`)
  - `xl`: `0.5rem` (`8px`)
  - `full`: `9999px` (Pill buttons & badges)

---

## 5. Component Utility Classes & Visual Style

### Glassmorphism Panel (`.glass-panel`)
```css
background: rgba(42, 42, 42, 0.4);
backdrop-filter: blur(24px);
-webkit-backdrop-filter: blur(24px);
```

### Brass Metallic Gradient (`.bg-gradient-brass`)
```css
background: linear-gradient(135deg, #f2ca50 0%, #d4af37 100%);
```

### Brass Text Gradient (`.text-gradient-brass`)
```css
background: linear-gradient(135deg, #f2ca50 0%, #e7c9a6 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### Hairline Border (`.border-hairline`)
```css
border: 1px solid rgba(223, 194, 159, 0.15);
```

### Top Bezel Highlight (`.highlight-top`)
```css
box-shadow: inset 0 1px 0 rgba(231, 201, 166, 0.2);
```

---

## 6. Screen Architecture

The application is structured into modular screens, each representing a core feature of the PulseJam suite:

1. **`PulseJamRefinedBrandExperience`**: High-impact brand experience featuring vision statement, interactive process journey, bento grid scenarios, local privacy guarantee, and CTA downloads.
2. **`PulseJamImmersiveWelcomeScreen`**: Cinematic studio entry landing page (`PulseJam: Immersive Welcome Screen`, screen `6809cf2d15cd4b5999af856482b572f8`) featuring obsidian backdrop (`#0a0a0a`), atmospheric radial gold lighting, "PulseJam AI" title, "READY FOR RECORDING" status badge, and quick action launch buttons.
3. **`PulseJamStudioHubRefined`**: Full DAW studio dashboard (`PulseJam: Studio Hub`, screen `3125699e36de4608953b37bc84658c39`) with side navigation bar (Studio, Sessions, Perform, Engine Status), "Welcome back, Maestro" hero banner, Bento Quick Action cards, master bus controls, and telemetry readouts.
7. **`PulseJamRefinedCalibration`**: Acoustic calibration & phrase pitch verification hard gate modal (`PulseJam: Refined Calibration`) comprising 5 distinct UI screen states: Step 1 (Quiet), Step 2 (Loud), Step 3 (Phrase Pitch Verification), Feedback (Hard Gate Block & Retry Prompt), and Calibration Success.
8. **`PulseJamPerformanceStems`**: Live performance rack featuring Chill, Groove, and Peak dynamic crossfading stem controls.
9. **`PulseJamPerformanceAI`**: Magenta.js Web Worker AI accompaniment & real-time pitch detection console.
10. **`PulseJamLibrary`**: Master tapes project & stem track browser.

---

## 7. Acoustic Calibration & Pitch Gate Screens

The calibration modal acts as a mandatory hardware & acoustic gate before live studio sessions begin:

### Screen 1: Step 1 — Quiet Level Calibration (`Step 01/03`)
- **Header:** "1. Play something quiet"
- **Instruction:** "Establishing noise floor. Please strum or sing softly for 5 seconds."
- **Visuals:** Obsidian backdrop (`#1e2020`), warm brass level meter fill (`#d4af37` to `#f2ca50`), and circular SVG progress ring countdown (`05s` to `01s`).
- **Telemetry Captured:** Ambient noise floor RMS in dB (`quietDb`).

### Screen 2: Step 2 — Loud Level Calibration (`Step 02/03`)
- **Header:** "2. Play something loud"
- **Instruction:** "Establishing peak volume limits. Play at full energy for 5 seconds."
- **Visuals:** Gold-amber high-contrast VU meter fill (`#f2ca50` to `#ffe088`), animated level meter response.
- **Telemetry Captured:** Peak acoustic dynamic RMS in dB (`loudDb`).

### Screen 3: Step 3 — Phrase Pitch Verification (`Step 03/03`)
- **Header:** "3. Play a short phrase"
- **Instruction:** "Play a few distinct notes over 5 seconds to confirm pitch detection is working."
- **Visual Telemetry Card:** Live pitch display (e.g. `MIDI 60`) and real-time YIN pitch clarity percentage (`Clarity Score: 85%`).
- **Evaluation Criteria:** Requires $\ge 2$ distinct detected monophonic MIDI notes, YIN clarity $\ge 0.55$, and $\ge 60\%$ composite confidence score.

### Screen 4: Calibration Feedback & Retry (`HARD GATE BLOCKED`)
- **Header:** "Pitch Detection Unconfirmed"
- **Visual Badge:** Crimson danger badge (`#93000a`/`#ffb4ab`) with warning icon.
- **Diagnostic Guidance Box:** *"We couldn't clearly detect your instrument's pitch — try moving closer to the mic, reducing background noise, or playing a bit louder/clearer."*
- **Telemetry Breakdown:** Stored composite confidence percentage (e.g. `Confidence Score: 35% (Required: 60%)`) and detected note count.
- **Action:** Warm brass CTA button `"Try Again"` that resets Step 3 phrase detection independently for unlimited retries. Blocks entry to the studio until passed.

### Screen 5: Calibration Success (`CALIBRATION PASSED`)
- **Header:** "Calibration Complete & Verified"
- **Visual Badge:** Emerald success badge (`#1b5e20`/`#81c784`) with checkmark icon.
- **Telemetry Breakdown Grid:** Locked Noise Floor (`quietDb`), Peak Level (`loudDb`), and confirmed Pitch Confidence Score (e.g. `88% PASS`).
- **Action:** Emerald CTA button `"Start Playing →"` unlocking studio entrance and passing session calibration telemetry into `INPUT STABLE (CONFIDENCE: XX%)` status banner.

---

## 8. Studio Settings & Mic Check Screen Architecture

Extracted directly from Stitch MCP screen resource: **`PulseJam: Studio Settings & Mic Check`** (`projects/13103449190037058115/screens/b510b097ee844ab9b68eb95ed6f32ea5`).

### Overview & Vibe
The Studio Settings modal overlay brings workstation hardware preferences into a translucent glassmorphic panel (`glass-panel`, `#1e2020` backdrop blur) elevated with warm brass accents (`#f2ca50`), dark slate containers (`#1a1c1c`), and real-time audio telemetry.

### Core Layout Sections

1. **Header Bar:**
   - **Icon & Title:** Sliders/tune icon with `"Studio Settings"` title.
   - **Close Button:** Floating close icon (`close`) returning to active DAW studio workspace.

2. **Sidebar Navigation (Category Tabs):**
   - **`Input & Audio` (Active):** Hardware device configuration, input gain, level metering, and live mic test.
   - **`General`:** Studio preferences, sample rate (48.0 kHz), auto-save.
   - **`Shortcuts`:** Transport hotkeys (Spacebar, R key).
   - **`MIDI Config`:** Magenta.js WASM engine status.

3. **Audio Input Mode & Hardware Selection:**
   - **Acoustic Microphone Mode:** Optimized for acoustic guitars, vocal phrases, and ambient room recording.
   - **Audio Interface (Line-In / High-Z Instrument) Mode:** Direct hardware connection for electric guitars, synthesizers, or multi-channel USB audio interfaces.
   - **Input Device Selector Dropdown:** Dynamically populates connected system audio inputs via `navigator.mediaDevices.enumerateDevices()`.

4. **Input Gain & Live Mic-Check Level Metering:**
   - **Input Gain Control:** Interactive range slider (`0 dB` to `+36 dB`) with real-time gain readout.
   - **Live Level Meter:** High-resolution stereo/mono volume bar mapping `-80 dBFS` to `0 dBFS`. Fills dynamically with warm brass gold (`#d4af37` / `#f2ca50`) and turns red/pink (`#ffb4ab`) when audio signal approaches 0 dBFS clipping limits.
   - **Test Microphone CTA Button:** Explicitly prompts user for browser microphone permission (`navigator.mediaDevices.getUserMedia`). Toggles live listening animation (`"Listening..."`) and feeds real-time voice and instrument volume directly into the volume bar.

5. **Hardware Processing & Filters:**
   - **Phantom Power (48V) Toggle:** $+48\text{V}$ condenser mic power switch.
   - **Low Cut Filter Toggle:** $80\text{Hz}$ high-pass rumble filter switch.

---

## 9. Unified Calibration 6-Screen High-Fidelity Suite

Extracted from Stitch MCP screens:
1. `Calibration Instrument` (`projects/13103449190037058115/screens/fd07594057a84fa1a901a4dea34494c3`)
2. `Unified Calibration Step 1 (Quiet)` (`projects/13103449190037058115/screens/896a25da041f460c9d1bcf6477cff4de`)
3. `Unified Calibration Step 2 (Loud)` (`projects/13103449190037058115/screens/428f9b881a174c8481938ad7ad93e8fe`)
4. `Unified Calibration Step 3 (Phrase)` (`projects/13103449190037058115/screens/e1fccdbbd1f746158947d701d9254491`)
5. `Unified Calibration Feedback` (`projects/13103449190037058115/screens/5ee2a7d9b7b64ccfb3d0a10a412eb361`)
6. `Unified Calibration Success` (`projects/13103449190037058115/screens/0f588c02a5234e988cd2e374415e194b`)

### Card Area & Dimensions Uniformity
All 6 calibration screens are housed inside an identical, high-contrast modal card footprint (`glass-panel`, `w-full max-w-2xl min-h-[580px] h-[580px] rounded-xl p-8 bg-[#1e2020]/95 backdrop-blur-xl border border-[#f2ca50]/30 shadow-[0_16px_48px_rgba(0,0,0,0.85)] flex flex-col justify-between items-center text-center relative overflow-hidden`). This guarantees seamless visual transitions without layout shift between calibration steps.

### Screen Breakdown
1. **Calibration Instrument (Intro Overview):**
   - **Badge:** `AI ENGINE CALIBRATION`
   - **Header:** "Preparing Your Studio"
   - **3 Milled Steps Preview:** `01 Quiet` (Noise floor), `02 Loud` (Peak dynamics), `03 Phrase` (YIN pitch verification).
   - **CTA:** `Start Calibration` gold glowing action button.

2. **Step 1: Quiet (`STEP 01/03`):**
   - **Header:** "Play something quiet"
   - **Countdown:** Circular SVG progress ring with `05s` timer.
   - **Telemetry:** Real-time noise floor input level meter (`-60dBFS` to `0dBFS`).

3. **Step 2: Loud (`STEP 02/03`):**
   - **Header:** "Play something loud"
   - **Countdown:** Circular SVG progress ring with `05s` timer.
   - **Telemetry:** Dual-channel L/R peak meter fill (`#d4af37` / `#ff5252`).

4. **Step 3: Phrase (`STEP 03/03`):**
   - **Header:** "Play a Phrase"
   - **Waveform Canvas:** Live wave bars + real-time `DETECTED PITCH` readout (e.g. `A2`, `G3`, `C4`) and YIN confidence level.

5. **Calibration Feedback (`HARD GATE BLOCKED`):**
   - **Header:** "Low Pitch Confidence"
   - **Telemetry:** Composite confidence score percentage and detected note count.
   - **Actions:** Primary gold CTA `Retry Step 3 Phrase`, Secondary CTA `Accept Calibration Anyway`.

6. **Calibration Success (`CALIBRATION PASSED`):**
   - **Header:** "Calibration Complete"
   - **Visuals:** Gold glowing checkmark badge + 100% system status bar.
   - **CTA:** `Continue to Studio` gold action button saving `calibratedAtGainDb` and initializing live pitch tracking.

