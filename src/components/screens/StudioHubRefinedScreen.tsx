'use client';

import React, { useState } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { SessionsScreen } from './SessionsScreen';
import { PerformLiveScreen } from './PerformLiveScreen';
import { AssetsLibraryScreen } from './AssetsLibraryScreen';

interface StudioHubRefinedScreenProps {
  audioEngine: AudioEngine | null;
  onLaunchLiveSession: () => void;
  onOpenCalibration: () => void;
  onOpenSettings?: () => void;
  onOpenLibrary?: () => void;
}

export function StudioHubRefinedScreen({
  audioEngine,
  onLaunchLiveSession,
  onOpenCalibration,
  onOpenSettings,
  onOpenLibrary,
}: StudioHubRefinedScreenProps) {
  const [activeTab, setActiveTab] = useState<'studio' | 'sessions' | 'perform' | 'assets'>('studio');
  const isMicActive = audioEngine?.getStatus().isMicActive || false;

  return (
    <div className="flex h-screen overflow-hidden font-sans text-[#e3e2e2] bg-[#121414] antialiased selection:bg-[#d4af37] selection:text-[#3c2f00] relative">
      {/* Side Navigation Bar */}
      <nav className="hidden md:flex flex-col h-full py-6 bg-[#1a1c1c] w-64 border-r border-[#4d4635]/40 shrink-0 z-20 shadow-[0_0_16px_rgba(0,0,0,0.5)]">
        {/* Header Logo */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3 mb-1">
            <img
              src="/pulsejam_app_logo.jpg"
              alt="PulseJam AI Logo"
              className="w-8 h-8 rounded-lg border border-[#f2ca50]/40 shadow-[0_0_12px_rgba(242,202,80,0.3)] object-cover shrink-0"
            />
            <div>
              <h1 className="font-serif text-2xl text-[#f2ca50] tracking-tight leading-none font-bold">
                Pulsejam
              </h1>
              <p className="font-mono text-[10px] text-[#d0c5af] tracking-widest mt-1 uppercase">
                Professional Suite
              </p>
            </div>
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <div className="flex-1 space-y-1">
          {/* Studio Tab */}
          <button
            onClick={() => setActiveTab('studio')}
            className={`w-full flex items-center gap-3 px-6 py-3.5 font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer relative ${
              activeTab === 'studio'
                ? 'bg-[#4a4949]/50 text-[#f2ca50] border-l-4 border-[#f2ca50] font-bold shadow-[0_0_12px_rgba(212,175,55,0.2)]'
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
            className={`w-full flex items-center gap-3 px-6 py-3.5 font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-[#4a4949]/50 text-[#f2ca50] border-l-4 border-[#f2ca50] font-bold'
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
            className={`w-full flex items-center gap-3 px-6 py-3.5 font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'perform'
                ? 'bg-[#4a4949]/50 text-[#f2ca50] border-l-4 border-[#f2ca50] font-bold'
                : 'text-[#d0c5af] hover:bg-[#343535] hover:text-[#e3e2e2]'
            }`}
          >
            <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span>Perform</span>
          </button>

          {/* Assets Tab */}
          <button
            onClick={() => {
              setActiveTab('assets');
              if (onOpenLibrary) onOpenLibrary();
            }}
            className={`w-full flex items-center gap-3 px-6 py-3.5 font-mono text-xs tracking-widest uppercase transition-all duration-150 cursor-pointer ${
              activeTab === 'assets'
                ? 'bg-[#4a4949]/50 text-[#f2ca50] border-l-4 border-[#f2ca50] font-bold'
                : 'text-[#d0c5af] hover:bg-[#343535] hover:text-[#e3e2e2]'
            }`}
          >
            <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span>Assets</span>
          </button>
        </div>

        {/* Start Session CTA Button */}
        <div className="px-6 mt-auto mb-4">
          <button
            onClick={onLaunchLiveSession}
            className="w-full bg-[#d4af37] text-[#3c2f00] font-mono text-xs tracking-widest uppercase font-bold py-3.5 rounded-lg shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:bg-[#f2ca50] transition-colors duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span>Start Session</span>
          </button>
        </div>

        {/* Footer: Engine Status */}
        <div className="border-t border-[#4d4635]/40 pt-3 px-6">
          <div className="flex items-center gap-2 text-[#d0c5af] font-mono text-[11px]">
            <svg className="w-4 h-4 text-[#d0c5af]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isMicActive ? 'bg-[#f2ca50] animate-ping' : 'bg-[#81c784]'
                }`}
              />
              Engine: {isMicActive ? 'ACTIVE (48kHz)' : 'READY'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-0">
        {activeTab === 'sessions' ? (
          <SessionsScreen audioEngine={audioEngine} onLaunchStudio={onLaunchLiveSession} />
        ) : activeTab === 'perform' ? (
          <PerformLiveScreen audioEngine={audioEngine} onExitStage={() => setActiveTab('studio')} />
        ) : activeTab === 'assets' ? (
          <AssetsLibraryScreen audioEngine={audioEngine} onLaunchStudio={onLaunchLiveSession} />
        ) : (
          <>
            {/* Top App Bar */}
            <header className="flex justify-between items-center px-8 h-16 w-full bg-[#121414] border-b border-[#4d4635]/40 z-20 shrink-0">
              <div className="md:hidden flex items-center gap-2">
                <img
                  src="/pulsejam_app_logo.jpg"
                  alt="PulseJam AI Logo"
                  className="w-7 h-7 rounded-lg border border-[#f2ca50]/40 object-cover"
                />
                <h1 className="font-serif text-xl text-[#f2ca50] font-bold">Pulsejam</h1>
              </div>
              <div className="hidden md:block" />

              {/* Top Actions: Notifications, Settings, Profile */}
              <div className="flex items-center gap-4">
                <button
                  className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-2 rounded-full hover:bg-[#343535] cursor-pointer"
                  title="Notifications"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>

                <button
                  onClick={onOpenSettings}
                  className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-2 rounded-full hover:bg-[#343535] cursor-pointer"
                  title="Studio Settings & Mic Check"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </button>

                {/* Profile Avatar */}
                <div className="w-9 h-9 rounded-full bg-[#343535] border border-[#4d4635] overflow-hidden cursor-pointer ml-2">
                  <div className="w-full h-full bg-[#292a2a] flex items-center justify-center text-[#f2ca50] font-bold text-xs font-mono">
                    PJ
                  </div>
                </div>
              </div>
            </header>

            {/* Scrollable Canvas Content */}
            <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-6xl mx-auto space-y-8 pb-16">
                {/* Hero Section */}
                <section className="relative bg-[#0a0a0a] border border-[#4d4635]/50 rounded-3xl p-8 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#343535]/20 to-transparent pointer-events-none" />
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
                  className="group flex items-center gap-3 bg-[#292a2a] border border-[#4d4635] hover:border-[#f2ca50] px-6 py-3.5 rounded-full transition-all duration-300 shadow-[0_4px_6px_rgba(0,0,0,0.5)] active:scale-95 cursor-pointer shrink-0"
                >
                  <div className="w-3 h-3 rounded-full bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.6)] group-hover:bg-[#f2ca50] group-hover:shadow-[0_0_12px_rgba(242,202,80,0.4)] transition-colors" />
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

            {/* Quick Actions Bento Grid (3 Cards) */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Launch Live Session */}
              <div
                onClick={onLaunchLiveSession}
                className="bg-[#1e2020] border border-[#4d4635]/40 rounded-3xl p-6 relative overflow-hidden group hover:border-[#f2ca50] transition-colors duration-300 cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col min-h-[220px]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-35 transition-opacity pointer-events-none">
                  <svg className="w-16 h-16 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
                    <path d="M12 6v12M6 12h12" />
                  </svg>
                </div>
                <div className="mt-auto relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-[#4d4635]/50 flex items-center justify-center mb-4 shadow-md group-hover:shadow-[0_0_12px_rgba(242,202,80,0.3)] transition-all">
                    <svg className="w-6 h-6 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-[#e3e2e2] font-semibold mb-1">
                    Launch Live Session
                  </h3>
                  <p className="font-sans text-xs text-[#d0c5af] leading-relaxed">
                    Initialize realtime audio engine and DSP rack.
                  </p>
                </div>
              </div>

              {/* Card 2: Calibrate Instrument */}
              <div
                onClick={onOpenCalibration}
                className="bg-[#1e2020] border border-[#4d4635]/40 rounded-3xl p-6 relative overflow-hidden group hover:border-[#f2ca50] transition-colors duration-300 cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col min-h-[220px]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-35 transition-opacity pointer-events-none">
                  <svg className="w-16 h-16 text-[#c8c6c5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div className="mt-auto relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-[#4d4635]/50 flex items-center justify-center mb-4 shadow-md group-hover:border-[#f2ca50] transition-all">
                    <svg className="w-6 h-6 text-[#c8c6c5] group-hover:text-[#f2ca50] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 11V3M1 14h6M9 8h6M17 16h6" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-[#e3e2e2] font-semibold mb-1">
                    Calibrate Instrument
                  </h3>
                  <p className="font-sans text-xs text-[#d0c5af] leading-relaxed">
                    Run diagnostics and set input impedance profiles.
                  </p>
                </div>
              </div>

              {/* Card 3: Browse Library */}
              <div
                onClick={onOpenLibrary}
                className="bg-[#1e2020] border border-[#4d4635]/40 rounded-3xl p-6 relative overflow-hidden group hover:border-[#f2ca50] transition-colors duration-300 cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] flex flex-col min-h-[220px]"
              >
                <div className="absolute top-0 right-0 p-6 opacity-15 group-hover:opacity-35 transition-opacity pointer-events-none">
                  <svg className="w-16 h-16 text-[#d0cdcd]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </div>
                <div className="mt-auto relative z-10">
                  <div className="w-12 h-12 rounded-2xl bg-[#0a0a0a] border border-[#4d4635]/50 flex items-center justify-center mb-4 shadow-md group-hover:border-[#f2ca50] transition-all">
                    <svg className="w-6 h-6 text-[#d0cdcd] group-hover:text-[#f2ca50] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <h3 className="font-serif text-xl text-[#e3e2e2] font-semibold mb-1">
                    Browse Library
                  </h3>
                  <p className="font-sans text-xs text-[#d0c5af] leading-relaxed">
                    Access stems, masters, and preset configurations.
                  </p>
                </div>
              </div>
            </section>

            {/* Recent Activity Section */}
            <section className="bg-[#0a0a0a] border border-[#4d4635]/40 rounded-2xl p-6 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-[#4d4635]/30 pb-4 mb-4">
                <h3 className="font-mono text-xs text-[#d0c5af] uppercase tracking-widest font-bold">
                  Recent Takes
                </h3>
                <button
                  onClick={onOpenLibrary}
                  className="text-[#f2ca50] hover:text-[#ffe088] transition-colors font-mono text-xs cursor-pointer"
                >
                  View All →
                </button>
              </div>

              <div className="space-y-3">
                {/* Take Item 1 */}
                <div
                  onClick={onLaunchLiveSession}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-[#292a2a] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1c1c] border border-[#4d4635]/50 flex items-center justify-center shadow-md text-amber-400 font-bold">
                      🎸
                    </div>
                    <div>
                      <h4 className="font-sans text-sm text-[#e3e2e2] font-medium group-hover:text-[#f2ca50] transition-colors">
                        Analog Synth Bass - Take 04
                      </h4>
                      <p className="font-mono text-[11px] text-[#d0c5af]/60 mt-0.5">
                        Project: Neon Skyline • 2 hours ago
                      </p>
                    </div>
                  </div>

                  {/* Mini Waveform Visualization Block */}
                  <div className="hidden md:flex w-32 h-8 bg-[#121414] rounded border border-[#4d4635]/30 items-center justify-between px-2 overflow-hidden">
                    <div className="w-1 h-3 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-5 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-7 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-4 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-6 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-8 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-5 bg-[#f2ca50] rounded-full" />
                    <div className="w-1 h-3 bg-[#f2ca50] rounded-full" />
                  </div>
                </div>

                {/* Take Item 2 */}
                <div
                  onClick={onLaunchLiveSession}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-[#292a2a] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1c1c] border border-[#4d4635]/50 flex items-center justify-center shadow-md">
                      <svg className="w-5 h-5 text-[#c8c6c5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-sans text-sm text-[#e3e2e2] font-medium group-hover:text-[#f2ca50] transition-colors">
                        Lead Vocal - Comp A
                      </h4>
                      <p className="font-mono text-[11px] text-[#d0c5af]/60 mt-0.5">
                        Project: Acoustic Sessions • Yesterday
                      </p>
                    </div>
                  </div>

                  <div className="hidden md:flex w-32 h-8 bg-[#121414] rounded border border-[#4d4635]/30 items-center justify-between px-2 overflow-hidden">
                    <div className="w-1 h-4 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-6 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-3 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-7 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-4 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-5 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-3 bg-[#c8c6c5] rounded-full" />
                    <div className="w-1 h-2 bg-[#c8c6c5] rounded-full" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </main>
      </>
    )}
  </div>

      {/* Floating Bottom-Right Settings FAB Button */}
      <button
        onClick={onOpenSettings}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 flex items-center justify-center rounded-full bg-[#292a2a]/90 backdrop-blur-md border border-[#4d4635]/60 text-[#d0c5af] hover:text-[#f2ca50] hover:border-[#f2ca50] hover:shadow-[0_0_16px_rgba(242,202,80,0.4)] transition-all duration-300 active:scale-95 shadow-2xl cursor-pointer"
        title="Open Studio Settings"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </div>
  );
}
