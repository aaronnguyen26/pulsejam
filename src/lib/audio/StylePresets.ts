/**
 * PulseJam Stage 2/3 — Curated Musical Style Presets Library
 *
 * Provides studio-grade musical style profiles with tier-specific generative prompts,
 * default tempos, color accents, and genre categorization.
 */

import { PerformanceTier, StylePreset } from './types';

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'lo-fi',
    name: 'Lo-Fi Midnight Beats',
    category: 'Lo-Fi',
    description: 'Tape-saturated Rhodes, dusty vinyl crackle, and swinging boom-bap pocket.',
    tags: ['Chillhop', 'Rhodes', 'Tape Vinyl', 'Relaxed'],
    defaultBpm: 84,
    colorAccent: '#a78bfa', // Lavender Purple
    tierPrompts: {
      chill: 'lo-fi vinyl Rhodes, mellow tape bass, sparse chillhop beat',
      groove: 'lo-fi hip-hop groove, warm dusty snare, melodic electric piano',
      peak: 'driving lo-fi boom-bap, heavy swinging drums, rich piano chords',
    },
  },
  {
    id: 'neo-soul',
    name: 'Neo-Soul Warmth',
    category: 'Soul',
    description: 'Lush 9th chords, warm fretless basslines, and syncopated D\'Angelo pocket.',
    tags: ['Neo-Soul', 'Fretless Bass', 'Extended Chords', 'Groove'],
    defaultBpm: 92,
    colorAccent: '#f59e0b', // Warm Amber
    tierPrompts: {
      chill: 'smooth neo-soul Rhodes, warm fretless bass, sparse jazz drums',
      groove: 'neo-soul groove, syncopated hi-hats, lush 9th chords, funk pocket',
      peak: 'energetic neo-soul funk, bright brass stabs, active slapping bass',
    },
  },
  {
    id: 'indie-rock',
    name: 'Indie Rock Drive',
    category: 'Rock',
    description: 'Jangly clean guitars, punchy overdrive bass, and driving drum kit rhythms.',
    tags: ['Indie', 'Alternative', 'Overdrive', 'Punchy'],
    defaultBpm: 124,
    colorAccent: '#ef4444', // Red Flame
    tierPrompts: {
      chill: 'clean jangly guitar arpeggios, gentle drum kit, warm bass pad',
      groove: 'indie rock rhythm, punchy overdrive bass, driving snare groove',
      peak: 'high-energy indie rock, fuzz bass, crashing cymbals, anthemic drive',
    },
  },
  {
    id: 'synthwave',
    name: 'Synthwave 80s',
    category: 'Electronic',
    description: 'Analog arpeggios, gated reverb snare, and pulsing 16th-note synth basslines.',
    tags: ['Outrun', '80s Retro', 'Gated Reverb', 'Arpeggios'],
    defaultBpm: 118,
    colorAccent: '#ec4899', // Neon Magenta
    tierPrompts: {
      chill: '80s retro synth pad, gentle arpeggiator, gated reverb pulse',
      groove: 'synthwave bassline, punchy LinnDrum beat, neon analog lead',
      peak: 'driving outrun synthwave, intense 16th-note bass, huge gated drums',
    },
  },
  {
    id: 'cinematic-ambient',
    name: 'Cinematic Ambient',
    category: 'Ambient',
    description: 'Evolving orchestral string pads, deep sub drones, and spatial reverb soundscapes.',
    tags: ['Soundtrack', 'Ethereal', 'Wide Stereo', 'Film Score'],
    defaultBpm: 75,
    colorAccent: '#06b6d4', // Cyan Sky
    tierPrompts: {
      chill: 'ethereal cinematic string pads, distant piano harmonics, deep sub drone',
      groove: 'evolving ambient textures, subtle rhythmic pulses, acoustic harp',
      peak: 'epic orchestral crescendo, driving cinematic percussion, wide brass',
    },
  },
  {
    id: 'funk-pocket',
    name: 'Funk Pocket',
    category: 'Jazz',
    description: 'Tight syncopated grooves, percussive slapping bass, and crisp wah rhythm chops.',
    tags: ['Funk', 'Slap Bass', 'Syncopated', 'Horn Section'],
    defaultBpm: 108,
    colorAccent: '#10b981', // Emerald Green
    tierPrompts: {
      chill: 'mellow clavinet groove, subtle walking bass, relaxed drum swing',
      groove: 'tight funk pocket, syncopated slapping bass, wah guitar chops',
      peak: 'explosive funk jam, high-energy horn section, blistering drum fills',
    },
  },
];

export function getStylePreset(id: string): StylePreset {
  const found = STYLE_PRESETS.find((p) => p.id === id);
  return found || STYLE_PRESETS[0];
}

export function getAllStylePresets(): StylePreset[] {
  return STYLE_PRESETS;
}

export function getTierPromptForPreset(presetId: string, tier: PerformanceTier): string {
  const preset = getStylePreset(presetId);
  return preset.tierPrompts[tier] || preset.tierPrompts.groove;
}
