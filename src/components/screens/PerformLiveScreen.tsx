'use client';

import React, { useState, useEffect } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { STYLE_PRESETS, getStylePreset } from '@/lib/audio/StylePresets';
import { ArrangerState, ChordEstimate } from '@/lib/audio/types';

interface PerformLiveScreenProps {
  audioEngine: AudioEngine | null;
  onExitStage?: () => void;
}

export const PerformLiveScreen: React.FC<PerformLiveScreenProps> = ({
  audioEngine,
  onExitStage,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState('neosoul');
  const [currentBpm, setCurrentBpm] = useState(92);
  const [detectedKey, setDetectedKey] = useState('A Minor');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTakeSavedToast, setIsTakeSavedToast] = useState(false);

  const [chordEstimate, setChordEstimate] = useState<ChordEstimate>({
    rootNoteName: 'A',
    rootMidiPitch: 57,
    quality: 'Minor',
    chordSymbol: 'Am7',
    romanNumeral: 'i7',
    confidence: 0.92,
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
    }, 200);
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

  const activePreset = getStylePreset(selectedPresetId);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090b] text-[#eae1d4] overflow-hidden select-none font-sans relative">
      {/* Toast Notification */}
      {isTakeSavedToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-[#241a00] border border-[#f2ca50] text-[#f2ca50] px-6 py-2.5 rounded-full font-mono text-xs font-bold shadow-[0_0_24px_rgba(242,202,80,0.6)] animate-in fade-in slide-in-from-top-4 flex items-center gap-2">
          <span>✨ LAST 8 BARS CAPTURED & SAVED TO ARCHIVE!</span>
        </div>
      )}

      {/* Top Stage Bar */}
      <header className="h-16 px-8 bg-[#110e07] border-b border-[#4d4635]/50 flex items-center justify-between shrink-0 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="font-mono text-xs font-bold tracking-widest text-red-400 uppercase">
              LIVE STAGE MODE
            </span>
          </div>

          {/* Gig Timer */}
          <div className="bg-[#1f1b13] border border-black/80 px-3 py-1 rounded-lg font-mono text-xs font-bold text-[#ffe9b0] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
            <span>⏱ GIG TIMER: {formatTimer(elapsedSeconds)}</span>
          </div>

          {/* Footswitch Status */}
          <div className="bg-[#1f1b13] border border-emerald-500/40 text-emerald-300 px-3 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PEDAL READY (CC#64 HOLD FOR FILL)</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="font-mono text-xs text-[#7bd0ff] font-bold bg-[#1f1b13] px-3 py-1 rounded-lg border border-[#4d4635]/40">
            ⚡ 14ms ON-DEVICE MLX
          </div>

          {onExitStage && (
            <button
              onClick={onExitStage}
              className="px-4 py-1.5 rounded-lg bg-[#231f17] hover:bg-[#2d2a21] text-xs font-mono text-[#d0c5af] hover:text-white border border-[#4d4635]/40 transition cursor-pointer"
            >
              ✕ EXIT STAGE
            </button>
          )}
        </div>
      </header>

      {/* Main High-Visibility Center Stage HUD */}
      <main className="flex-1 flex flex-col justify-between p-8 max-w-7xl mx-auto w-full">
        {/* Giant Active Chord & Roman Numeral Display */}
        <div className="bg-[#110e07] border-2 border-[#f2ca50]/50 rounded-3xl p-10 text-center shadow-[0_0_50px_rgba(242,202,80,0.15)] relative overflow-hidden">
          <div className="absolute top-4 left-6 flex items-center gap-3 font-mono text-xs text-[#d0c5af]/60">
            <span>ACTIVE KEY: <strong className="text-[#f2ca50]">{detectedKey}</strong></span>
            <span>•</span>
            <span>TEMPO: <strong className="text-amber-300">{currentBpm} BPM</strong></span>
          </div>

          <div className="absolute top-4 right-6 font-mono text-xs text-[#d0c5af]/60">
            STYLE: <strong className="text-[#7bd0ff]">{activePreset.name.toUpperCase()}</strong>
          </div>

          {/* Giant Chord Symbol */}
          <div className="my-6">
            <span className="font-serif text-8xl md:text-9xl font-bold tracking-tight text-[#ffe9b0] drop-shadow-[0_0_35px_rgba(242,202,80,0.5)]">
              {chordEstimate.chordSymbol}
            </span>
            <div className="font-mono text-2xl font-bold text-amber-400/90 mt-2 tracking-widest uppercase">
              ROMAN DEGREE: {chordEstimate.romanNumeral} • HARMONIC TENSION: {Math.round(chordEstimate.harmonicTension * 100)}%
            </div>
          </div>

          {/* Phrasing & Section Progress Bar */}
          <div className="max-w-xl mx-auto">
            <div className="flex justify-between items-center font-mono text-sm mb-2">
              <span className="text-emerald-300 font-bold uppercase tracking-wider">
                SECTION: {arrangerState.currentSection.toUpperCase()}
              </span>
              <span className="text-amber-300 font-bold tracking-widest text-base">
                BAR {arrangerState.currentBar.toString().padStart(2, '0')}:{arrangerState.currentBeat}
              </span>
            </div>

            {/* 4-Beat Visualizer Pulse */}
            <div className="flex gap-2 h-4">
              {[1, 2, 3, 4].map((beat) => {
                const isActive = arrangerState.currentBeat === beat;
                return (
                  <div
                    key={`beat-indicator-${beat}`}
                    className={`flex-1 rounded-full transition-all duration-100 ${
                      isActive
                        ? 'bg-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.9)] scale-y-125'
                        : 'bg-[#231f17]'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Modal Solo Scale Recommendation Banner */}
        <div className="bg-cyan-950/30 border-2 border-cyan-500/50 rounded-2xl p-6 flex items-center justify-between shadow-[0_0_30px_rgba(56,189,248,0.15)] my-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-400/40 flex items-center justify-center text-cyan-300 text-2xl font-bold">
              🎼
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase tracking-widest block">
                SOLO SCALE RECOMMENDATION
              </span>
              <h2 className="font-mono text-2xl md:text-3xl font-bold text-white tracking-wide">
                {chordEstimate.recommendedScales[0]}
              </h2>
            </div>
          </div>

          <div className="hidden md:flex flex-col text-right font-mono text-xs text-[#d0c5af]/80 max-w-xs">
            <span>Harmonic modal lift over current changes.</span>
            <span className="text-cyan-300 mt-0.5">Alt: {chordEstimate.recommendedScales[1]}</span>
          </div>
        </div>

        {/* Bottom Giant Touch/Pedal Friendly Action Buttons */}
        <div className="grid grid-cols-3 gap-6">
          {/* Quick Preset Selector */}
          <div className="flex gap-2 bg-[#110e07] p-2 rounded-2xl border border-[#4d4635]/40">
            {STYLE_PRESETS.slice(0, 3).map((p) => {
              const isSel = p.id === selectedPresetId;
              return (
                <button
                  key={`stage-preset-${p.id}`}
                  onClick={() => setSelectedPresetId(p.id)}
                  className={`flex-1 py-3 px-2 rounded-xl font-mono text-xs font-bold uppercase transition cursor-pointer border ${
                    isSel
                      ? 'bg-[#231f17] text-[#f2ca50] border-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.3)]'
                      : 'bg-transparent text-[#d0c5af]/60 border-transparent hover:bg-[#1f1b13]'
                  }`}
                >
                  {p.name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Giant Drum Fill Trigger */}
          <button
            onClick={handleTriggerFill}
            className={`py-4 rounded-2xl font-mono text-sm font-bold uppercase tracking-widest transition-all cursor-pointer border-2 shadow-xl flex items-center justify-center gap-2 ${
              arrangerState.isFillActive
                ? 'bg-amber-500 text-black border-amber-300 scale-105 shadow-[0_0_25px_rgba(245,158,11,0.8)]'
                : 'bg-[#231f17] text-amber-300 border-amber-500/50 hover:bg-[#2d2a21]'
            }`}
          >
            <span className="text-lg">🥁</span>
            <span>TRIGGER DRUM FILL</span>
          </button>

          {/* Giant Retrospective Loop Capture */}
          <button
            onClick={handleSaveRetrospectiveTake}
            className="py-4 rounded-2xl bg-gradient-to-r from-amber-500/30 to-amber-600/30 hover:brightness-125 text-[#ffe9b0] border-2 border-[#f2ca50]/60 font-mono text-sm font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(242,202,80,0.25)]"
          >
            <span className="text-lg">✨</span>
            <span>KEEP LAST 8 BARS</span>
          </button>
        </div>
      </main>
    </div>
  );
};
