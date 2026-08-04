'use client';

import React, { useState } from 'react';

/**
 * Screen Component: PulseJam Studio Hub Refined
 * Extracted from Stitch MCP screen '73002221155145d1a905d2a227855a6a' / '02291350c3064308b701613891d82ba3'
 * Professional DAW & Live Workspace UI using DESIGN.md warm brass tokens.
 */
export const StudioHubScreen: React.FC = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTier, setActiveTier] = useState<'chill' | 'groove' | 'peak'>('groove');
  const [masterVolume, setMasterVolume] = useState(82);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen p-4 md:p-8 font-body-md relative space-y-6">
      {/* Studio Header Bar */}
      <header className="glass-panel p-4 md:p-6 rounded-2xl border border-hairline highlight-top flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-brass flex items-center justify-center text-[#3c2f00] font-bold shadow-[0_0_20px_rgba(242,202,80,0.3)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          </div>
          <div>
            <h1 className="font-headline-sm text-xl md:text-2xl text-[#e5e2e1]">PulseJam Studio Hub</h1>
            <p className="font-label-caps text-xs text-[#d0c5af]">Session #804 · 128 BPM · Key of A Minor</p>
          </div>
        </div>

        {/* Master Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying((v) => !v)}
            className={`px-6 py-2.5 rounded-full font-label-caps text-xs uppercase tracking-widest font-bold transition-all flex items-center gap-2 cursor-pointer ${
              isPlaying
                ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                : 'bg-gradient-brass text-[#3c2f00] highlight-top shadow-[0_0_20px_rgba(242,202,80,0.25)]'
            }`}
          >
            <span>{isPlaying ? 'Pause Live Engine' : 'Start Live Session'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stem Tier Channels */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs text-[#f2ca50] tracking-wider">ACTIVE STEM TIERS</span>
              <span className="font-mono text-xs text-[#d0c5af]">Dynamic Crossfade: Auto</span>
            </div>

            <div className="space-y-4">
              {[
                { id: 'chill', name: 'Chill Stem Tier', color: '#00d4ff', val: 75, active: activeTier === 'chill' },
                { id: 'groove', name: 'Groove Stem Tier', color: '#f2ca50', val: 90, active: activeTier === 'groove' },
                { id: 'peak', name: 'Peak Stem Tier', color: '#ff2d6e', val: 40, active: activeTier === 'peak' },
              ].map((tier) => (
                <div
                  key={tier.id}
                  onClick={() => setActiveTier(tier.id as any)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    tier.active
                      ? 'bg-[#201f1f] border-[#f2ca50] shadow-[0_0_15px_rgba(242,202,80,0.15)]'
                      : 'bg-[#1c1b1b]/60 border-[#4d4635]/40 hover:border-[#99907c]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-[#e5e2e1]">{tier.name}</span>
                    <span className="font-mono text-xs text-[#e7c9a6]">{tier.val}% Output</span>
                  </div>
                  <div className="w-full h-2 bg-[#0e0e0e] rounded-full overflow-hidden border border-hairline">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${tier.val}%`, backgroundColor: tier.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Master Bus Spectrum Visualizer */}
          <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-label-caps text-xs text-[#e7c9a6]">SPECTRAL DSP ANALYZER</span>
              <span className="font-mono text-xs text-[#f2ca50]">32-Bit Float WAV</span>
            </div>
            <div className="h-44 bg-[#0e0e0e] rounded-xl p-4 border border-[#4d4635] flex items-end justify-between gap-1">
              {Array.from({ length: 32 }).map((_, i) => {
                const height = Math.min(100, Math.max(15, (i * 7 + (isPlaying ? 35 : 10)) % 95));
                return (
                  <div
                    key={i}
                    className="flex-1 bg-gradient-to-t from-[#d4af37] via-[#f2ca50] to-[#ffe088] rounded-t-sm transition-all duration-150"
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry & Master Controls */}
        <div className="lg:col-span-4 space-y-6">
          {/* Master Output Meter */}
          <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-4">
            <h3 className="font-headline-sm text-lg text-[#e5e2e1]">Master Output Bus</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-[#d0c5af]">Master Fader</span>
                <span className="text-[#f2ca50]">{masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => setMasterVolume(Number(e.target.value))}
                className="w-full accent-[#f2ca50] bg-[#0e0e0e] h-2 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-4 border-t border-hairline space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#d0c5af]">Input Level</span>
                <span className="text-emerald-400">-12.4 dB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#d0c5af]">DSP Buffer</span>
                <span className="text-[#e7c9a6]">128 Samples</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#d0c5af]">Engine Status</span>
                <span className="text-[#f2ca50]">{isPlaying ? 'LIVE ACTIVE' : 'STANDBY'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
