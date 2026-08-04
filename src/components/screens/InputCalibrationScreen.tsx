'use client';

import React, { useState } from 'react';

/**
 * Screen Component: Input Calibration
 * Extracted from Stitch MCP screen '645c04016de643edabf970b7d4035bc8'
 * Audio input level & mic threshold wizard using DESIGN.md warm brass tokens.
 */
export const InputCalibrationScreen: React.FC = () => {
  const [level, setLevel] = useState(65);
  const [noiseFloor, setNoiseFloor] = useState(15);

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen p-4 md:p-8 font-body-md flex items-center justify-center">
      <div className="glass-panel max-w-xl w-full p-8 rounded-2xl border border-hairline highlight-top space-y-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-hairline pb-4">
          <div>
            <span className="font-label-caps text-xs text-[#f2ca50] tracking-widest uppercase">Audio Setup</span>
            <h1 className="font-headline-sm text-2xl text-[#e5e2e1] mt-1">Input Microphone Calibration</h1>
          </div>
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <p className="font-body-md text-sm text-[#d0c5af] leading-relaxed">
          Play your instrument naturally for 5 seconds to calibrate peak input levels and set the noise-floor threshold.
        </p>

        {/* Level Meter */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-[#d0c5af]">Live Signal Input</span>
            <span className="text-[#f2ca50]">{level}% RMS</span>
          </div>
          <div className="h-4 bg-[#0e0e0e] rounded-lg p-0.5 border border-[#4d4635] flex items-center">
            <div
              className="h-full bg-gradient-brass rounded-md transition-all duration-150"
              style={{ width: `${level}%` }}
            />
          </div>
        </div>

        {/* Noise Floor Threshold Slider */}
        <div className="space-y-2">
          <div className="flex justify-between font-mono text-xs">
            <span className="text-[#d0c5af]">Noise Floor Cutoff</span>
            <span className="text-[#e7c9a6]">{noiseFloor}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="50"
            value={noiseFloor}
            onChange={(e) => setNoiseFloor(Number(e.target.value))}
            className="w-full accent-[#f2ca50] bg-[#0e0e0e] h-2 rounded-lg cursor-pointer"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button className="bg-gradient-brass text-[#3c2f00] font-label-caps px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer">
            Save Calibration
          </button>
        </div>
      </div>
    </div>
  );
};
