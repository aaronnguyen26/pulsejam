'use client';

import React from 'react';

/**
 * Screen Component: PulseJam Library
 * Extracted from Stitch MCP screen '089fbdf9751441d48ac7475902bccc81'
 * Master tapes project & stem track browser using DESIGN.md warm brass tokens.
 */
export const LibraryScreen: React.FC = () => {
  const tracks = [
    { title: 'Funk Groove A Minor', bpm: 128, key: 'Am', duration: '3:45', tier: 'Groove' },
    { title: 'Chill Jazz Lounge', bpm: 90, key: 'Cmaj7', duration: '4:12', tier: 'Chill' },
    { title: 'Peak Synth Rock Solo', bpm: 145, key: 'Em', duration: '2:50', tier: 'Peak' },
  ];

  return (
    <div className="bg-[#131313] text-[#e5e2e1] min-h-screen p-4 md:p-8 font-body-md space-y-6">
      <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-label-caps text-xs text-[#f2ca50] tracking-widest uppercase">Master Tapes</span>
          <h1 className="font-headline-sm text-2xl md:text-3xl text-[#e5e2e1] mt-1">PulseJam Stems Library</h1>
        </div>
        <button className="bg-gradient-brass text-[#3c2f00] font-label-caps px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer">
          + Import Stems
        </button>
      </div>

      <div className="glass-panel p-6 rounded-2xl border border-hairline highlight-top space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tracks.map((t) => (
            <div key={t.title} className="p-5 rounded-xl bg-[#1c1b1b] border border-[#4d4635] hover:border-[#f2ca50] transition-all space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-xs text-[#e7c9a6]">{t.tier} Tier</span>
                <span className="font-mono text-xs text-[#d0c5af]">{t.duration}</span>
              </div>
              <h3 className="font-headline-sm text-lg text-[#e5e2e1]">{t.title}</h3>
              <div className="font-mono text-xs text-[#d0c5af] flex justify-between pt-2 border-t border-hairline">
                <span>{t.bpm} BPM</span>
                <span>Key: {t.key}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
