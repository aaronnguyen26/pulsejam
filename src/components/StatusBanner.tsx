'use client';

import React from 'react';
import { AudioErrorType } from '@/lib/audio/types';

interface StatusBannerProps {
  errorType: AudioErrorType;
  errorMessage: string | null;
  onDismiss: () => void;
}

const MicBlockedIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23" />
    <path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6" />
    <path d="M17 16.95A7 7 0 015 12v-2m14 0v2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

const NoDeviceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <circle cx="12" cy="14" r="4" />
    <line x1="12" y1="6" x2="12.01" y2="6" strokeWidth="2" />
  </svg>
);

const BrowserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" strokeWidth="2.5" />
  </svg>
);

const CloseIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface ErrorContent {
  icon: React.ReactNode;
  title: string;
  desc: string;
  action?: string;
  color: string;
  bg: string;
  border: string;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ errorType, errorMessage, onDismiss }) => {
  if (!errorType) return null;

  const content: ErrorContent = (() => {
    switch (errorType) {
      case 'PERMISSION_DENIED':
        return {
          icon: <MicBlockedIcon />,
          title: 'Microphone access blocked',
          desc:  'Click the lock icon in your browser address bar, set Microphone to "Allow", then reload this page.',
          action: 'Open browser settings',
          color: '#fbbf24',
          bg:    'rgba(245,158,11,0.06)',
          border:'rgba(245,158,11,0.2)',
        };
      case 'NO_DEVICE':
        return {
          icon: <NoDeviceIcon />,
          title: 'No microphone found',
          desc:  'Connect your audio interface or mic, then click Start again. If you\'re using an external interface, make sure it\'s selected as the system input.',
          color: '#94a3b8',
          bg:    'rgba(148,163,184,0.05)',
          border:'rgba(148,163,184,0.15)',
        };
      case 'NOT_SUPPORTED':
        return {
          icon: <BrowserIcon />,
          title: 'Browser not supported',
          desc:  'PulseJam needs AudioWorklet support. Use Chrome, Edge, or Firefox. Safari works from version 14.1 on macOS.',
          color: '#94a3b8',
          bg:    'rgba(148,163,184,0.05)',
          border:'rgba(148,163,184,0.15)',
        };
      default:
        return {
          icon: <ErrorIcon />,
          title: 'Something went wrong with audio',
          desc:  errorMessage || 'An error occurred while starting the audio engine. Try reloading the page.',
          color: 'var(--col-surge)',
          bg:    'rgba(255,45,110,0.06)',
          border:'rgba(255,45,110,0.2)',
        };
    }
  })();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl flex items-start gap-4 p-4"
      style={{
        background: content.bg,
        border: `1px solid ${content.border}`,
      }}
    >
      <div
        className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-lg"
        style={{ color: content.color, background: `${content.bg}`, border: `1px solid ${content.border}` }}
        aria-hidden="true"
      >
        {content.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-semibold mb-0.5"
          style={{ color: content.color }}
        >
          {content.title}
        </p>
        <p className="text-sm text-slate-400 leading-relaxed">
          {content.desc}
        </p>
      </div>

      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 text-slate-500 hover:text-slate-300 transition cursor-pointer p-1 rounded"
      >
        <CloseIcon />
      </button>
    </div>
  );
};
