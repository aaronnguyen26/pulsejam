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
2. **`PulseJamStudioHub`**: Complete DAW studio hub with master bus, audio telemetry visualization, and quick actions.
3. **`PulseJamPerformanceStems`**: Live performance rack featuring Chill, Groove, and Peak dynamic crossfading stem controls.
4. **`PulseJamPerformanceAI`**: Magenta.js Web Worker AI accompaniment & real-time pitch detection console.
5. **`InputCalibrationModal`**: Acoustic mic calibration wizard with real-time level meters and noise-floor threshold sliders.
6. **`PulseJamLibrary`**: Master tapes project & stem track browser.
