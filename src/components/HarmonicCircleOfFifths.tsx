'use client';

import React from 'react';
import { ChordEstimate } from '@/lib/audio/types';

interface HarmonicCircleOfFifthsProps {
  currentKey: string; // e.g. "A Minor" or "C Major"
  chordEstimate: ChordEstimate | null;
  isOpen: boolean;
  onClose: () => void;
}

const FIFTHS_MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const FIFTHS_MINOR = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'D#m', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

export const HarmonicCircleOfFifths: React.FC<HarmonicCircleOfFifthsProps> = ({
  currentKey,
  chordEstimate,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const keyParts = currentKey.split(' ');
  const tonic = keyParts[0] || 'C';
  const isMinor = (keyParts[1] || 'Major').toLowerCase().includes('minor');

  // Calculate angle for 12 positions
  const radiusOuter = 95;
  const radiusInner = 65;
  const center = 120;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#18191b] border border-[#4d4635]/50 rounded-2xl p-6 max-w-lg w-full shadow-2xl relative text-[#e3e2e2]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#4d4635]/30">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎼</span>
            <div>
              <h2 className="font-mono text-sm font-bold tracking-wider text-[#f2ca50] uppercase">
                Harmonic Circle of Fifths & Modal Guide
              </h2>
              <p className="text-[11px] text-[#d0c5af]/60 font-mono">
                Live Key Detection & Solo Scale Recommendations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#d0c5af]/60 hover:text-white p-1 rounded-full hover:bg-white/5 transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Circle Diagram & Telemetry Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center my-6">
          {/* SVG Circle of Fifths Wheel */}
          <div className="flex justify-center items-center">
            <svg width="240" height="240" viewBox="0 0 240 240" className="select-none">
              {/* Outer Glow Ring */}
              <circle cx={center} cy={center} r={radiusOuter + 14} fill="none" stroke="#232425" strokeWidth="1" />
              <circle cx={center} cy={center} r={radiusInner - 12} fill="#121314" stroke="#333" strokeWidth="1" />

              {/* Major Keys (Outer Ring) */}
              {FIFTHS_MAJOR.map((note, index) => {
                const angle = (index * 30 - 90) * (Math.PI / 180);
                const x = center + radiusOuter * Math.cos(angle);
                const y = center + radiusOuter * Math.sin(angle);
                const isSelected = (!isMinor && note === tonic) || (chordEstimate?.rootNoteName === note);

                return (
                  <g key={`maj-${note}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={14}
                      fill={isSelected ? '#f2ca50' : '#232425'}
                      stroke={isSelected ? '#fff' : '#3d3e40'}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all duration-300"
                    />
                    <text
                      x={x}
                      y={y + 4}
                      textAnchor="middle"
                      fill={isSelected ? '#121314' : '#e3e2e2'}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {note}
                    </text>
                  </g>
                );
              })}

              {/* Minor Keys (Inner Ring) */}
              {FIFTHS_MINOR.map((note, index) => {
                const angle = (index * 30 - 90) * (Math.PI / 180);
                const x = center + radiusInner * Math.cos(angle);
                const y = center + radiusInner * Math.sin(angle);
                const isSelected = (isMinor && note.replace('m', '') === tonic) || (chordEstimate?.chordSymbol === note);

                return (
                  <g key={`min-${note}`}>
                    <circle
                      cx={x}
                      cy={y}
                      r={11}
                      fill={isSelected ? '#38bdf8' : '#1c1d1e'}
                      stroke={isSelected ? '#fff' : '#333'}
                      strokeWidth={isSelected ? 1.5 : 1}
                      className="transition-all duration-300"
                    />
                    <text
                      x={x}
                      y={y + 3}
                      textAnchor="middle"
                      fill={isSelected ? '#0c2738' : '#a1a1aa'}
                      fontSize="8"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {note}
                    </text>
                  </g>
                );
              })}

              {/* Center Key Badge */}
              <text
                x={center}
                y={center - 3}
                textAnchor="middle"
                fill="#f2ca50"
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {currentKey}
              </text>
              <text
                x={center}
                y={center + 11}
                textAnchor="middle"
                fill="#888"
                fontSize="8"
                fontFamily="monospace"
              >
                TONIC CENTER
              </text>
            </svg>
          </div>

          {/* Harmonic Telemetry & Solo Advice */}
          <div className="space-y-3 font-mono text-xs">
            {/* Live Chord Badge */}
            <div className="bg-[#1f2022] p-3 rounded-lg border border-[#4d4635]/30">
              <div className="flex items-center justify-between">
                <span className="text-[#d0c5af]/60 text-[10px]">CURRENT CHORD:</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                  DEGREE: {chordEstimate?.romanNumeral || 'I'}
                </span>
              </div>
              <div className="text-xl font-bold text-[#f2ca50] mt-1">
                {chordEstimate?.chordSymbol || tonic}
              </div>
              <div className="text-[10px] text-[#d0c5af]/70 mt-0.5">
                Quality: {chordEstimate?.quality || 'Major'} | Confidence: {Math.round((chordEstimate?.confidence || 0.8) * 100)}%
              </div>
            </div>

            {/* Scale Soloing Recommendations */}
            <div className="bg-[#1f2022] p-3 rounded-lg border border-[#4d4635]/30">
              <div className="text-[#d0c5af]/60 text-[10px] uppercase font-bold mb-1.5 flex items-center gap-1">
                <span>🎸 Recommended Solo Scales:</span>
              </div>
              <ul className="space-y-1 text-[11px] text-emerald-300">
                {(chordEstimate?.recommendedScales || [
                  `${tonic} Pentatonic`,
                  `${tonic} Dorian`,
                  `${tonic} Blues Scale`,
                ]).map((scale, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-emerald-500">▶</span>
                    <span>{scale}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#4d4635]/20 flex items-center justify-between text-[10px] font-mono text-[#d0c5af]/50">
          <span>Updates in real time from live instrument DSP</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#2a2b2d] hover:bg-[#383a3d] text-white transition cursor-pointer font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
