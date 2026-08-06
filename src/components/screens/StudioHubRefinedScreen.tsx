'use client';

import React, { useState } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';

interface StudioHubRefinedScreenProps {
  audioEngine: AudioEngine | null;
  onLaunchLiveSession: () => void;
  onOpenCalibration: () => void;
  onOpenLibrary?: () => void;
}

export function StudioHubRefinedScreen({
  audioEngine,
  onLaunchLiveSession,
  onOpenCalibration,
  onOpenLibrary,
}: StudioHubRefinedScreenProps) {
  const [activeTab, setActiveTab] = useState<'studio' | 'sessions' | 'perform'>('studio');
  const isMicActive = audioEngine?.getStatus().isMicActive || false;

  return (
    <div className="flex h-screen overflow-hidden font-sans text-[#e3e2e2] bg-[#121414] antialiased">
      {/* Side Navigation Bar */}
      <nav className="hidden md:flex flex-col h-full py-8 bg-[#1a1c1c] w-64 border-r border-[#4d4635]/40 shrink-0 z-20 shadow-[0_0_12px_rgba(212,175,55,0.1)]">
        {/* Header */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-full bg-[#d4af37] flex items-center justify-center shrink-0 text-[#3c2f00]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 2v20M17 5v14M7 8v8M2 11v2M22 11v2" />
              </svg>
            </div>
            <div>
              <h1 className="font-serif text-2xl text-[#f2ca50] tracking-tight leading-none font-bold">
                PulseJam
              </h1>
              <p className="font-mono text-[10px] text-[#d0c5af] tracking-widest mt-1 uppercase">
                Professional Suite
              </p>
            </div>
          </div>
        </div>

        {/* Primary Navigation */}
        <div className="flex-1 space-y-1 px-3">
          {/* Studio Tab */}
          <button
            onClick={() => setActiveTab('studio')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'studio'
                ? 'bg-[#4a4949]/60 text-[#f2ca50] border-l-4 border-[#f2ca50] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                : 'text-[#d0c5af] hover:bg-[#343535] hover:text-[#e3e2e2]'
            }`}
          >
            <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
            <span>Studio</span>
          </button>

          {/* Sessions Tab */}
          <button
            onClick={() => setActiveTab('sessions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-[#4a4949]/60 text-[#f2ca50] border-l-4 border-[#f2ca50]'
                : 'text-[#d0c5af] hover:bg-[#343535] hover:text-[#e3e2e2]'
            }`}
          >
            <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Sessions</span>
          </button>

          {/* Perform Tab */}
          <button
            onClick={() => setActiveTab('perform')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'perform'
                ? 'bg-[#4a4949]/60 text-[#f2ca50] border-l-4 border-[#f2ca50]'
                : 'text-[#d0c5af] hover:bg-[#343535] hover:text-[#e3e2e2]'
            }`}
          >
            <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5v14M7 8v8M2 11v2M22 11v2" />
            </svg>
            <span>Perform</span>
          </button>
        </div>

        {/* Start Session CTA */}
        <div className="px-6 mt-auto mb-4">
          <button
            onClick={onLaunchLiveSession}
            className="w-full bg-[#d4af37] text-[#3c2f00] font-mono text-xs tracking-widest uppercase font-bold py-3 rounded-lg shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:bg-[#f2ca50] transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span>Start Session</span>
          </button>
        </div>

        {/* Engine Status Tab */}
        <div className="border-t border-[#4d4635]/40 pt-3 px-6">
          <div className="flex items-center gap-2 text-[#d0c5af] font-mono text-[11px]">
            <span
              className={`w-2 h-2 rounded-full ${
                isMicActive ? 'bg-[#f2ca50] animate-ping' : 'bg-[#4d4635]'
              }`}
            />
            <span>Engine: {isMicActive ? 'ACTIVE (48kHz)' : 'IDLE'}</span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {/* Top App Bar */}
        <header className="flex justify-between items-center px-8 h-16 w-full bg-[#121414] border-b border-[#4d4635]/30 z-20 shrink-0">
          <div className="md:hidden flex items-center gap-2">
            <h1 className="font-serif text-xl text-[#f2ca50] font-bold">PulseJam</h1>
          </div>
          <div className="hidden md:block" />

          {/* Action Icons */}
          <div className="flex items-center gap-4">
            <button className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-2 rounded-full hover:bg-[#343535] cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button
              onClick={onOpenCalibration}
              className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-2 rounded-full hover:bg-[#343535] cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
            <div className="w-9 h-9 rounded-full bg-[#343535] border border-[#4d4635] overflow-hidden cursor-pointer ml-2">
              <div className="w-full h-full bg-[#292a2a] flex items-center justify-center text-[#f2ca50] font-bold text-xs font-mono">
                PJ
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Canvas Content */}
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Hero Banner Section */}
            <section className="relative bg-[#0a0a0a] border border-[#4d4635]/50 rounded-3xl p-8 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
              <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 className="font-serif text-3xl md:text-4xl text-[#e3e2e2] font-semibold">
                    Welcome back, <span className="text-[#f2ca50]">Maestro</span>
                  </h2>
                  <p className="font-sans text-sm text-[#d0c5af] mt-2">
                    PulseJam Stage 1 DSP engine is calibrated and ready for multi-track session recording.
                  </p>
                </div>

                <button
                  onClick={onLaunchLiveSession}
                  className="group flex items-center gap-3 bg-[#292a2a] border border-[#4d4635] hover:border-[#f2ca50] px-6 py-3 rounded-full transition-all duration-300 shadow-[0_4px_6px_rgba(0,0,0,0.3)] active:scale-95 cursor-pointer"
                >
                  <div className="w-3 h-3 rounded-full bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.6)] group-hover:bg-[#f2ca50] transition-colors" />
                  <span className="font-mono text-xs text-[#e3e2e2] uppercase tracking-widest font-bold">
                    Resume Last Session
                  </span>
                  <svg className="w-4 h-4 text-[#d0c5af] group-hover:text-[#f2ca50] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </div>
            </section>

            {/* Quick Actions Bento Grid */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bento Card 1: Launch Live Session */}
              <div
                onClick={onLaunchLiveSession}
                className="bg-[#1e2020] border border-[#4d4635]/40 rounded-3xl p-6 relative overflow-hidden group hover:border-[#f2ca50] transition-colors duration-300 cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col min-h-[220px]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-35 transition-opacity">
                  <svg className="w-16 h-16 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  </svg>
                </div>
                <div className="mt-auto relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-[#4d4635] flex items-center justify-center mb-4 group-hover:border-[#f2ca50] transition-all">
                    <svg className="w-5 h-5 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-[#e3e2e2] mb-1 font-semibold">
                    Launch Live Session
                  </h3>
                  <p className="font-sans text-xs text-[#d0c5af]">
                    Initialize real-time audio engine, canvas waveform, and multi-lane MIDI studio.
                  </p>
                </div>
              </div>

              {/* Bento Card 2: Calibrate Instrument */}
              <div
                onClick={onOpenCalibration}
                className="bg-[#1e2020] border border-[#4d4635]/40 rounded-3xl p-6 relative overflow-hidden group hover:border-[#f2ca50] transition-colors duration-300 cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col min-h-[220px]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-35 transition-opacity">
                  <svg className="w-16 h-16 text-[#c8c6c5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="4" y1="21" x2="4" y2="14" />
                    <line x1="4" y1="10" x2="4" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12" y2="3" />
                    <line x1="20" y1="21" x2="20" y2="16" />
                    <line x1="20" y1="12" x2="20" y2="3" />
                  </svg>
                </div>
                <div className="mt-auto relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-[#4d4635] flex items-center justify-center mb-4 group-hover:border-[#f2ca50] transition-all">
                    <svg className="w-5 h-5 text-[#c8c6c5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v20M17 5v14M7 8v8" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-[#e3e2e2] mb-1 font-semibold">
                    Calibrate Instrument
                  </h3>
                  <p className="font-sans text-xs text-[#d0c5af]">
                    Run 2-step acoustic room diagnostics and set noise floor thresholds.
                  </p>
                </div>
              </div>

              {/* Bento Card 3: Master Library */}
              <div
                onClick={onOpenLibrary}
                className="bg-[#1e2020] border border-[#4d4635]/40 rounded-3xl p-6 relative overflow-hidden group hover:border-[#f2ca50] transition-colors duration-300 cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col min-h-[220px]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-35 transition-opacity">
                  <svg className="w-16 h-16 text-[#d0cdcd]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="mt-auto relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-[#4d4635] flex items-center justify-center mb-4 group-hover:border-[#f2ca50] transition-all">
                    <svg className="w-5 h-5 text-[#d0cdcd]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-[#e3e2e2] mb-1 font-semibold">
                    Master Library
                  </h3>
                  <p className="font-sans text-xs text-[#d0c5af]">
                    Browse master tape session recordings and exported stems.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
