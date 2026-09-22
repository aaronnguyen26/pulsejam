'use client';

import React, { useState, useEffect } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { STYLE_PRESETS, getStylePreset } from '@/lib/audio/StylePresets';
import { ArrangerState, ChordEstimate, PerformanceTier } from '@/lib/audio/types';

interface PerformLiveScreenProps {
  audioEngine: AudioEngine | null;
  onExitStage?: () => void;
}

export const PerformLiveScreen: React.FC<PerformLiveScreenProps> = ({
  audioEngine,
  onExitStage,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState('neosoul');
  const [currentTier, setCurrentTier] = useState<PerformanceTier>('groove');
  const [currentBpm, setCurrentBpm] = useState(92);
  const [detectedKey, setDetectedKey] = useState('A Minor');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTakeSavedToast, setIsTakeSavedToast] = useState(false);
  const [activeScaleIndex, setActiveScaleIndex] = useState(0);

  const [chordEstimate, setChordEstimate] = useState<ChordEstimate>({
    rootNoteName: 'A',
    rootMidiPitch: 57,
    quality: 'Minor',
    chordSymbol: 'Am7',
    romanNumeral: 'i7',
    confidence: 0.94,
    harmonicTension: 0.25,
    recommendedScales: ['A Dorian Mode', 'A Minor Pentatonic', 'A Blues Scale'],
  });

  const [arrangerState, setArrangerState] = useState<ArrangerState>({
    currentSection: 'chorus',
    currentBar: 8,
    currentBeat: 3,
    totalBarsPlayed: 24,
    feel: 'standard',
    isFillQueued: false,
    isFillActive: false,
    energyLevel: 0.85,
    sectionProgress: 0.75,
  });

  // Gig Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Subscriptions to live engine metrics if available
  useEffect(() => {
    if (!audioEngine) return;
    const pollInterval = setInterval(() => {
      const chord = audioEngine.getChordTracker()?.getLastDetectedChord();
      if (chord) setChordEstimate(chord);
      const arranger = audioEngine.getDynamicArranger()?.getState();
      if (arranger) setArrangerState(arranger);
    }, 150);
    return () => clearInterval(pollInterval);
  }, [audioEngine]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleTriggerFill = () => {
    audioEngine?.getDynamicArranger().triggerFill();
    setArrangerState((prev) => ({ ...prev, isFillActive: true, isFillQueued: true }));
    setTimeout(() => {
      setArrangerState((prev) => ({ ...prev, isFillActive: false, isFillQueued: false }));
    }, 2000);
  };

  const handleSaveRetrospectiveTake = () => {
    setIsTakeSavedToast(true);
    setTimeout(() => setIsTakeSavedToast(false), 3000);
  };

  const handleTierSelect = (tier: PerformanceTier) => {
    setCurrentTier(tier);
    if (audioEngine) {
      audioEngine.setOperatingMode('OVERRIDE', tier);
      const stemEngine = audioEngine.getStemEngine();
      if (stemEngine) {
        stemEngine.transitionToTier(tier);
      }
    }
  };

  const activePreset = getStylePreset(selectedPresetId);
  const currentScaleName = chordEstimate.recommendedScales[activeScaleIndex] || chordEstimate.recommendedScales[0] || 'A Dorian Mode';

  // Scale degrees data for A Dorian (Root A)
  const scaleDegrees = [
    { degree: '1 (Root)', note: chordEstimate.rootNoteName || 'A', isKey: true },
    { degree: '2', note: 'B', isKey: false },
    { degree: '♭3', note: 'C', isKey: false },
    { degree: '4', note: 'D', isKey: false },
    { degree: '5', note: 'E', isKey: false },
    { degree: '♮6 (Key)', note: 'F♯', isKey: true },
    { degree: '♭7', note: 'G', isKey: false },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121414] text-[#e3e2e2] overflow-y-auto select-none font-sans relative antialiased">
      {/* Toast Notification: Retrospective Take Saved */}
      {isTakeSavedToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#1e1c15] border border-[#f2ca50] text-[#ffe9b0] px-6 py-2.5 rounded-full font-mono text-xs font-bold shadow-[0_4px_24px_rgba(242,202,80,0.35)] animate-in fade-in slide-in-from-top-4 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#f2ca50]" />
          <span>LAST 8 BARS CAPTURED & SAVED TO ARCHIVE</span>
        </div>
      )}

      {/* ── 1. Top Telemetry & Header Bar ──────────────────────────────── */}
      <header className="w-full px-6 py-3 flex justify-between items-center border-b border-[#4d4635]/40 bg-[#161818]/95 backdrop-blur-md shrink-0 shadow-md">
        {/* Left: Brand & Live Engine Indicator */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm tracking-wider font-bold text-[#f2ca50]">
              PULSEJAM // LIVE STAGE
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#1e2020] border border-[#4d4635]/40">
            <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-pulse" />
            <span className="font-mono text-[10px] text-[#d0c5af] tracking-widest uppercase">
              REC [AI ENGINE ACTIVE]
            </span>
          </div>
        </div>

        {/* Center: Stage Telemetry Readout */}
        <div className="hidden md:flex items-center gap-4 bg-[#0d0f0f] px-3.5 py-1.5 rounded-lg border border-[#4d4635]/30">
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#ffe9b0] font-bold">
            <svg className="w-3.5 h-3.5 text-[#d0c5af]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <div className="h-3 w-px bg-[#4d4635]/40" />
          <div className="flex items-center gap-3 font-mono text-[11px] text-[#d0c5af]">
            <span>CPU <strong className="text-[#e3e2e2]">12%</strong></span>
            <span>LATENCY <strong className="text-[#f2ca50]">3.2ms</strong></span>
          </div>
        </div>

        {/* Right: Pedal Status & Exit Stage */}
        <div className="flex items-center gap-3">
          {/* MIDI Footpedal Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2020] border border-[#4d4635]/40 font-mono text-[11px] text-[#d0c5af]">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
            <span className="tracking-wide">PEDAL CC#64 ARMED</span>
          </div>

          {/* Exit Stage Button */}
          {onExitStage && (
            <button
              onClick={onExitStage}
              className="px-3.5 py-1.5 bg-[#282a2a] hover:bg-[#333535] border border-[#4d4635]/60 rounded-lg text-[#e3e2e2] hover:text-[#f2ca50] font-mono text-xs tracking-wider transition-all cursor-pointer active:scale-95"
            >
              EXIT STAGE
            </button>
          )}
        </div>
      </header>

      {/* ── 2. Main High-Visibility Center Stage HUD ────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6 justify-between">
        {/* Top Section: Primary HUD Chord Target & Time Grid */}
        <section className="w-full bg-[#1a1c1c] border border-[#4d4635]/40 rounded-2xl p-6 flex flex-col gap-5 shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* Left 7 Columns: Massive Active Chord Card */}
            <div className="lg:col-span-7 bg-[#1e2020] rounded-xl p-5 border border-[#4d4635]/50 flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-[#4d4635]/30 pb-2.5">
                <span className="font-mono text-[11px] text-[#d0c5af] tracking-widest uppercase">
                  CURRENT HARMONIC TARGET
                </span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded border border-[#f2ca50]/40 text-[#f2ca50] font-mono text-[10px] font-bold uppercase tracking-wider">
                    {arrangerState.currentSection}
                  </span>
                  <span className="font-mono text-[10px] text-[#d0c5af]/80">
                    PASS {Math.min(4, Math.floor(arrangerState.totalBarsPlayed / 8) + 1)} OF 4
                  </span>
                </div>
              </div>

              {/* Giant Chord Glyph */}
              <div className="py-4 flex items-baseline justify-between flex-wrap gap-4">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-6xl md:text-8xl font-bold tracking-tight text-[#ffe9b0] drop-shadow-[0_2px_12px_rgba(242,202,80,0.2)]">
                    {chordEstimate.chordSymbol.split('/')[0]}
                  </span>
                  {chordEstimate.chordSymbol.includes('/') && (
                    <span className="font-mono text-2xl md:text-3xl text-[#d0c5af] font-medium">
                      / {chordEstimate.chordSymbol.split('/')[1]}
                    </span>
                  )}
                </div>

                {/* Degree & Tension Segment */}
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded bg-[#282a2a] border border-[#4d4635]/60 text-[#f2ca50] font-mono text-base font-bold">
                      {chordEstimate.romanNumeral}
                    </span>
                    <span className="font-mono text-xs text-[#d0c5af] uppercase tracking-wider">
                      {chordEstimate.quality}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-[#d0c5af]/80 mt-1">
                    Next: <strong className="text-[#ffe9b0]">Fmaj7 (#11)</strong> [VImaj7]
                  </span>
                </div>
              </div>

              {/* Harmonic Tension Gauge */}
              <div className="space-y-1.5 pt-3 border-t border-[#4d4635]/30">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-[#d0c5af]">HARMONIC TENSION</span>
                  <span className="text-[#f2ca50] font-bold">
                    {Math.round(chordEstimate.harmonicTension * 100)}% ({chordEstimate.harmonicTension < 0.4 ? 'RESOLVING' : 'BUILDING'})
                  </span>
                </div>
                <div className="w-full bg-[#0d0f0f] h-2 rounded flex gap-1 p-0.5 border border-[#4d4635]/30">
                  {[0.25, 0.5, 0.75, 1.0].map((step, idx) => {
                    const isFilled = chordEstimate.harmonicTension >= step - 0.25;
                    return (
                      <div
                        key={`tension-seg-${idx}`}
                        className={`h-full flex-1 rounded-sm transition-colors ${
                          isFilled ? 'bg-[#f2ca50]' : 'bg-[#282a2a]'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Bar & Beat Rhythmic Pulse Array */}
            <div className="lg:col-span-5 bg-[#1e2020] rounded-xl p-5 border border-[#4d4635]/50 flex flex-col justify-between gap-4">
              <div className="flex items-center justify-between border-b border-[#4d4635]/30 pb-2.5">
                <span className="font-mono text-[11px] text-[#d0c5af] tracking-widest uppercase">
                  METRIC CLOCK & BEAT
                </span>
                <span className="font-mono text-xs text-[#f2ca50] font-bold">4/4 TIME</span>
              </div>

              {/* Large Monospace Measure Counter */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-mono text-[11px] text-[#d0c5af] uppercase">MEASURE</span>
                  <span className="font-mono text-4xl md:text-5xl font-bold text-[#e3e2e2] tracking-tight">
                    BAR {arrangerState.currentBar.toString().padStart(2, '0')}{' '}
                    <span className="text-[#d0c5af] font-light">:</span>{' '}
                    <span className="text-[#f2ca50]">{arrangerState.currentBeat}</span>
                  </span>
                </div>

                {/* 4-Beat Rhythmic Pulse Visualizer */}
                <div className="flex items-center gap-2.5">
                  {[1, 2, 3, 4].map((beat) => {
                    const isActive = arrangerState.currentBeat === beat;
                    const isDownbeat = beat === 1;
                    return (
                      <div key={`beat-pill-${beat}`} className="flex flex-col items-center gap-1.5">
                        <span className={`font-mono text-[11px] ${isActive ? 'text-[#f2ca50] font-bold' : 'text-[#d0c5af]/60'}`}>
                          {beat}
                        </span>
                        <div
                          className={`w-7 h-14 rounded-lg flex items-center justify-center transition-all duration-100 ${
                            isActive
                              ? isDownbeat
                                ? 'bg-[#f2ca50] shadow-[0_0_14px_rgba(242,202,80,0.5)] scale-y-105'
                                : 'bg-[#d0c5af] text-[#121414] shadow-[0_0_10px_rgba(208,197,175,0.4)]'
                              : 'bg-[#282a2a] border border-[#4d4635]/30'
                          }`}
                        >
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-[#121414]" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Performance Telemetry Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#4d4635]/30 font-mono text-xs">
                <div className="bg-[#161818] px-3 py-1.5 rounded border border-[#4d4635]/30 flex justify-between">
                  <span className="text-[#d0c5af]">TEMPO</span>
                  <span className="text-[#f2ca50] font-bold">{currentBpm}.0 BPM</span>
                </div>
                <div className="bg-[#161818] px-3 py-1.5 rounded border border-[#4d4635]/30 flex justify-between">
                  <span className="text-[#d0c5af]">KEY</span>
                  <span className="text-[#ffe9b0] font-bold">{detectedKey}</span>
                </div>
                <div className="bg-[#161818] px-3 py-1.5 rounded border border-[#4d4635]/30 flex justify-between">
                  <span className="text-[#d0c5af]">GROOVE</span>
                  <span className="text-[#e3e2e2]">{activePreset.name.split(' ')[0]} Swing</span>
                </div>
                <div className="bg-[#161818] px-3 py-1.5 rounded border border-[#4d4635]/30 flex justify-between">
                  <span className="text-[#d0c5af]">FEEL</span>
                  <span className="text-[#d0c5af]">-12ms Behind</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Mid-Deck Two-Column Musical & Modal Intelligence Section ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card Left: Solo Scale & Modal Recommendation */}
          <section className="bg-[#1a1c1c] border border-[#4d4635]/40 rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#4d4635]/30">
                <span className="font-mono text-[11px] text-[#d0c5af] tracking-widest uppercase">
                  SOLO SCALE RECOMMENDATION
                </span>
                <span className="px-2.5 py-0.5 rounded bg-[#1e2020] border border-[#4d4635]/40 font-mono text-[10px] text-[#f2ca50] font-bold">
                  KEY MATCH: 99%
                </span>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <span className="font-mono text-[11px] text-[#d0c5af] uppercase">ACTIVE SCALE OPTION</span>
                  <h2 className="font-serif text-2xl md:text-3xl text-[#ffe9b0] font-bold tracking-tight flex items-center gap-2 mt-0.5">
                    {currentScaleName}
                    <svg className="w-5 h-5 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] text-[#d0c5af] uppercase">FLAVOR</span>
                  <p className="font-sans text-xs text-[#d0c5af] font-medium mt-0.5">
                    {activeScaleIndex === 0 ? 'Bright Minor · Nat 6th (F#)' : activeScaleIndex === 1 ? 'Safe Blues Pocket' : 'Chromatic Grit'}
                  </p>
                </div>
              </div>

              {/* Visual Scale Degree Strip */}
              <div className="mt-4 bg-[#1e2020] p-3 rounded-xl border border-[#4d4635]/40">
                <div className="grid grid-cols-7 gap-1.5 text-center font-mono">
                  {scaleDegrees.map((item, idx) => (
                    <div
                      key={`degree-${idx}`}
                      className={`py-2 rounded-lg border ${
                        item.isKey
                          ? 'bg-[#282a2a] border-[#f2ca50]/70 shadow-sm'
                          : 'bg-[#161818] border-[#4d4635]/30'
                      }`}
                    >
                      <span className={`block text-sm font-bold ${item.isKey ? 'text-[#f2ca50]' : 'text-[#e3e2e2]'}`}>
                        {item.note}
                      </span>
                      <span className={`text-[10px] ${item.isKey ? 'text-[#f2ca50] font-bold' : 'text-[#d0c5af]/70'}`}>
                        {item.degree}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Scale Alternates Quick Chips */}
            <div className="pt-3 border-t border-[#4d4635]/30 flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-[#d0c5af]">QUICK SAFE PIVOTS:</span>
              <div className="flex items-center gap-2">
                {chordEstimate.recommendedScales.map((scale, sIdx) => (
                  <button
                    key={`scale-pivot-${sIdx}`}
                    onClick={() => setActiveScaleIndex(sIdx)}
                    className={`px-3 py-1 rounded-lg border font-mono text-[11px] transition-all cursor-pointer ${
                      activeScaleIndex === sIdx
                        ? 'bg-[#282a2a] text-[#f2ca50] border-[#f2ca50] font-bold'
                        : 'bg-[#1e2020] text-[#d0c5af] border-[#4d4635]/40 hover:text-[#e3e2e2] hover:bg-[#282a2a]'
                    }`}
                  >
                    {scale.replace(' Mode', '')}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Card Right: AI Band Accompanying Stems Telemetry */}
          <section className="bg-[#1a1c1c] border border-[#4d4635]/40 rounded-2xl p-6 flex flex-col justify-between gap-5 shadow-lg">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-[#4d4635]/30">
                <span className="font-mono text-[11px] text-[#d0c5af] tracking-widest uppercase">
                  AI ACCOMPANIMENT STEMS
                </span>
                <span className="font-mono text-[10px] text-[#d0c5af]">
                  AUDIO ENGINE: <strong className="text-[#4edea3]">SYNCED</strong>
                </span>
              </div>

              <div className="mt-4 space-y-2.5">
                {/* Stem 1: Drums */}
                <div className="bg-[#1e2020] p-2.5 rounded-xl border border-[#4d4635]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#282a2a] flex items-center justify-center text-[#f2ca50]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-xs text-[#e3e2e2] font-semibold leading-tight">Drums</div>
                      <div className="font-mono text-[10px] text-[#d0c5af]/70">Pocket Grooving · 16th Hi-hats</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 h-3">
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                    </div>
                    <span className="font-mono text-xs text-[#ffe9b0]">-2.4 dB</span>
                  </div>
                </div>

                {/* Stem 2: Bass */}
                <div className="bg-[#1e2020] p-2.5 rounded-xl border border-[#4d4635]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#282a2a] flex items-center justify-center text-[#f2ca50]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-xs text-[#e3e2e2] font-semibold leading-tight">Bass Engine</div>
                      <div className="font-mono text-[10px] text-[#d0c5af]/70">Walking Root-Fifth Pattern</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 h-3">
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                    </div>
                    <span className="font-mono text-xs text-[#ffe9b0]">-1.1 dB</span>
                  </div>
                </div>

                {/* Stem 3: Keys */}
                <div className="bg-[#1e2020] p-2.5 rounded-xl border border-[#4d4635]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#282a2a] flex items-center justify-center text-[#f2ca50]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="5" width="20" height="14" rx="2" />
                        <line x1="6" y1="5" x2="6" y2="13" />
                        <line x1="10" y1="5" x2="10" y2="13" />
                        <line x1="14" y1="5" x2="14" y2="13" />
                        <line x1="18" y1="5" x2="18" y2="13" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-xs text-[#e3e2e2] font-semibold leading-tight">Electric Keys</div>
                      <div className="font-mono text-[10px] text-[#d0c5af]/70">Warm Rhodes 73 Voicings</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 h-3">
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                    </div>
                    <span className="font-mono text-xs text-[#ffe9b0]">-4.0 dB</span>
                  </div>
                </div>

                {/* Stem 4: Analog Synth Pad */}
                <div className="bg-[#1e2020] p-2.5 rounded-xl border border-[#4d4635]/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-[#282a2a] flex items-center justify-center text-[#f2ca50]">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </span>
                    <div>
                      <div className="font-mono text-xs text-[#e3e2e2] font-semibold leading-tight">Analog Synth Pad</div>
                      <div className="font-mono text-[10px] text-[#d0c5af]/70">Warm Harmonic Resonance</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1 h-3">
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#f2ca50]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                      <div className="w-1.5 h-full rounded-sm bg-[#4d4635]" />
                    </div>
                    <span className="font-mono text-xs text-[#ffe9b0]">-6.8 dB</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2.5 border-t border-[#4d4635]/30 flex items-center justify-between font-mono text-[11px] text-[#d0c5af]">
              <span>ARRANGEMENT ADAPTABILITY: <strong className="text-[#f2ca50]">HIGH</strong></span>
              <span>FOOTSWITCH 1-4 LINKED</span>
            </div>
          </section>
        </div>

        {/* ── 4. Bottom Stage Controller Deck ────────────────────────────── */}
        <footer className="w-full bg-[#1a1c1c] border border-[#4d4635]/40 rounded-2xl p-4 shadow-lg select-none">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
            {/* Dynamic Energy Tier Selector */}
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <span className="font-mono text-xs text-[#d0c5af] mr-2 hidden sm:inline">BAND ENERGY:</span>
              <div className="bg-[#121414] p-1 rounded-xl border border-[#4d4635]/40 flex items-center gap-1 w-full lg:w-auto">
                {(['chill', 'groove', 'peak'] as PerformanceTier[]).map((tier) => {
                  const isSel = currentTier === tier;
                  return (
                    <button
                      key={`tier-${tier}`}
                      onClick={() => handleTierSelect(tier)}
                      className={`flex-1 lg:flex-none px-4 py-2 rounded-lg font-mono text-xs tracking-wider uppercase transition-all cursor-pointer ${
                        isSel
                          ? 'bg-[#f2ca50] text-[#3c2f00] font-bold shadow-[0_0_12px_rgba(242,202,80,0.35)]'
                          : 'text-[#d0c5af] hover:text-[#e3e2e2] hover:bg-[#202222]'
                      }`}
                    >
                      {tier === 'peak' ? 'Peak Dynamic' : tier}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tactical High-Affordance Stage Action Buttons */}
            <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
              {/* Tactical Pedal Status Indicator */}
              <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1e2020] border border-[#4d4635]/30 font-mono text-xs text-[#d0c5af]">
                <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
                <span>HOLD PEDAL SUSTAIN: ENABLED</span>
              </div>

              {/* Action 1: Drum Fill Trigger */}
              <button
                onClick={handleTriggerFill}
                className={`flex-1 lg:flex-none h-12 px-5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 border-2 ${
                  arrangerState.isFillActive
                    ? 'bg-[#f2ca50] text-[#3c2f00] border-[#ffe9b0] shadow-[0_0_20px_rgba(242,202,80,0.6)] scale-105'
                    : 'bg-[#282a2a] hover:bg-[#333535] text-[#ffe9b0] border-[#f2ca50]/70'
                }`}
              >
                <span>🥁 TRIGGER DRUM FILL</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#121414] text-[#d0c5af]">
                  BAR END
                </span>
              </button>

              {/* Action 2: Capture Last 8 Bars */}
              <button
                onClick={handleSaveRetrospectiveTake}
                className="flex-1 lg:flex-none h-12 px-5 bg-[#f2ca50] hover:bg-[#ffe9b0] active:scale-95 rounded-xl text-[#3c2f00] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_16px_rgba(242,202,80,0.3)]"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8V3" />
                </svg>
                <span>CAPTURE LAST 8 BARS</span>
              </button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};
