'use client';

import React, { useState, useEffect } from 'react';
import { LyriaSessionManager } from '@/lib/lyria/LyriaSessionManager';

interface CloudVibeSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved: () => void;
}

export const CloudVibeSettingsModal: React.FC<CloudVibeSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = LyriaSessionManager.getStoredApiKey();
      setApiKey(stored || '');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      LyriaSessionManager.setStoredApiKey(apiKey.trim());
      setSavedSuccess(true);
      onKeySaved();
      setTimeout(() => {
        onClose();
      }, 800);
    }
  };

  const handleClear = () => {
    LyriaSessionManager.clearStoredApiKey();
    setApiKey('');
    setSavedSuccess(false);
    onKeySaved();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl relative space-y-5"
        style={{
          background: 'var(--col-surface)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        }}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--col-ember)" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h2 id="settings-title" className="text-lg font-bold text-white tracking-tight">
                Cloud Vibe Settings (BYOK)
              </h2>
              <p className="text-xs text-slate-400">
                Google Lyria RealTime Ambient Generative Layer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-lg hover:bg-white/5"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Explicit Billing & Security Warning Box */}
        <div className="rounded-xl p-4 bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>CRITICAL BILLING & SECURITY NOTICE</span>
          </div>
          <p className="leading-relaxed">
            • <strong>Personal Billing</strong>: Enabling Cloud Vibe establishes live WebSocket streaming to Google’s Lyria RealTime model, billed directly to your own Google AI Studio account per Google pricing.
          </p>
          <p className="leading-relaxed">
            • <strong>Local-Only Storage</strong>: Your API key is stored strictly in your browser’s <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">localStorage</code>. It is never transmitted to any external server or backend.
          </p>
          <p className="leading-relaxed text-amber-300/80">
            • <strong>DevTools Visibility</strong>: Because WebSockets connect directly from your browser, the key is visible in client DevTools. In public deployments, every visitor must supply their own key.
          </p>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label htmlFor="google-api-key" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Google AI Studio API Key
            </label>
            <div className="relative flex items-center">
              <input
                id="google-api-key"
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-black/50 border border-white/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                aria-label={showKey ? 'Hide API key' : 'Show API key'}
                className="absolute right-3 text-slate-400 hover:text-white transition cursor-pointer"
              >
                {showKey ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {savedSuccess && (
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              ✓ API key saved to local storage!
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleClear}
              disabled={!apiKey}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 disabled:opacity-40 transition cursor-pointer"
            >
              Clear Key
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-white/5 border border-white/10 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!apiKey.trim()}
                className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 disabled:opacity-40 transition cursor-pointer"
              >
                Save & Enable
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
