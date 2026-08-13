'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import {
  AIAudioStreamMetrics,
  AudioEngineStatus,
  DSPMetrics,
  PerformanceTier,
  SidecarStatus,
} from '@/lib/audio/types';
import { AddTrackModal, TrackType } from '@/components/AddTrackModal';
import { useAudioSettingsStore } from '@/lib/state/audioSettingsStore';
import { AIGenerationMonitor } from '@/components/AIGenerationMonitor';

export interface DynamicTrackLane {
  id: string;
  name: string;
  trackLabel: string;
  icon: 'mic' | 'memory' | 'keyboard' | 'music_note';
  type: 'audio' | 'ai-companion' | 'custom';
  isMuted: boolean;
  isSoloed: boolean;
  isArmed: boolean;
}

interface MultiLaneMIDIStudioScreenProps {
  audioEngine: AudioEngine | null;
  onOpenCalibration: () => void;
  onOpenSettings?: () => void;
  onNavigateBack?: () => void;
}

export function MultiLaneMIDIStudioScreen({
  audioEngine,
  onOpenCalibration,
  onOpenSettings,
  onNavigateBack,
}: MultiLaneMIDIStudioScreenProps) {
  // Initial Stage 2 Track Setup (Live Input + Single AI Companion MRT2 Audio Track)
  const [tracks, setTracks] = useState<DynamicTrackLane[]>([
    {
      id: 'live-input-lane',
      name: 'Live Input',
      trackLabel: 'AUDIO TRACK 01',
      icon: 'mic',
      type: 'audio',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
    },
    {
      id: 'ai-companion-lane',
      name: 'AI Companion',
      trackLabel: 'MRT2 AUDIO TRACK 02',
      icon: 'memory',
      type: 'ai-companion',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
    },
  ]);

  // Mix Gain Controls (micGain defaults to 0.0 to prevent acoustic feedback unless headphones are used)
  const [micGain, setMicGain] = useState<number>(0.0);
  const [aiGain, setAiGain] = useState<number>(1.0);


  // In-Memory Live Audio Take & Waveform State
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [waveformDisplay, setWaveformDisplay] = useState<number[]>([]);

  // Telemetry & Audio Stream State
  const [aiStreamMetrics, setAiStreamMetrics] = useState<AIAudioStreamMetrics | null>(null);
  const [sidecarStatusState, setSidecarStatusState] = useState<SidecarStatus>({ state: 'unavailable' });
  const [liveConfidenceState, setLiveConfidenceState] = useState<number>(0);
  const [liveConditioningModeState, setLiveConditioningModeState] = useState<'midi+audio' | 'audio-only'>('midi+audio');
  const [activeTierState, setActiveTierState] = useState<PerformanceTier>('chill');
  const previousTierRef = useRef<PerformanceTier | null>(null);

  // Transport & Audio Status State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);

  // MediaRecorder & Scrub References
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveWaveformBufferRef = useRef<number[]>([]);

  const playheadRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const scrubTimeRef = useRef<number>(0);
  const isDraggingPlayheadRef = useRef<boolean>(false);

  const PIXELS_PER_SECOND = 60;

  // Timeline scrub math
  const calculateTimeFromX = (clientX: number): number => {
    if (!timelineScrollRef.current) return 0;
    const rect = timelineScrollRef.current.getBoundingClientRect();
    const xInViewport = clientX - rect.left;
    const contentX = xInViewport + timelineScrollRef.current.scrollLeft;
    return Math.max(0, contentX / PIXELS_PER_SECOND);
  };

  const updatePlayheadPosition = (timeSec: number) => {
    const clampedTime = Math.max(0, timeSec);
    scrubTimeRef.current = clampedTime;
    setRecordingSeconds(Math.floor(clampedTime));
    if (playheadRef.current) {
      playheadRef.current.style.transform = `translateX(${clampedTime * PIXELS_PER_SECOND}px)`;
    }
  };

  const handleScrubStart = (clientX: number) => {
    isDraggingPlayheadRef.current = true;
    const targetTime = calculateTimeFromX(clientX);
    updatePlayheadPosition(targetTime);

    if (isPlaying || isRecording) {
      const audioCtx = audioEngine?.getAudioContext();
      const currentAudioTime = audioCtx ? audioCtx.currentTime : performance.now() / 1000;
      sessionStartTimeRef.current = currentAudioTime - targetTime;
    }
  };

  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    handleScrubStart(e.clientX);

    const onMouseMove = (moveEvt: MouseEvent) => {
      if (!isDraggingPlayheadRef.current) return;
      const targetTime = calculateTimeFromX(moveEvt.clientX);
      updatePlayheadPosition(targetTime);

      if (isPlaying || isRecording) {
        const audioCtx = audioEngine?.getAudioContext();
        const currentAudioTime = audioCtx ? audioCtx.currentTime : performance.now() / 1000;
        sessionStartTimeRef.current = currentAudioTime - targetTime;
      }
    };

    const onMouseUp = () => {
      isDraggingPlayheadRef.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // 60fps Playhead Position & Auto-Scroll Loop
  useEffect(() => {
    if (!isRecording && !isPlaying) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      sessionStartTimeRef.current = null;
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${scrubTimeRef.current * PIXELS_PER_SECOND}px)`;
      }
      return;
    }

    const audioCtx = audioEngine?.getAudioContext();
    if (sessionStartTimeRef.current === null) {
      const currentAudioTime = audioCtx ? audioCtx.currentTime : performance.now() / 1000;
      sessionStartTimeRef.current = currentAudioTime - scrubTimeRef.current;
    }

    const tick = () => {
      const currentAudioTime = audioEngine?.getAudioContext()?.currentTime ?? (performance.now() / 1000);
      const startAudioTime = sessionStartTimeRef.current ?? currentAudioTime;
      const elapsedSec = Math.max(0, currentAudioTime - startAudioTime);

      scrubTimeRef.current = elapsedSec;
      setRecordingSeconds(Math.floor(elapsedSec));

      const playheadLeftPx = elapsedSec * PIXELS_PER_SECOND;

      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${playheadLeftPx}px)`;
      }

      if (timelineScrollRef.current && !isDraggingPlayheadRef.current) {
        const viewportWidth = timelineScrollRef.current.clientWidth;
        const pinThresholdPx = Math.round(viewportWidth * 0.22);
        if (playheadLeftPx > pinThresholdPx) {
          timelineScrollRef.current.scrollLeft = playheadLeftPx - pinThresholdPx;
        }
      }

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isRecording, isPlaying, audioEngine]);

  // Audio Engine Subscriptions (Metrics & Status)
  useEffect(() => {
    if (!audioEngine) return;

    const unsubStatus = audioEngine.subscribeStatus((st: AudioEngineStatus) => {
      setErrorMessage(st.errorMessage);
    });

    const unsubMetrics = audioEngine.subscribeMetrics((metrics: DSPMetrics) => {
      if (metrics.activeTier !== previousTierRef.current) {
        previousTierRef.current = metrics.activeTier;
        setActiveTierState(metrics.activeTier);
      }
      if (metrics.pitchConfidence !== undefined) {
        setLiveConfidenceState(Math.round(metrics.pitchConfidence * 100));
      }

      const amp = metrics.peakAmplitude ?? Math.min(1.0, Math.max(0.05, (metrics.rawRmsDb + 60) / 60));
      liveWaveformBufferRef.current.push(amp);
      if (liveWaveformBufferRef.current.length > 300) {
        liveWaveformBufferRef.current.shift();
      }
    });

    const unsubAIAudio = audioEngine.subscribeAIAudioMetrics((m) => {
      setAiStreamMetrics(m);
    });

    const bridge = audioEngine.getConditioningBridge();
    let unsubSidecar: (() => void) | undefined;
    let unsubFrames: (() => void) | undefined;
    if (bridge) {
      unsubSidecar = bridge.subscribeSidecarStatus((st) => setSidecarStatusState(st));
      unsubFrames = bridge.subscribeFrames((frame) => {
        setLiveConditioningModeState(frame.mode);
      });
    }

    return () => {
      unsubStatus();
      unsubMetrics();
      unsubAIAudio();
      if (unsubSidecar) unsubSidecar();
      if (unsubFrames) unsubFrames();
    };
  }, [audioEngine]);

  // 60fps Live Waveform Animation Loop
  useEffect(() => {
    let animFrameId: number;
    if (isRecording || isPlaying) {
      const renderLoop = () => {
        setWaveformDisplay([...liveWaveformBufferRef.current]);
        animFrameId = requestAnimationFrame(renderLoop);
      };
      animFrameId = requestAnimationFrame(renderLoop);
    } else if (liveWaveformBufferRef.current.length > 0) {
      setWaveformDisplay([...liveWaveformBufferRef.current]);
    }
    return () => cancelAnimationFrame(animFrameId);
  }, [isRecording, isPlaying]);

  // Mixer Gain Changes
  const handleMicGainChange = (val: number) => {
    setMicGain(val);
    if (audioEngine) audioEngine.setMicMixGain(val);
  };

  const handleAiGainChange = (val: number) => {
    setAiGain(val);
    if (audioEngine) audioEngine.setAIAudioMixGain(val);
  };

  // Mute / Solo Toggles
  const handleToggleMute = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextMuted = !t.isMuted;
          if (t.type === 'audio' && audioEngine) {
            audioEngine.setMicMixGain(nextMuted ? 0 : micGain);
          } else if (t.type === 'ai-companion' && audioEngine) {
            audioEngine.setAIAudioMixGain(nextMuted ? 0 : aiGain);
          }
          return { ...t, isMuted: nextMuted };
        }
        return t;
      })
    );
  };

  const handleToggleSolo = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isSoloed: !t.isSoloed } : t))
    );
  };

  const handleToggleArm = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isArmed: !t.isArmed } : t))
    );
  };

  // Recording Controls
  const handleStartRecording = async () => {
    if (!audioEngine) return;
    if (isRecording) {
      stopRecordingSession();
      return;
    }

    setErrorMessage(null);
    setIsPlaying(false);
    recordedChunksRef.current = [];
    liveWaveformBufferRef.current = [];

    try {
      const success = await audioEngine.startMicrophone();
      if (!success) return;

      const stream = audioEngine.getMicStream();
      if (stream && typeof MediaRecorder !== 'undefined') {
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      }

      setIsRecording(true);
    } catch (err: unknown) {
      setIsRecording(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Microphone recording error: ${msg}`);
    }
  };

  const stopRecordingSession = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : 'audio/wav';
          const audioBlob = new Blob(recordedChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(audioBlob);
          setRecordedAudioUrl(url);
          if (playbackAudioRef.current) {
            playbackAudioRef.current.src = url;
          }
        }
      };
      mediaRecorderRef.current.stop();
    }
  };

  const handlePlayTransport = () => {
    if (isRecording) stopRecordingSession();
    if (isPlaying) {
      handleStopTransport();
      return;
    }

    setIsPlaying(true);
    if (recordedAudioUrl && playbackAudioRef.current) {
      playbackAudioRef.current.currentTime = scrubTimeRef.current;
      playbackAudioRef.current.play().catch((err) => console.warn('Audio playback error:', err));
    }
  };

  const handleStopTransport = () => {
    if (isRecording) stopRecordingSession();
    if (!isPlaying && !isRecording) {
      updatePlayheadPosition(0);
      return;
    }
    setIsPlaying(false);
    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }
  };

  const handleAddTrackSubmit = (trackData: { name: string; type: TrackType }) => {
    const newTrack: DynamicTrackLane = {
      id: `custom-${Date.now()}`,
      name: trackData.name,
      trackLabel: `AUDIO TRACK 0${tracks.length + 1}`,
      icon: trackData.type === 'audio' ? 'mic' : 'memory',
      type: trackData.type === 'audio' ? 'audio' : 'custom',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
    };
    setTracks([...tracks, newTrack]);
  };

  const formatTimecode = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `00:${pad(mins)}:${pad(secs)}:00`;
  };

  return (
    <div className="bg-[#121414] text-[#e3e2e2] font-sans min-h-screen flex flex-col antialiased">
      <audio ref={playbackAudioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* Top Header */}
      <header className="bg-[#0d0e0f] text-[#f2ca50] border-b border-[#4d4635]/40 flex justify-between items-center h-12 px-6 w-full z-50 shrink-0">
        <div className="flex items-center gap-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-1 rounded-full cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div className="font-mono text-xs font-bold tracking-widest text-[#f2ca50] uppercase">
            PulseJam Stage 2 — Single MRT2 Audio Stream Studio
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[#d0c5af] hover:text-[#f2ca50] p-2 rounded-full cursor-pointer"
              title="Studio Settings"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          <button
            onClick={onOpenCalibration}
            className="text-[#d0c5af] hover:text-[#f2ca50] p-2 rounded-full cursor-pointer"
            title="Recalibrate Acoustic Levels"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Studio Timeline */}
      <main className="flex-grow flex flex-col relative pt-4 pb-12 px-6 gap-4 overflow-y-auto">
        {/* Track Container */}
        <div className="flex bg-[#1a1c1c] border border-[#4d4635]/30 rounded-lg overflow-hidden shadow-sm relative">
          {/* Left Column: Track Sidebars */}
          <div className="w-56 bg-[#292a2a] border-r border-[#4d4635]/30 flex flex-col shrink-0 z-30">
            <div className="h-8 bg-[#1f2020] border-b border-[#4d4635]/30 px-3 flex items-center text-[10px] font-mono font-bold text-[#d0c5af]/70 uppercase tracking-wider">
              TRACK CONTROL & MIXER
            </div>

            {tracks.map((track) => (
              <div key={`sidebar-${track.id}`} className="h-32 p-3 flex flex-col justify-between border-b border-[#4d4635]/20 bg-[#292a2a]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {track.icon === 'mic' ? (
                      <svg className="w-4 h-4 text-[#f2ca50]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M6 8h4v8H6zM14 8h4v8h-4z" />
                      </svg>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-[#e3e2e2] font-mono">{track.name}</h4>
                      <p className="text-[9px] text-[#d0c5af]/60 font-mono">{track.trackLabel}</p>
                    </div>
                  </div>

                  {/* Track Buttons M/S/REC */}
                  <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                    <button
                      onClick={() => handleToggleMute(track.id)}
                      className={`w-5 h-5 rounded ${track.isMuted ? 'bg-[#93000a] text-white' : 'bg-[#1a1c1c] text-[#d0c5af]'}`}
                    >
                      M
                    </button>
                    <button
                      onClick={() => handleToggleSolo(track.id)}
                      className={`w-5 h-5 rounded ${track.isSoloed ? 'bg-[#f2ca50] text-[#3c2f00]' : 'bg-[#1a1c1c] text-[#d0c5af]'}`}
                    >
                      S
                    </button>
                  </div>
                </div>

                {/* Mixer Gain Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>MIX GAIN</span>
                    <span>{track.type === 'audio' ? `${Math.round(micGain * 100)}%` : `${Math.round(aiGain * 100)}%`}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={track.type === 'audio' ? micGain : aiGain}
                    onChange={(e) =>
                      track.type === 'audio'
                        ? handleMicGainChange(parseFloat(e.target.value))
                        : handleAiGainChange(parseFloat(e.target.value))
                    }
                    className="w-full h-1 bg-black/40 rounded-lg appearance-none cursor-pointer accent-[#f2ca50]"
                  />
                  {track.type === 'audio' && (
                    <p className="text-[8px] font-mono text-amber-400/90 truncate mt-0.5" title="Live monitoring — use headphones to avoid acoustic feedback">
                      🎧 Live monitoring (use headphones)
                    </p>
                  )}
                </div>
              </div>

            ))}
          </div>

          {/* Right Column: Timeline & Waveform Visualization Canvas */}
          <div ref={timelineScrollRef} className="flex-grow overflow-x-auto relative bg-[#121414]">
            {/* Playhead Marker */}
            <div
              ref={playheadRef}
              onMouseDown={handlePlayheadMouseDown}
              className="absolute top-0 bottom-0 w-0.5 bg-[#f2ca50] z-40 cursor-ew-resize"
            >
              <div className="w-3 h-3 bg-[#f2ca50] rotate-45 -translate-x-1.25 -translate-y-1.5 shadow-md" />
            </div>

            {/* Timeline Bar Numbers Header */}
            <div className="h-8 bg-[#1f2020] border-b border-[#4d4635]/30 flex items-center font-mono text-[9px] text-[#d0c5af]/50">
              {Array.from({ length: 32 }).map((_, barIdx) => (
                <div key={`bar-${barIdx}`} className="w-[120px] shrink-0 border-r border-[#4d4635]/20 pl-2">
                  BAR {barIdx + 1}
                </div>
              ))}
            </div>

            {/* Track Lanes Visualization */}
            {tracks.map((track) => (
              <div key={`lane-${track.id}`} className="h-32 border-b border-[#4d4635]/20 relative flex items-center px-4">
                {track.type === 'audio' ? (
                  /* Live Mic Waveform Render */
                  <div className="w-full h-20 bg-black/30 rounded-lg border border-white/5 p-2 flex items-center gap-1 overflow-hidden">
                    {waveformDisplay.length === 0 ? (
                      <span className="text-xs font-mono text-slate-500 italic">Live Mic Signal Standby…</span>
                    ) : (
                      waveformDisplay.map((amp, idx) => (
                        <div
                          key={`amp-${idx}`}
                          style={{ height: `${Math.max(4, amp * 100)}%` }}
                          className="w-1 bg-[#f2ca50]/80 rounded-full transition-all duration-75"
                        />
                      ))
                    )}
                  </div>
                ) : (
                  /* AI Companion MRT2 Waveform & Level Meter Visualization */
                  <div className="w-full h-20 bg-black/30 rounded-lg border border-cyan-500/20 p-3 flex flex-col justify-between">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-cyan-300 font-bold">MRT2 CONTINUOUS STREAM</span>
                      <span className="text-slate-400">
                        STATUS: <strong className="text-emerald-400">{aiStreamMetrics?.state.toUpperCase() || 'IDLE'}</strong>
                      </span>
                    </div>

                    {/* Buffer Level Meter / Waveform Simulation Bars */}
                    <div className="flex items-center gap-1 h-8">
                      {Array.from({ length: 40 }).map((_, bIdx) => {
                        const activeBars = Math.min(40, Math.floor((aiStreamMetrics?.bufferDepthChunks || 0) * 8));
                        const isActive = bIdx < activeBars;
                        return (
                          <div
                            key={`bar-meter-${bIdx}`}
                            className={`flex-1 rounded-sm transition-all duration-150 ${
                              isActive
                                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)] h-6'
                                : 'bg-white/10 h-2'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stage 2 MRT2 Real-Time Stream Monitor Component */}
        <AIGenerationMonitor
          sidecarStatus={sidecarStatusState}
          aiStreamMetrics={aiStreamMetrics}
          onResetReceiver={() => audioEngine?.getAIAudioReceiver().reset()}
        />

      </main>

      {/* Bottom Transport Toolbar */}
      <nav className="bg-[#0d0e0f] border-t border-[#4d4635]/40 h-16 fixed bottom-0 left-0 right-0 z-50 px-6 flex items-center justify-between">
        <div className="flex items-center gap-4 font-mono text-xs text-amber-400 font-bold">
          <span>{formatTimecode(recordingSeconds)}</span>
        </div>

        {/* Transport Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePlayTransport}
            className={`px-4 py-2 rounded font-mono text-xs font-bold uppercase transition cursor-pointer ${
              isPlaying ? 'bg-[#f2ca50] text-[#3c2f00]' : 'bg-[#1a1c1c] text-[#d0c5af] hover:bg-[#383939]'
            }`}
          >
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>

          <button
            onClick={handleStopTransport}
            className="px-4 py-2 rounded font-mono text-xs font-bold uppercase bg-[#1a1c1c] text-[#d0c5af] hover:bg-[#383939] cursor-pointer"
          >
            STOP
          </button>

          <button
            onClick={handleStartRecording}
            className={`px-4 py-2 rounded font-mono text-xs font-bold uppercase transition cursor-pointer ${
              isRecording ? 'bg-[#93000a] text-white animate-pulse' : 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/40 hover:bg-[#93000a]/40'
            }`}
          >
            {isRecording ? 'REC...' : 'RECORD'}
          </button>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="text-slate-400">
            TIER: <strong className="text-amber-400 font-bold">{activeTierState.toUpperCase()}</strong>
          </span>
        </div>
      </nav>

      <AddTrackModal
        isOpen={isAddTrackOpen}
        onClose={() => setIsAddTrackOpen(false)}
        onAddTrack={handleAddTrackSubmit}
      />
    </div>
  );
}
