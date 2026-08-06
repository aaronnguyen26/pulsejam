'use client';

import React, { useState } from 'react';

export type TrackType = 'midi' | 'audio' | 'ai-companion';

interface AddTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTrack: (trackData: { name: string; type: TrackType; inputSource: string }) => void;
}

export function AddTrackModal({ isOpen, onClose, onAddTrack }: AddTrackModalProps) {
  const [selectedType, setSelectedType] = useState<TrackType>('midi');
  const [trackName, setTrackName] = useState('New Synth Track');
  const [inputSource, setInputSource] = useState('Input 1 (Mic/Inst)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackName.trim()) return;
    onAddTrack({
      name: trackName.trim(),
      type: selectedType,
      inputSource,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in font-sans">
      {/* Add Track Modal Dialog */}
      <div className="bg-[#1e2020] border border-[#4d4635]/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col highlight-top">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#4d4635]/40 flex justify-between items-center bg-[#1a1c1c]">
          <h2 className="font-serif text-xl font-semibold text-[#e3e2e2]">Add Track</h2>
          <button
            onClick={onClose}
            className="text-[#d0c5af] hover:text-[#e3e2e2] transition-colors p-1 rounded-lg hover:bg-[#343535] cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-6">
          {/* Track Type Selection (Bento Cards) */}
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-[#d0c5af] block mb-3 font-bold">
              TRACK TYPE
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* MIDI Track */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('midi');
                  setTrackName('MIDI Synth');
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer h-32 relative overflow-hidden ${
                  selectedType === 'midi'
                    ? 'border-[#f2ca50] bg-[#343535] shadow-[0_0_12px_rgba(242,202,80,0.3)]'
                    : 'border-[#4d4635]/50 bg-[#1a1c1c] hover:bg-[#343535]/60 hover:border-[#99907c]'
                }`}
              >
                <svg
                  className={`w-8 h-8 mb-2 transition-colors ${
                    selectedType === 'midi' ? 'text-[#f2ca50]' : 'text-[#d0c5af]'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M6 5v14M10 5v14M14 5v14M18 5v14" />
                </svg>
                <span
                  className={`font-sans text-sm font-semibold ${
                    selectedType === 'midi' ? 'text-[#f2ca50]' : 'text-[#e3e2e2]'
                  }`}
                >
                  MIDI Track
                </span>
              </button>

              {/* Audio Track */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('audio');
                  setTrackName('Audio Input Track');
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer h-32 relative overflow-hidden ${
                  selectedType === 'audio'
                    ? 'border-[#f2ca50] bg-[#343535] shadow-[0_0_12px_rgba(242,202,80,0.3)]'
                    : 'border-[#4d4635]/50 bg-[#1a1c1c] hover:bg-[#343535]/60 hover:border-[#99907c]'
                }`}
              >
                <svg
                  className={`w-8 h-8 mb-2 transition-colors ${
                    selectedType === 'audio' ? 'text-[#f2ca50]' : 'text-[#d0c5af]'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
                <span
                  className={`font-sans text-sm font-semibold ${
                    selectedType === 'audio' ? 'text-[#f2ca50]' : 'text-[#e3e2e2]'
                  }`}
                >
                  Audio Track
                </span>
              </button>

              {/* AI Companion */}
              <button
                type="button"
                onClick={() => {
                  setSelectedType('ai-companion');
                  setTrackName('AI Companion Layer');
                }}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer h-32 relative overflow-hidden ${
                  selectedType === 'ai-companion'
                    ? 'border-[#f2ca50] bg-[#343535] shadow-[0_0_12px_rgba(242,202,80,0.3)]'
                    : 'border-[#4d4635]/50 bg-[#1a1c1c] hover:bg-[#343535]/60 hover:border-[#99907c]'
                }`}
              >
                <svg
                  className={`w-8 h-8 mb-2 transition-colors ${
                    selectedType === 'ai-companion' ? 'text-[#f2ca50]' : 'text-[#d0c5af]'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <rect x="9" y="9" width="6" height="6" />
                  <line x1="9" y1="1" x2="9" y2="4" />
                  <line x1="15" y1="1" x2="15" y2="4" />
                  <line x1="9" y1="20" x2="9" y2="23" />
                  <line x1="15" y1="20" x2="15" y2="23" />
                </svg>
                <span
                  className={`font-sans text-sm font-semibold ${
                    selectedType === 'ai-companion' ? 'text-[#f2ca50]' : 'text-[#e3e2e2]'
                  }`}
                >
                  AI Companion
                </span>
              </button>
            </div>
          </div>

          {/* Form Fields: Input Source & Track Name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest text-[#d0c5af] block mb-2 font-bold">
                INPUT SOURCE
              </label>
              <select
                value={inputSource}
                onChange={(e) => setInputSource(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#4d4635]/50 rounded-xl px-4 py-2.5 font-mono text-xs text-[#e3e2e2] focus:border-[#f2ca50] focus:ring-1 focus:ring-[#f2ca50] outline-none cursor-pointer"
              >
                <option value="Input 1 (Mic/Inst)">Input 1 (Mic/Inst)</option>
                <option value="Input 2 (Mic/Inst)">Input 2 (Mic/Inst)</option>
                <option value="Internal Synth">Internal Synth</option>
                <option value="Magenta AI Worker">Magenta AI Worker</option>
              </select>
            </div>

            <div>
              <label className="font-mono text-[11px] uppercase tracking-widest text-[#d0c5af] block mb-2 font-bold">
                TRACK NAME
              </label>
              <input
                type="text"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
                placeholder="Enter track title..."
                className="w-full bg-[#0a0a0a] border border-[#4d4635]/50 rounded-xl px-4 py-2 font-mono text-xs text-[#f2ca50] focus:border-[#f2ca50] focus:ring-1 focus:ring-[#f2ca50] outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end items-center gap-3 pt-4 border-t border-[#4d4635]/30">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-mono text-xs text-[#d0c5af] hover:text-[#e3e2e2] hover:bg-[#343535] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-widest bg-[#d4af37] text-[#3c2f00] hover:bg-[#f2ca50] shadow-[0_0_12px_rgba(212,175,55,0.3)] transition-all cursor-pointer active:scale-95"
            >
              Create Track
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
