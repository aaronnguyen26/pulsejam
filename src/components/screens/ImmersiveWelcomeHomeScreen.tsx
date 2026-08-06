'use client';

import React, { useEffect, useState } from 'react';

interface ImmersiveWelcomeHomeScreenProps {
  onStartSession: () => void;
  onOpenStudioHub: () => void;
  onOpenCalibration: () => void;
}

export function ImmersiveWelcomeHomeScreen({
  onStartSession,
  onOpenStudioHub,
  onOpenCalibration,
}: ImmersiveWelcomeHomeScreenProps) {
  const [progress, setProgress] = useState(45);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setProgress(100), 500);
    const t2 = setTimeout(() => setIsReady(true), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden antialiased bg-[#0a0a0a] text-[#e3e2e2] flex flex-col items-center justify-center selection:bg-[#d4af37] selection:text-[#3c2f00]">
      {/* Radial Studio Glow Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50 transition-opacity duration-1000"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(212, 175, 55, 0.18) 0%, rgba(10, 10, 10, 1) 70%)',
        }}
      />

      {/* Analog Noise Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")',
        }}
      />

      {/* Main Container */}
      <main className="z-10 flex flex-col items-center justify-center w-full max-w-4xl px-6 h-full gap-12 relative text-center">
        {/* Title */}
        <div className="flex flex-col items-center justify-center gap-3">
          <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tight text-[#f2ca50] drop-shadow-[0_0_24px_rgba(242,202,80,0.4)]">
            PulseJam <span className="font-light text-[#d0c5af]">AI</span>
          </h1>

          {/* Initialization / Ready Badge */}
          <div className="flex items-center gap-3 mt-4 h-8">
            {!isReady ? (
              <>
                <svg
                  className="w-4 h-4 text-[#f2ca50] animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                <p className="font-mono text-xs uppercase tracking-widest text-[#d0c5af] animate-pulse">
                  Initializing Studio Environment...
                </p>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-[#f2ca50] drop-shadow-[0_0_8px_rgba(242,202,80,0.8)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <p className="font-mono text-xs uppercase tracking-widest text-[#f2ca50] font-bold">
                  Ready for Recording
                </p>
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-64 h-1 mt-4 rounded-full bg-[#343535] overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <div
              className="absolute top-0 left-0 h-full bg-[#d4af37] rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(212,175,55,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div
          className={`flex flex-col sm:flex-row gap-6 mt-4 transition-all duration-700 ease-out ${
            isReady ? 'opacity-100 translate-y-0' : 'opacity-60 translate-y-2'
          }`}
        >
          {/* Start Session */}
          <button
            onClick={onStartSession}
            className="group relative rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 min-w-[220px] bg-gradient-to-b from-[#343535]/60 to-[#1a1c1c]/90 backdrop-blur-md border border-[#99907c]/30 hover:border-[#f2ca50]/70 shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_0_24px_rgba(242,202,80,0.3)] active:scale-95 cursor-pointer"
          >
            <svg
              className="w-5 h-5 fill-[#f2ca50] group-hover:scale-110 transition-transform"
              viewBox="0 0 24 24"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span className="font-mono text-xs text-[#e3e2e2] uppercase tracking-widest font-bold">
              Start Session
            </span>
          </button>

          {/* Studio Hub */}
          <button
            onClick={onOpenStudioHub}
            className="group relative rounded-xl px-8 py-4 flex items-center justify-center gap-3 transition-all duration-300 min-w-[220px] bg-gradient-to-b from-[#343535]/40 to-[#1a1c1c]/70 backdrop-blur-md border border-[#99907c]/20 hover:border-[#d0c5af]/50 hover:bg-[#343535]/60 shadow-[0_8px_24px_rgba(0,0,0,0.5)] active:scale-95 cursor-pointer"
          >
            <svg
              className="w-5 h-5 text-[#d0c5af] group-hover:text-[#f2ca50] transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="font-mono text-xs text-[#d0c5af] group-hover:text-[#e3e2e2] uppercase tracking-widest transition-colors font-medium">
              Studio Hub
            </span>
          </button>

          {/* Calibrate */}
          <button
            onClick={onOpenCalibration}
            className="group relative rounded-xl px-6 py-4 flex items-center justify-center gap-2 transition-all duration-300 bg-transparent border border-[#4d4635]/50 hover:border-[#f2ca50]/50 hover:bg-[#343535]/30 active:scale-95 cursor-pointer"
          >
            <svg
              className="w-4 h-4 text-[#d0c5af] group-hover:text-[#f2ca50] transition-colors"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span className="font-mono text-xs text-[#d0c5af] group-hover:text-[#e3e2e2] uppercase tracking-widest font-medium">
              Calibrate
            </span>
          </button>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="absolute bottom-6 left-8 right-8 flex justify-between items-center font-mono text-[11px] text-[#d0c5af]/60 z-20">
        <span>PULSEJAM AI // IMMERSIVE STUDIO</span>
        <span>48kHz ZERO LATENCY</span>
      </footer>
    </div>
  );
}
