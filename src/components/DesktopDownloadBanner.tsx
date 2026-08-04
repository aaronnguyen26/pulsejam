'use client';

import React, { useState } from 'react';

export const DesktopDownloadBanner: React.FC = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  if (isDismissed) return null;

  return (
    <section
      aria-label="macOS Standalone Desktop App Download"
      className="rack-module rounded-2xl p-4 border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 via-black/40 to-black/40 relative overflow-hidden"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left App Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--col-ice)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-tight">
                PulseJam Desktop App for macOS
              </h3>
              <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded uppercase">
                v0.1.0 (.dmg)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Native macOS webview wrapper with direct hardware mic access & low-latency AudioWorklet DSP.
            </p>
          </div>
        </div>

        {/* Right Download Button & Guide Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGuide((v) => !v)}
            aria-expanded={showGuide}
            className="text-xs text-slate-300 hover:text-white underline font-mono cursor-pointer"
          >
            {showGuide ? 'Hide macOS Guide' : 'macOS First-Launch Steps'}
          </button>

          <a
            href="https://github.com/aaronnguyen26/pulsejam/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold font-mono text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Download .dmg</span>
          </a>

          <button
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss banner"
            className="text-slate-500 hover:text-slate-300 transition cursor-pointer p-1"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expanded Gatekeeper Bypass Instructions (F-22) */}
      {showGuide && (
        <div className="mt-4 pt-3 border-t border-white/10 text-xs text-slate-300 space-y-3 animate-fade-in">
          <div className="flex items-center gap-2 text-amber-300 font-semibold font-mono">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>First-Time Launching on macOS (Unsigned Build Gatekeeper Guide)</span>
          </div>

          <p className="leading-relaxed text-slate-400">
            Because this standalone desktop package is intentionally built unsigned, macOS Gatekeeper will show a standard safety prompt on first launch. Follow these 3 simple steps to launch:
          </p>

          <ol className="list-decimal list-inside space-y-1.5 font-mono text-slate-300 bg-black/40 rounded-xl p-3 border border-white/5">
            <li>Open the downloaded <code className="text-cyan-300">PulseJam_0.1.0_x64.dmg</code> installer and drag <strong>PulseJam.app</strong> to your <strong>Applications</strong> folder.</li>
            <li>In Applications, <strong>Right-Click</strong> (or Control-Click) <strong>PulseJam.app</strong> and click <strong>Open</strong> from the contextual menu.</li>
            <li>Click <strong>Open</strong> in the confirmation dialog. *(This one-time step bypasses Gatekeeper for all future double-click launches).*</li>
          </ol>

          {/* Visual Step Diagram */}
          <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-cyan-300 bg-black/60 p-2.5 rounded-lg border border-cyan-500/20 text-center">
            <span>[1] Right-Click PulseJam.app</span>
            <span>➔</span>
            <span>[2] Select "Open"</span>
            <span>➔</span>
            <span className="text-emerald-400 font-bold">[3] Confirm "Open" in Dialog</span>
          </div>
        </div>
      )}
    </section>
  );
};
