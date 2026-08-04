'use client';

import React from 'react';

/**
 * Screen Component: PulseJam Performance AI Mode
 * Extracted from Stitch MCP screen '9f3bb6f9db6e441eaa1637fb1d93610d'
 * YIN pitch detection & Magenta.js Web Worker AI accompaniment monitor.
 */
export const PerformanceAIScreen: React.FC = () => {
  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen p-4 md:p-8 font-body-md space-y-6">
      {/* Header Bar */}
      <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-label-caps text-xs text-[#e7c9a6] tracking-widest uppercase">Stage 2 Local AI Engine</span>
          <h1 className="font-headline-sm text-2xl md:text-3xl text-[#e5e2e1] mt-1">Magenta.js AI MIDI Accompaniment</h1>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          TensorFlow WASM Active
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pitch Detection Telemetry */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-4">
          <span className="font-label-caps text-xs text-[#f2ca50]">REAL-TIME YIN PITCH DETECTOR</span>

          <div className="bg-[#0e0e0e] p-6 rounded-xl border border-[#4d4635] flex items-center justify-between">
            <div>
              <div className="font-label-caps text-xs text-[#d0c5af]">DETECTED PITCH</div>
              <div className="font-display-lg text-4xl text-[#f2ca50] font-bold mt-1">A3 (220.00 Hz)</div>
            </div>
            <div className="text-right">
              <div className="font-label-caps text-xs text-[#d0c5af]">CONFIDENCE</div>
              <div className="font-mono text-lg text-emerald-400 font-bold mt-1">98.4%</div>
            </div>
          </div>
        </div>

        {/* AI Generation Stream */}
        <div className="lg:col-span-6 glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-4">
          <span className="font-label-caps text-xs text-[#e7c9a6]">1-BAR LOOKAHEAD AI GENERATOR</span>

          <div className="bg-[#0e0e0e] p-6 rounded-xl border border-[#4d4635] space-y-3 font-mono text-xs">
            <div className="flex justify-between border-b border-hairline pb-2 text-[#d0c5af]">
              <span>Sequence Step</span>
              <span>Notes Output</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Bar 4, Beat 1</span>
              <span className="text-[#f2ca50]">Bass [A2, E2], Drum [Kick, Snare]</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Bar 4, Beat 2</span>
              <span className="text-[#f2ca50]">Bass [G2], Drum [HiHat]</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
