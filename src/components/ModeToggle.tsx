'use client';

import React from 'react';

export type AppMode = 'stems' | 'ai-gen';

interface ModeToggleProps {
  mode: AppMode;
  onChange: (mode: AppMode) => void;
}

export const ModeToggle: React.FC<ModeToggleProps> = ({ mode, onChange }) => {
  return (
    <div
      role="group"
      aria-label="Performance mode"
      className="mode-toggle"
    >
      <button
        role="radio"
        aria-checked={mode === 'stems'}
        onClick={() => onChange('stems')}
        className={`mode-toggle-option ${mode === 'stems' ? 'active' : ''}`}
      >
        Stems Mode
      </button>
      <button
        role="radio"
        aria-checked={mode === 'ai-gen'}
        onClick={() => onChange('ai-gen')}
        className={`mode-toggle-option ${mode === 'ai-gen' ? 'active' : ''}`}
      >
        AI Generation
      </button>
    </div>
  );
};
