'use client';

import React, { useState, useEffect } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import { DSPMetrics } from '@/lib/audio/types';
import { useAudioSettingsStore } from '@/lib/state/audioSettingsStore';

interface StudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioEngine: AudioEngine | null;
}

export type SettingsCategory = 'input' | 'general' | 'shortcuts' | 'midi';

export function StudioSettingsModal({
  isOpen,
  onClose,
  audioEngine,
}: StudioSettingsModalProps) {
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('input');
  
  // Zustand Audio Settings Store
  const {
    selectedDeviceId,
    inputGainDb,
    inputMode,
    phantomPower,
    lowCutFilter,
    setSelectedDeviceId,
    setInputGainDb,
    setInputMode,
    setPhantomPower,
    setLowCutFilter,
  } = useAudioSettingsStore();

  // Audio Device List & Live Level Metering State
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [liveVolumeDb, setLiveVolumeDb] = useState<number>(-80);

  // 1. Enumerate Real Devices & Attach Hot-Plug Event Listener
  const refreshDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const inputs = devices.filter((d) => d.kind === 'audioinput');
        setAudioDevices(inputs);
        
        // Auto-select first real device if selectedDeviceId is null
        if (!selectedDeviceId && inputs.length > 0 && inputs[0].deviceId) {
          setSelectedDeviceId(inputs[0].deviceId);
        }
      }
    } catch (err) {
      console.warn('Could not enumerate audio devices:', err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    refreshDevices();

    if (typeof window !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => {
        navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
      };
    }
  }, [isOpen]);

  // 2. Subscribe to AudioEngine live DSP_METRICS for Unified Level Metering
  useEffect(() => {
    if (!isOpen || !audioEngine) return;

    const unsub = audioEngine.subscribeMetrics((metrics: DSPMetrics) => {
      setLiveVolumeDb(metrics.rawRmsDb);
    });

    return () => unsub();
  }, [isOpen, audioEngine]);

  // 3. Unified Test Microphone Action (Routes directly through AudioEngine chain)
  const isMicActive = audioEngine?.getStatus().isMicActive || false;

  const handleToggleTestMic = async () => {
    if (!audioEngine) return;

    if (isMicActive) {
      audioEngine.stopMicrophone();
      setLiveVolumeDb(-80);
    } else {
      const success = await audioEngine.startMicrophone();
      if (!success) {
        alert('Could not start microphone. Check browser permissions and audio device selection.');
      } else {
        refreshDevices(); // Re-fetch device list to capture labels once permission is granted
      }
    }
  };

  if (!isOpen) return null;

  // Level bar percentage calculation (-60 dBFS to 0 dBFS)
  const currentDb = isMicActive ? liveVolumeDb : -80;
  const meterPercentL = Math.min(100, Math.max(0, ((currentDb + 60) / 60) * 100));
  const meterPercentR = Math.min(100, Math.max(0, ((currentDb + 58) / 60) * 100));
  const isPeaking = isMicActive && currentDb > -3;
  const hasLabels = audioDevices.some((d) => d.label && d.label.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#0d0e0f]/85 backdrop-blur-md">
      {/* Settings Overlay Container (Stitch Design Glass Panel) */}
      <div className="w-full max-w-[1024px] min-h-[700px] bg-[#1a1c1c]/90 backdrop-blur-xl border border-[#333333] rounded-xl flex flex-col relative overflow-hidden shadow-2xl">
        {/* Header */}
        <header className="flex justify-between items-center px-6 h-20 w-full border-b border-[#4d4635]/30 sticky top-0 bg-[#121414]/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <svg className="w-7 h-7 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <h1 className="font-serif text-2xl text-[#e3e2e2] font-semibold">Settings</h1>
          </div>
          <button
            onClick={onClose}
            className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-2 rounded-full hover:bg-[#343535] cursor-pointer"
            aria-label="Close Settings"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Main Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Navigation */}
          <nav className="w-64 border-r border-[#4d4635]/30 flex flex-col p-4 gap-2 overflow-y-auto bg-[#0d0e0f]/50 shrink-0">
            <button
              onClick={() => setActiveCategory('input')}
              className={`flex items-center gap-3 px-4 py-3 rounded-r-sm text-left font-mono text-xs uppercase tracking-widest transition-all cursor-pointer ${
                activeCategory === 'input'
                  ? 'bg-[#4a4949]/40 text-[#f2ca50] border-l-2 border-[#f2ca50] font-bold shadow-[0_0_12px_rgba(242,202,80,0.2)]'
                  : 'text-[#d0c5af] hover:bg-[#343535]/50 hover:text-[#e3e2e2]'
              }`}
            >
              <svg className="w-5 h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
              <span>Input & Audio</span>
            </button>

            <button
              onClick={() => setActiveCategory('general')}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm text-left font-mono text-xs uppercase tracking-widest transition-all cursor-pointer ${
                activeCategory === 'general'
                  ? 'bg-[#4a4949]/40 text-[#f2ca50] border-l-2 border-[#f2ca50] font-bold'
                  : 'text-[#d0c5af] hover:bg-[#343535]/50 hover:text-[#e3e2e2]'
              }`}
            >
              <svg className="w-5 h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span>General</span>
            </button>

            <button
              onClick={() => setActiveCategory('shortcuts')}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm text-left font-mono text-xs uppercase tracking-widest transition-all cursor-pointer ${
                activeCategory === 'shortcuts'
                  ? 'bg-[#4a4949]/40 text-[#f2ca50] border-l-2 border-[#f2ca50] font-bold'
                  : 'text-[#d0c5af] hover:bg-[#343535]/50 hover:text-[#e3e2e2]'
              }`}
            >
              <svg className="w-5 h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <line x1="6" y1="8" x2="6.01" y2="8" />
                <line x1="10" y1="8" x2="10.01" y2="8" />
                <line x1="14" y1="8" x2="14.01" y2="8" />
                <line x1="18" y1="8" x2="18.01" y2="8" />
                <line x1="8" y1="16" x2="16" y2="16" />
              </svg>
              <span>Shortcuts</span>
            </button>

            <button
              onClick={() => setActiveCategory('midi')}
              className={`flex items-center gap-3 px-4 py-3 rounded-sm text-left font-mono text-xs uppercase tracking-widest transition-all cursor-pointer ${
                activeCategory === 'midi'
                  ? 'bg-[#4a4949]/40 text-[#f2ca50] border-l-2 border-[#f2ca50] font-bold'
                  : 'text-[#d0c5af] hover:bg-[#343535]/50 hover:text-[#e3e2e2]'
              }`}
            >
              <svg className="w-5 h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
              <span>MIDI Config</span>
            </button>
          </nav>

          {/* Settings Content Panel */}
          <main className="flex-1 p-6 overflow-y-auto">
            {activeCategory === 'input' && (
              <div className="max-w-3xl mx-auto space-y-6">
                {/* Section 1: AUDIO INPUT MODE & SOURCE */}
                <section className="space-y-4">
                  <h2 className="font-mono text-[11px] text-[#d0c5af] font-bold tracking-widest uppercase border-b border-[#4d4635]/20 pb-2">
                    AUDIO INPUT
                  </h2>

                  {/* Mode Selector: Acoustic Mic vs Audio Interface */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <button
                      onClick={() => setInputMode('acoustic')}
                      className={`p-4 rounded-lg border flex flex-col gap-1.5 text-left transition-all cursor-pointer ${
                        inputMode === 'acoustic'
                          ? 'bg-[#1a1c1c] border-[#f2ca50] text-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.2)]'
                          : 'bg-[#1a1c1c]/50 border-[#4d4635]/30 text-[#d0c5af] hover:bg-[#343535]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        </svg>
                        <span>Acoustic Microphone</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#d0c5af]/70 leading-relaxed">
                        Captures room acoustics, vocal phrases & acoustic guitar (Enables noise suppression).
                      </p>
                    </button>

                    <button
                      onClick={() => setInputMode('interface')}
                      className={`p-4 rounded-lg border flex flex-col gap-1.5 text-left transition-all cursor-pointer ${
                        inputMode === 'interface'
                          ? 'bg-[#1a1c1c] border-[#f2ca50] text-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.2)]'
                          : 'bg-[#1a1c1c]/50 border-[#4d4635]/30 text-[#d0c5af] hover:bg-[#343535]/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="4" y="4" width="16" height="16" rx="2" />
                          <circle cx="9" cy="9" r="2" />
                          <circle cx="15" cy="9" r="2" />
                        </svg>
                        <span>Audio Interface (Line-In / High-Z)</span>
                      </div>
                      <p className="font-sans text-[11px] text-[#d0c5af]/70 leading-relaxed">
                        Direct electric guitar or synth signal via USB/XLR interface (Disables DSP filters).
                      </p>
                    </button>
                  </div>

                  {/* Device Dropdown Card (Strictly Enumerate Real Devices) */}
                  <div className="bg-[#1a1c1c]/80 border border-[#333333] p-4 rounded-lg flex flex-col gap-2 shadow-sm">
                    <div className="flex justify-between items-center">
                      <label className="font-mono text-[11px] text-[#c8c6c5] uppercase tracking-wider font-semibold">
                        SOURCE DEVICE
                      </label>
                      {!hasLabels && (
                        <span className="font-mono text-[10px] text-[#ffe088]">
                          Grant microphone access to see device names
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      <select
                        value={selectedDeviceId || ''}
                        onChange={(e) => {
                          const newId = e.target.value || null;
                          setSelectedDeviceId(newId);
                          if (audioEngine) {
                            audioEngine.restartMicrophone();
                          }
                        }}
                        className="w-full bg-[#0a0a0a] border border-[#4d4635]/50 text-[#e3e2e2] font-mono text-xs rounded-sm py-2.5 pl-4 pr-10 appearance-none focus:outline-none focus:border-[#f2ca50] shadow-inner cursor-pointer"
                      >
                        {audioDevices.length === 0 ? (
                          <option value="">No input devices detected</option>
                        ) : (
                          audioDevices.map((dev, idx) => (
                            <option key={dev.deviceId || idx} value={dev.deviceId}>
                              {dev.label || (idx === 0 ? 'Default Input Device (Permission Needed)' : `Audio Input Device ${idx + 1}`)}
                            </option>
                          ))
                        )}
                      </select>
                      <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-[#d0c5af] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </section>

                {/* Section 2: GAIN & LIVE UNIFIED MIC-CHECK METERING */}
                <section className="space-y-4">
                  <h2 className="font-mono text-[11px] text-[#d0c5af] font-bold tracking-widest uppercase border-b border-[#4d4635]/20 pb-2">
                    INPUT GAIN & LIVE MIC CHECK
                  </h2>

                  <div className="bg-[#1a1c1c]/80 border border-[#333333] p-6 rounded-lg flex flex-col md:flex-row gap-6 items-center md:items-start shadow-sm">
                    {/* Gain Knob Section (Drives AudioEngine GainNode in real-time) */}
                    <div className="flex flex-col items-center gap-3 border-r border-[#4d4635]/20 pr-6 shrink-0">
                      <label className="font-mono text-[11px] text-[#c8c6c5] uppercase tracking-wider font-semibold">
                        INPUT GAIN
                      </label>
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#383939] to-[#1a1c1c] shadow-[0_4px_8px_rgba(0,0,0,0.6)] relative flex items-center justify-center border border-white/10">
                        <div
                          className="w-0.5 h-3 bg-[#d4af37] absolute top-1"
                          style={{ transform: `rotate(${(inputGainDb / 36) * 270 - 135}deg)`, transformOrigin: '50% 28px' }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="36"
                        value={inputGainDb}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setInputGainDb(val);
                          if (audioEngine) {
                            audioEngine.setInputGainDb(val);
                          }
                        }}
                        className="w-24 accent-[#f2ca50] cursor-pointer"
                      />
                      <span className="font-mono text-xs text-[#f2ca50] font-bold">
                        +{inputGainDb} dB
                      </span>
                    </div>

                    {/* Level Metering Section (Unified with AudioEngine Worklet Telemetry) */}
                    <div className="flex-1 w-full flex flex-col gap-3">
                      <div className="flex justify-between items-end">
                        <label className="font-mono text-[11px] text-[#c8c6c5] uppercase tracking-wider font-semibold">
                          LEVEL METER (DSP CHAIN)
                        </label>
                        <span className="font-mono text-xs text-[#d0c5af]">
                          {isMicActive ? `${currentDb.toFixed(1)} dBFS` : 'OFFLINE'}
                        </span>
                      </div>

                      {/* Stereo Dual Meters */}
                      <div className="flex flex-col gap-[3px]">
                        {/* Channel L */}
                        <div className="w-full h-3 bg-[#343535] rounded-sm overflow-hidden relative shadow-inner">
                          <div
                            className={`h-full transition-all duration-75 ${
                              isPeaking ? 'bg-[#ffb4ab]' : 'bg-[#d4af37]'
                            }`}
                            style={{ width: `${meterPercentL}%` }}
                          />
                        </div>
                        {/* Channel R */}
                        <div className="w-full h-3 bg-[#343535] rounded-sm overflow-hidden relative shadow-inner">
                          <div
                            className={`h-full transition-all duration-75 ${
                              isPeaking ? 'bg-[#ffb4ab]' : 'bg-[#d4af37]'
                            }`}
                            style={{ width: `${meterPercentR}%` }}
                          />
                        </div>
                      </div>

                      {/* dB Scale */}
                      <div className="flex justify-between font-mono text-[9px] text-[#d0c5af]/50 px-0.5">
                        <span>-60</span>
                        <span>-48</span>
                        <span>-36</span>
                        <span>-24</span>
                        <span>-12</span>
                        <span>0 dBFS</span>
                      </div>

                      {/* Test Microphone CTA Button */}
                      <button
                        onClick={handleToggleTestMic}
                        className={`mt-2 self-start font-mono text-xs font-medium px-5 py-2.5 rounded-sm border transition-all flex items-center gap-2 shadow-md cursor-pointer ${
                          isMicActive
                            ? 'bg-[#d4af37]/20 border-[#f2ca50] text-[#f2ca50] shadow-[0_0_12px_rgba(212,175,55,0.3)] animate-pulse'
                            : 'bg-[#343535] border-[#4d4635]/50 text-[#e3e2e2] hover:bg-[#383939]'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                        </svg>
                        <span>{isMicActive ? 'Listening... Click to Stop' : 'Test Microphone'}</span>
                      </button>
                    </div>
                  </div>
                </section>

                {/* Section 3: PROCESSING TOGGLES */}
                <section className="space-y-4">
                  <h2 className="font-mono text-[11px] text-[#d0c5af] font-bold tracking-widest uppercase border-b border-[#4d4635]/20 pb-2">
                    HARDWARE PROCESSING & FILTERS
                  </h2>

                  <div className="bg-[#1a1c1c]/80 border border-[#333333] rounded-lg grid grid-cols-1 md:grid-cols-2 gap-4 p-4 shadow-sm">
                    {/* Toggle 1: Phantom Power 48V (Informational Toggle Only) */}
                    <div className="flex items-center justify-between p-3 border border-[#4d4635]/20 rounded-sm bg-[#1a1c1c]/50">
                      <div>
                        <div className="font-mono text-xs text-[#e3e2e2]">Phantom Power (48V)</div>
                        {/* Note: 48V Phantom Power is a physical hardware-level function of the audio interface/preamp and cannot be controlled via Web Audio APIs. */}
                        <div className="font-sans text-[10px] text-[#d0c5af]/50">Hardware interface switch</div>
                      </div>
                      <button
                        onClick={() => setPhantomPower(!phantomPower)}
                        className={`w-11 h-6 rounded-full p-[2px] transition-colors cursor-pointer ${
                          phantomPower ? 'bg-[#d4af37]' : 'bg-[#343535]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-[#e3e2e2] transition-transform ${
                            phantomPower ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Toggle 2: Low Cut Filter (Wires to BiquadFilterNode in AudioEngine) */}
                    <div className="flex items-center justify-between p-3 border border-[#4d4635]/20 rounded-sm bg-[#1a1c1c]/50">
                      <div>
                        <div className="font-mono text-xs text-[#e3e2e2]">Low Cut Filter (80Hz)</div>
                        <div className="font-sans text-[10px] text-[#d0c5af]/50">Highpass rumble filter</div>
                      </div>
                      <button
                        onClick={() => {
                          const nextVal = !lowCutFilter;
                          setLowCutFilter(nextVal);
                          if (audioEngine) {
                            audioEngine.setLowCutFilter(nextVal);
                          }
                        }}
                        className={`w-11 h-6 rounded-full p-[2px] transition-colors cursor-pointer ${
                          lowCutFilter ? 'bg-[#d4af37]' : 'bg-[#343535]'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-[#e3e2e2] transition-transform ${
                            lowCutFilter ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}

            {activeCategory === 'general' && (
              <div className="max-w-2xl mx-auto space-y-6 text-left">
                <h2 className="font-mono text-[11px] text-[#d0c5af] font-bold tracking-widest uppercase border-b border-[#4d4635]/20 pb-2">
                  GENERAL PREFERENCES
                </h2>
                <div className="bg-[#1a1c1c]/80 border border-[#333333] rounded-lg p-6 space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#e3e2e2]">Auto-Save Project Takes</span>
                    <span className="text-[#f2ca50] font-bold">ENABLED</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#e3e2e2]">Sample Rate</span>
                    <span className="text-[#f2ca50] font-bold">48.0 kHz</span>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'shortcuts' && (
              <div className="max-w-2xl mx-auto space-y-6 text-left">
                <h2 className="font-mono text-[11px] text-[#d0c5af] font-bold tracking-widest uppercase border-b border-[#4d4635]/20 pb-2">
                  SHORTCUTS
                </h2>
                <div className="bg-[#1a1c1c]/80 border border-[#333333] rounded-lg p-6 space-y-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#d0c5af]">Spacebar</span>
                    <span className="text-[#f2ca50]">Play / Stop Transport</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#d0c5af]">R</span>
                    <span className="text-[#f2ca50]">Toggle Recording</span>
                  </div>
                </div>
              </div>
            )}

            {activeCategory === 'midi' && (
              <div className="max-w-2xl mx-auto space-y-6 text-left">
                <h2 className="font-mono text-[11px] text-[#d0c5af] font-bold tracking-widest uppercase border-b border-[#4d4635]/20 pb-2">
                  MIDI CONFIG
                </h2>
                <div className="bg-[#1a1c1c]/80 border border-[#333333] rounded-lg p-6 space-y-4 font-mono text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-[#e3e2e2]">Magenta.js WASM Engine</span>
                    <span className="text-[#81c784] font-bold">READY (WASM)</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
