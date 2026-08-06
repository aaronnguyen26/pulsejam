'use client';

import React, { useEffect, useState } from 'react';

interface WelcomeHomeScreenProps {
  onStartNewSession: () => void;
  onOpenRecentSession: () => void;
  onOpenSettings?: () => void;
}

export function WelcomeHomeScreen({
  onStartNewSession,
  onOpenRecentSession,
  onOpenSettings,
}: WelcomeHomeScreenProps) {
  const [progress, setProgress] = useState(35);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(100);
    }, 400);

    const timer2 = setTimeout(() => {
      setIsReady(true);
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden antialiased bg-[#121414] text-[#e3e2e2] flex flex-col items-center justify-center selection:bg-[#d4af37] selection:text-[#3c2f00]">
      {/* Background Radial Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-1000"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(212, 175, 55, 0.15) 0%, rgba(18, 20, 20, 1) 65%)',
        }}
      />

      {/* Subtle Analog Texture Layer */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* Main Content Container */}
      <main className="z-10 flex flex-col items-center justify-center w-full max-w-4xl px-6 h-full gap-12 relative">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-[#f2ca50] drop-shadow-[0_0_16px_rgba(242,202,80,0.35)]">
            PulseJam <span className="font-light text-[#d0c5af]">AI</span>
          </h1>

          {/* Loading / Ready Indicator */}
          <div className="flex items-center gap-3 mt-4 h-8">
            {!isReady ? (
              <>
                <span className="material-symbols-outlined text-[#f2ca50] text-sm animate-spin">
                  sync
                </span>
                <p className="font-mono text-xs uppercase tracking-widest text-[#d0c5af] animate-pulse">
                  Initializing Studio Environment...
                </p>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[#f2ca50] text-sm drop-shadow-[0_0_8px_rgba(242,202,80,0.6)]">
                  check_circle
                </span>
                <p className="font-mono text-xs uppercase tracking-widest text-[#f2ca50] font-bold">
                  Ready for Recording
                </p>
              </>
            )}
          </div>

          {/* Hardware Progress Bar */}
          <div className="w-64 h-1 mt-4 rounded-full bg-[#343535] overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
            <div
              className="absolute top-0 left-0 h-full bg-[#d4af37] rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(212,175,55,0.6)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-6 mt-6 transition-all duration-700 ease-out ${
            isReady ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2'
          }`}
        >
          <button
            onClick={onStartNewSession}
            className="group relative rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 min-w-[220px] bg-gradient-to-b from-[#343535]/50 to-[#1a1c1c]/80 backdrop-blur-md border border-[#99907c]/30 hover:border-[#f2ca50]/60 shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_0_20px_rgba(242,202,80,0.25)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[#f2ca50] group-hover:scale-110 transition-transform">
              add_circle
            </span>
            <span className="font-mono text-xs text-[#e3e2e2] uppercase tracking-widest font-bold">
              New Session
            </span>
          </button>

          <button
            onClick={onOpenRecentSession}
            className="group relative rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 min-w-[220px] bg-gradient-to-b from-[#343535]/40 to-[#1a1c1c]/60 backdrop-blur-md border border-[#99907c]/20 hover:border-[#d0c5af]/50 hover:bg-[#343535]/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-95"
          >
            <span className="material-symbols-outlined text-[#d0c5af] group-hover:text-[#f2ca50] transition-colors">
              folder_open
            </span>
            <span className="font-mono text-xs text-[#d0c5af] group-hover:text-[#e3e2e2] uppercase tracking-widest transition-colors font-medium">
              Open Recent
            </span>
          </button>
        </div>
      </main>

      {/* Footer Hardware Settings Icon */}
      <div className="absolute bottom-6 right-6 z-20">
        <button
          onClick={onOpenSettings}
          aria-label="Audio Hardware Settings"
          className="w-10 h-10 rounded-full bg-[#292a2a] border border-[#4d4635] flex items-center justify-center text-[#d0c5af] hover:text-[#f2ca50] hover:border-[#f2ca50] transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        >
          <span className="material-symbols-outlined text-sm">tune</span>
        </button>
      </div>
    </div>
  );
}
