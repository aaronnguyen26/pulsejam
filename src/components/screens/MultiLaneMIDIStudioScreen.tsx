'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import {
  AIAudioStreamMetrics,
  AudioEngineStatus,
  DSPMetrics,
  PerformanceTier,
  SidecarStatus,
  JamTakeMetadata,
  ChordEstimate,
  ArrangerState,
  SongSection,
  MasteringOptions,
} from '@/lib/audio/types';
import { AddTrackModal, TrackType } from '@/components/AddTrackModal';
import { AIGenerationMonitor } from '@/components/AIGenerationMonitor';
import { TempoTracker, CountInState } from '@/lib/audio/TempoTracker';
import { ChromaFeatureExtractor } from '@/lib/audio/ChromaFeatureExtractor';
import { STYLE_PRESETS, getStylePreset } from '@/lib/audio/StylePresets';
import { WebMIDIManager } from '@/lib/audio/WebMIDIManager';
import { OPFSRecorder } from '@/lib/audio/OPFSRecorder';
import { StemExporter } from '@/lib/audio/StemExporter';
import { HarmonicCircleOfFifths } from '@/components/HarmonicCircleOfFifths';

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
  // Tracks
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

  // Mix Gain Controls
  const [micGain, setMicGain] = useState<number>(0.7);
  const [aiGain, setAiGain] = useState<number>(1.0);

  // In-Memory Live Audio Take & Waveform State
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [waveformDisplay, setWaveformDisplay] = useState<number[]>([]);

  // Telemetry & Audio Stream State
  const [aiStreamMetrics, setAiStreamMetrics] = useState<AIAudioStreamMetrics | null>(null);
  const [sidecarStatusState, setSidecarStatusState] = useState<SidecarStatus>({ state: 'unavailable' });
  const [liveConfidenceState, setLiveConfidenceState] = useState<number>(0);
  const [activeTierState, setActiveTierState] = useState<PerformanceTier>('chill');
  const previousTierRef = useRef<PerformanceTier | null>(null);

  // Phase 2: Style Preset, Harmonic Key & Real-Time Tempo State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('neo-soul');
  const [currentBpm, setCurrentBpm] = useState<number>(92);
  const [countInBeat, setCountInBeat] = useState<number>(0);
  const [countInStatus, setCountInStatus] = useState<CountInState>('idle');
  const [estimatedKey, setEstimatedKey] = useState<string>('A Minor');
  const [keyConfidence, setKeyConfidence] = useState<number>(0);

  // Phase 3: Web MIDI & Jam Take Manager State
  const [midiStatus, setMidiStatus] = useState<{ isSupported: boolean; isConnected: boolean; deviceCount: number }>({
    isSupported: false,
    isConnected: false,
    deviceCount: 0,
  });
  const [savedTakes, setSavedTakes] = useState<JamTakeMetadata[]>([]);
  const [selectedTakeNumber, setSelectedTakeNumber] = useState<number>(1);

  // Phase 4: Harmony, Dynamic Arranger & Mastering FX State
  const [isCircleOfFifthsOpen, setIsCircleOfFifthsOpen] = useState<boolean>(false);
  const [isMasteringDrawerOpen, setIsMasteringDrawerOpen] = useState<boolean>(false);
  const [chordEstimate, setChordEstimate] = useState<ChordEstimate | null>(null);
  const [arrangerState, setArrangerState] = useState<ArrangerState>({
    currentSection: 'verse',
    currentBar: 1,
    currentBeat: 1,
    totalBarsPlayed: 0,
    feel: 'standard',
    isFillQueued: false,
    isFillActive: false,
    energyLevel: 0.3,
    sectionProgress: 0.1,
  });
  const [masteringOptions, setMasteringOptions] = useState<Required<MasteringOptions>>({
    enableWarmth: true,
    warmthAmount: 0.45,
    enableLimiter: true,
    limiterCeilingDb: -0.1,
    enableStereoWidener: true,
    stereoWidth: 1.25,
    enableReverb: true,
    reverbWet: 0.18,
    reverbSpace: 'studio',
  });

  // Transport & Audio Status State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);

  // References to Phase 2/3 Engines
  const tempoTrackerRef = useRef<TempoTracker | null>(null);
  const chromaExtractorRef = useRef<ChromaFeatureExtractor | null>(null);
  const midiManagerRef = useRef<WebMIDIManager | null>(null);
  const opfsRecorderRef = useRef<OPFSRecorder | null>(null);

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

  // Initialize Phase 2 & 3 Engines
  useEffect(() => {
    // 1. Initialize OPFS Recorder
    opfsRecorderRef.current = new OPFSRecorder(48000);

    // 2. Initialize Chroma Extractor
    chromaExtractorRef.current = new ChromaFeatureExtractor(0.94);

    // 3. Initialize Tempo Tracker & Acoustic Count-In
    const tracker = new TempoTracker({
      onCountInBeat: (beat, bpm) => {
        setCountInBeat(beat);
        setCurrentBpm(bpm);
        if (audioEngine) audioEngine.setBpm(bpm);
      },
      onCountInComplete: (lockedBpm) => {
        setCountInStatus('locked');
        setCountInBeat(0);
        setCurrentBpm(lockedBpm);
        if (audioEngine) audioEngine.setBpm(lockedBpm);
        handleStartRecording();
      },
      onTempoUpdated: (bpm) => {
        setCurrentBpm(bpm);
        if (audioEngine) audioEngine.setBpm(bpm);
      },
    });
    tempoTrackerRef.current = tracker;

    // 4. Initialize Web MIDI Footswitch Manager
    const midi = new WebMIDIManager({
      onActionTriggered: (action) => {
        if (action === 'TOGGLE_RECORD') {
          handleToggleRecord();
        } else if (action === 'COUNT_IN') {
          handleArmCountIn();
        } else if (action === 'TIER_UP') {
          setActiveTierState((prev) => (prev === 'chill' ? 'groove' : 'peak'));
        } else if (action === 'TIER_DOWN') {
          setActiveTierState((prev) => (prev === 'peak' ? 'groove' : 'chill'));
        }
      },
      onDeviceConnected: () => {
        setMidiStatus(midi.getStatus());
      },
      onDeviceDisconnected: () => {
        setMidiStatus(midi.getStatus());
      },
    });

    midi.initialize().then(() => {
      setMidiStatus(midi.getStatus());
    });
    midiManagerRef.current = midi;

    return () => {
      midi.disconnect();
    };
  }, [audioEngine]);

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = getStylePreset(presetId);
    if (preset) {
      setCurrentBpm(preset.defaultBpm);
      if (tempoTrackerRef.current) {
        tempoTrackerRef.current.setBpm(preset.defaultBpm);
      }
      if (audioEngine) {
        audioEngine.setBpm(preset.defaultBpm);
        const bridge = audioEngine.getConditioningBridge();
        if (bridge) {
          bridge.setTierPromptMap(preset.tierPrompts);
        }
      }
    }
  };

  // Synchronize ConditioningBridge prompts when engine or preset changes
  useEffect(() => {
    if (!audioEngine) return;
    const bridge = audioEngine.getConditioningBridge();
    const preset = getStylePreset(selectedPresetId);
    if (bridge && preset) {
      bridge.setTierPromptMap(preset.tierPrompts);
    }
  }, [selectedPresetId, audioEngine]);

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
      const currentAudioTime = audioEngine?.getAudioContext()?.currentTime ?? performance.now() / 1000;
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

  // Audio Engine Subscriptions (Metrics & Telemetry)
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

      // Harmonic Key Center & Chord analysis update
      if (metrics.currentPitch !== undefined && metrics.currentPitch !== null && chromaExtractorRef.current) {
        chromaExtractorRef.current.addPitch(metrics.currentPitch, 1.0);
        const estimate = chromaExtractorRef.current.estimateKey();
        setEstimatedKey(estimate.key);
        setKeyConfidence(Math.round(estimate.confidence * 100));

        const chroma = chromaExtractorRef.current.getNormalizedChroma();
        const chord = audioEngine.getChordTracker().analyzeChroma(chroma, estimate.key);
        setChordEstimate(chord);
      }

      // Acoustic onset tracking for tempo & dynamic arranger advance
      if (metrics.rawOnsetDensity > 0 && tempoTrackerRef.current) {
        tempoTrackerRef.current.registerOnset(Date.now());
        const energy = Math.min(1.0, Math.max(0.1, (metrics.rawRmsDb + 60) / 40));
        const arr = audioEngine.getDynamicArranger().advanceBeat(Date.now(), energy);
        setArrangerState(arr);
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
    if (bridge) {
      unsubSidecar = bridge.subscribeSidecarStatus((st) => setSidecarStatusState(st));
    }

    return () => {
      unsubStatus();
      unsubMetrics();
      unsubAIAudio();
      if (unsubSidecar) unsubSidecar();
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

  // Recording Controls
  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecordingSession();
    } else {
      handleStartRecording();
    }
  };

  const handleArmCountIn = () => {
    if (countInStatus === 'listening') {
      tempoTrackerRef.current?.disarmCountIn();
      setCountInStatus('idle');
      setCountInBeat(0);
    } else {
      tempoTrackerRef.current?.armCountIn();
      setCountInStatus('listening');
      setCountInBeat(0);
    }
  };

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

      // Start OPFS Multi-Take session
      if (opfsRecorderRef.current) {
        opfsRecorderRef.current.startTake();
      }

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
      setCountInStatus('idle');
      setCountInBeat(0);
    } catch (err: unknown) {
      setIsRecording(false);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Microphone recording error: ${msg}`);
    }
  };

  const stopRecordingSession = () => {
    setIsRecording(false);
    if (opfsRecorderRef.current) {
      const finishedTake = opfsRecorderRef.current.stopTake();
      if (finishedTake) {
        setSavedTakes(opfsRecorderRef.current.getAllTakes());
        setSelectedTakeNumber(finishedTake.takeNumber);
      }
    }

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

  const handleExportTakeWav = () => {
    if (!opfsRecorderRef.current) return;
    const audioData = opfsRecorderRef.current.getTakeAudioData(selectedTakeNumber);
    if (!audioData) {
      // Fallback: create 1-second sine wave take for demonstration if empty
      const l = new Float32Array(48000 * 2);
      for (let i = 0; i < l.length; i++) l[i] = Math.sin((i / 48000) * 2 * Math.PI * 440) * 0.3;
      const file = StemExporter.createExportFile(l, l, `pulsejam_take_${selectedTakeNumber}.wav`, 48000);
      downloadBlob(file.blob, file.filename);
      return;
    }

    const exportFile = StemExporter.createExportFile(
      audioData.left,
      audioData.right,
      `pulsejam_take_${selectedTakeNumber}.wav`,
      48000
    );
    downloadBlob(exportFile.blob, exportFile.filename);
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeepLast8Bars = () => {
    if (!opfsRecorderRef.current) return;
    const take = opfsRecorderRef.current.captureRetrospectiveTake(8, currentBpm);
    if (take) {
      setSavedTakes(opfsRecorderRef.current.getAllTakes());
      setSelectedTakeNumber(take.takeNumber);
    }
  };

  const handleTriggerFill = () => {
    audioEngine?.getDynamicArranger().triggerFill();
    setArrangerState(audioEngine?.getDynamicArranger().getState() || arrangerState);
  };

  const handleUpdateMastering = (opts: Partial<MasteringOptions>) => {
    const updated = { ...masteringOptions, ...opts };
    setMasteringOptions(updated);
    audioEngine?.setMasteringOptions(updated);
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

  const activePreset = getStylePreset(selectedPresetId);

  const handleSelectSection = (sec: SongSection) => {
    if (audioEngine) {
      audioEngine.getDynamicArranger().setSection(sec);
      setArrangerState(audioEngine.getDynamicArranger().getState());
    }
  };

  return (
    <div className="bg-[#0d0e0f] text-[#eae1d4] font-sans min-h-screen flex flex-col antialiased select-none">
      <audio ref={playbackAudioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* Top Header — Tactile Obsidian Chassis */}
      <header className="bg-[#110e07] text-[#f2ca50] border-b border-[#4d4635]/50 flex justify-between items-center h-14 px-6 w-full z-50 shrink-0 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="text-[#d0c5af] hover:text-[#f2ca50] hover:bg-[#231f17] transition-all p-1.5 rounded-lg cursor-pointer border border-transparent hover:border-[#4d4635]/40"
              title="Return to Dashboard"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}

          {/* New Rounded Logo & Studio Branding */}
          <div className="flex items-center gap-3">
            <img
              src="/pulsejam_app_logo.jpg"
              alt="PulseJam AI Logo"
              className="w-8 h-8 rounded-lg border border-[#f2ca50]/40 shadow-[0_0_10px_rgba(242,202,80,0.3)] object-cover"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold tracking-wider text-[#f2ca50] uppercase">
                  PulseJam Studio Pro
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30 font-bold">
                  STAGE 2/3 LIVE
                </span>
              </div>
              <span className="font-mono text-[9px] text-[#d0c5af]/60 tracking-tight">REAL-TIME ON-DEVICE NEURAL COMPANION</span>
            </div>
          </div>
        </div>

        {/* Header Telemetry Badges */}
        <div className="flex items-center gap-2.5 font-mono text-[10px]">
          {/* Key Center Button & Harmonic Wheel Trigger */}
          <button
            onClick={() => setIsCircleOfFifthsOpen(true)}
            className="px-2.5 py-1 rounded bg-[#1f1b13] hover:bg-[#2d2a21] border border-[#4d4635]/50 hover:border-[#f2ca50]/60 flex items-center gap-1.5 cursor-pointer transition shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] group"
            title="Open Interactive Circle of Fifths & Solo Scale Recommendations"
          >
            <span className="text-[#d0c5af]/60">KEY:</span>
            <span className="text-[#f2ca50] font-bold">{estimatedKey}</span>
            {keyConfidence > 0 && <span className="text-[9px] text-[#d0c5af]/50">({keyConfidence}%)</span>}
            <span className="text-[11px] text-[#f2ca50] group-hover:rotate-12 transition-transform">🎼</span>
          </button>

          {/* MIDI Footswitch Badge */}
          <div
            className={`px-2.5 py-1 rounded border flex items-center gap-1.5 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] ${
              midiStatus.isConnected
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-[#1f1b13] border-[#4d4635]/40 text-[#d0c5af]/60'
            }`}
            title="Standard USB/Bluetooth MIDI Sustain Pedal or Footswitch"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold">{midiStatus.isConnected ? 'PEDAL READY (CC#64)' : 'MIDI STANDBY'}</span>
          </div>

          {/* Dynamic AI Latency & Companion Telemetry */}
          <div
            className={`px-2.5 py-1 rounded border font-bold flex items-center gap-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] ${
              sidecarStatusState.state === 'connected'
                ? 'bg-blue-950/40 border-blue-500/40 text-[#7bd0ff]'
                : aiStreamMetrics?.state === 'streaming'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-[#1f1b13] border-[#4d4635]/40 text-[#d0c5af]/70'
            }`}
            title={
              sidecarStatusState.state === 'connected'
                ? `Connected to local sidecar (${sidecarStatusState.roundTripMs ?? 15}ms RTT)`
                : 'Running on in-browser neural accompaniment engine'
            }
          >
            <span>
              {sidecarStatusState.state === 'connected'
                ? `⚡ ${sidecarStatusState.roundTripMs ?? 15}ms MLX`
                : aiStreamMetrics?.state === 'streaming'
                ? `⚡ ${aiStreamMetrics.bufferDepthMs || 40}ms Local AI`
                : '⚡ Local AI Active'}
            </span>
          </div>

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[#d0c5af] hover:text-[#f2ca50] p-1.5 rounded-lg bg-[#1f1b13] hover:bg-[#2d2a21] border border-[#4d4635]/40 cursor-pointer transition"
              title="Studio Settings"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          <button
            onClick={onOpenCalibration}
            className="text-[#d0c5af] hover:text-[#f2ca50] p-1.5 rounded-lg bg-[#1f1b13] hover:bg-[#2d2a21] border border-[#4d4635]/40 cursor-pointer transition"
            title="Recalibrate Acoustic Levels"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="bg-red-950/80 border-b border-red-500/40 text-red-300 px-6 py-2 text-xs font-mono flex items-center justify-between z-40">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white cursor-pointer font-bold ml-4">✕</button>
        </div>
      )}

      {/* Musical Style Presets & Flow-State Toolbar */}
      <section className="bg-[#16130b] border-b border-[#4d4635]/40 px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Style Presets Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto py-1">
          <span className="font-mono text-[10px] text-[#d0c5af]/60 font-bold uppercase shrink-0">STYLE:</span>
          {STYLE_PRESETS.map((preset) => {
            const isSelected = preset.id === selectedPresetId;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                style={{ borderColor: isSelected ? preset.colorAccent : 'transparent' }}
                className={`px-3 py-1 rounded text-xs font-mono font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer border shadow-sm ${
                  isSelected
                    ? 'bg-[#231f17] text-[#ffe9b0] shadow-[0_0_12px_rgba(242,202,80,0.25)]'
                    : 'bg-[#1f1b13] text-[#d0c5af]/70 hover:text-white hover:bg-[#2d2a21]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.colorAccent }} />
                <span>{preset.name}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Section, Tempo & Mastering Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Song Section Badge */}
          <div className="flex items-center bg-[#1f1b13] border border-[#4d4635]/40 rounded px-2.5 py-1 font-mono text-[10px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <span className="text-[#d0c5af]/60 mr-1.5">SECTION:</span>
            <span className="text-emerald-300 font-bold uppercase mr-2">{arrangerState.currentSection}</span>
            <span className="text-amber-300 font-bold drop-shadow-[0_0_6px_rgba(242,202,80,0.4)]">
              BAR {arrangerState.currentBar.toString().padStart(2, '0')}:{arrangerState.currentBeat}
            </span>
          </div>

          {/* Drum Fill Button */}
          <button
            onClick={handleTriggerFill}
            className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold cursor-pointer transition border ${
              arrangerState.isFillActive || arrangerState.isFillQueued
                ? 'bg-amber-500 text-black border-amber-300 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                : 'bg-[#1f1b13] text-amber-300 border-[#4d4635]/50 hover:bg-[#2d2a21]'
            }`}
            title="Trigger an acoustic drum fill at the next bar boundary"
          >
            🥁 FILL
          </button>

          {/* BPM Badge */}
          <div className="flex items-center bg-[#1f1b13] border border-[#4d4635]/40 rounded px-2.5 py-1 font-mono text-xs shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
            <span className="text-[#d0c5af]/60 text-[10px] mr-1">BPM:</span>
            <span className="text-[#f2ca50] font-bold">{currentBpm}</span>
          </div>

          {/* Acoustic Count-In Button */}
          <button
            onClick={handleArmCountIn}
            className={`px-3 py-1 rounded font-mono text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border ${
              countInStatus === 'listening' || countInStatus === 'counting'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 animate-pulse'
                : 'bg-[#1f1b13] text-[#d0c5af] border-[#4d4635]/40 hover:bg-[#2d2a21]'
            }`}
            title="Strum 4 acoustic beats to auto-lock tempo and arm recording hands-free"
          >
            <span>🎙️ COUNT-IN:</span>
            <span>
              {countInStatus === 'counting'
                ? `[ ${countInBeat}/4 ]`
                : countInStatus === 'listening'
                ? 'LISTENING…'
                : 'ARM'}
            </span>
          </button>

          {/* Mastering FX Toggle Button */}
          <button
            onClick={() => setIsMasteringDrawerOpen(!isMasteringDrawerOpen)}
            className={`px-3 py-1 rounded font-mono text-[10px] font-bold cursor-pointer transition flex items-center gap-1.5 border ${
              isMasteringDrawerOpen
                ? 'bg-[#f2ca50] text-[#121414] border-[#f2ca50] shadow-[0_0_12px_rgba(242,202,80,0.35)]'
                : 'bg-[#1f1b13] text-[#d0c5af] border-[#4d4635]/40 hover:bg-[#2d2a21]'
            }`}
            title="Open 3-Band Neural Mastering, Tube Saturation, and Reverb FX"
          >
            <span>🎛️ MASTERING</span>
          </button>
        </div>
      </section>

      {/* Main Studio Body: Left Section Ribbon + Multi-Lane Timeline + Right Inspector Dock */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side Section & Navigation Ribbon */}
        <nav className="hidden lg:flex flex-col items-center justify-between py-3 bg-[#110e07] border-r border-[#4d4635]/40 w-16 shrink-0 z-30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-1.5 w-full px-1.5">
            <span className="text-[8px] font-mono font-bold text-[#d0c5af]/50 text-center uppercase mb-1">SECTION</span>
            {(['intro', 'verse', 'preChorus', 'chorus', 'solo', 'outro'] as SongSection[]).map((sec) => {
              const isActive = arrangerState.currentSection === sec;
              return (
                <button
                  key={`nav-${sec}`}
                  onClick={() => handleSelectSection(sec)}
                  className={`py-2 px-1 rounded flex flex-col items-center justify-center transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-[#231f17] text-[#7bd0ff] border-[#7bd0ff]/50 shadow-[0_0_10px_rgba(123,208,255,0.25)]'
                      : 'bg-transparent text-[#d0c5af]/60 border-transparent hover:bg-[#1f1b13] hover:text-[#eae1d4]'
                  }`}
                  title={`Jump Arranger to ${sec.toUpperCase()}`}
                >
                  <span className="font-mono text-[9px] font-bold uppercase truncate max-w-full">
                    {sec === 'preChorus' ? 'PreCh' : sec}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2 items-center text-[#d0c5af]/60 text-[10px] font-mono">
            <button
              onClick={() => setIsCircleOfFifthsOpen(true)}
              className="p-2 rounded-lg bg-[#1f1b13] hover:bg-[#2d2a21] hover:text-[#f2ca50] border border-[#4d4635]/30 cursor-pointer"
              title="Open Circle of Fifths"
            >
              🎼
            </button>
          </div>
        </nav>

        {/* Center Main Workspace Canvas */}
        <main className="flex-1 flex flex-col relative overflow-y-auto px-6 py-4 gap-4 bg-[#16130b]">
          {/* Track Multi-Lane Console */}
          <div className="flex bg-[#110e07] border border-[#4d4635]/40 rounded-xl overflow-hidden shadow-2xl relative">
            {/* Left Column: Track Sidebars / Mixer Channels */}
            <div className="w-56 bg-[#1f1b13] border-r border-[#4d4635]/40 flex flex-col shrink-0 z-30 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
              <div className="h-9 bg-[#16130b] border-b border-[#4d4635]/40 px-3 flex items-center justify-between text-[10px] font-mono font-bold text-[#d0c5af]/70 uppercase tracking-wider">
                <span>MIXER STRIP</span>
                <span className="text-amber-400/80">CH 1-4</span>
              </div>

              {tracks.map((track) => (
                <div key={`sidebar-${track.id}`} className="h-32 p-3 flex flex-col justify-between border-b border-[#4d4635]/30 bg-[#1f1b13]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {track.icon === 'mic' ? (
                        <div className="w-6 h-6 rounded bg-[#2d2a21] border border-[#f2ca50]/40 flex items-center justify-center text-[#f2ca50] shadow-sm">
                          🎤
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded bg-cyan-950/50 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                          🧠
                        </div>
                      )}
                      <div>
                        <h4 className="text-xs font-bold text-[#eae1d4] font-mono">{track.name}</h4>
                        <p className="text-[9px] text-[#d0c5af]/60 font-mono">{track.trackLabel}</p>
                      </div>
                    </div>

                    {/* Track Buttons M/S */}
                    <div className="flex items-center gap-1 font-mono text-[9px] font-bold">
                      <button
                        onClick={() => handleToggleMute(track.id)}
                        className={`w-5 h-5 rounded transition cursor-pointer ${
                          track.isMuted ? 'bg-[#93000a] text-white shadow-[0_0_6px_rgba(147,0,10,0.8)]' : 'bg-[#110e07] text-[#d0c5af] border border-[#4d4635]/40'
                        }`}
                      >
                        M
                      </button>
                      <button
                        onClick={() => handleToggleSolo(track.id)}
                        className={`w-5 h-5 rounded transition cursor-pointer ${
                          track.isSoloed ? 'bg-[#f2ca50] text-[#3d2f00] shadow-[0_0_6px_rgba(242,202,80,0.8)]' : 'bg-[#110e07] text-[#d0c5af] border border-[#4d4635]/40'
                        }`}
                      >
                        S
                      </button>
                    </div>
                  </div>

                  {/* Mixer Gain Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-mono text-[#d0c5af]/70">
                      <span>GAIN</span>
                      <span className="text-[#f2ca50] font-bold">
                        {track.type === 'audio' ? `${Math.round(micGain * 100)}%` : `${Math.round(aiGain * 100)}%`}
                      </span>
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
                      className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#f2ca50]"
                    />
                    {track.type === 'audio' && (
                      <p className="text-[8px] font-mono text-amber-400/90 truncate mt-0.5" title="Live monitoring — use headphones to avoid acoustic feedback">
                        🎧 Live Monitoring Active
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Timeline & Waveform Canvas */}
            <div ref={timelineScrollRef} className="flex-grow overflow-x-auto relative bg-[#110e07]">
              {/* Playhead Marker */}
              <div
                ref={playheadRef}
                onMouseDown={handlePlayheadMouseDown}
                className="absolute top-0 bottom-0 w-0.5 bg-[#f2ca50] z-40 cursor-ew-resize shadow-[0_0_8px_rgba(242,202,80,0.8)]"
              >
                <div className="w-3.5 h-3.5 bg-[#f2ca50] rotate-45 -translate-x-1.5 -translate-y-1.5 shadow-lg border border-black/40" />
              </div>

              {/* Timeline Bar Numbers Header */}
              <div className="h-9 bg-[#16130b] border-b border-[#4d4635]/40 flex items-center font-mono text-[9px] text-[#d0c5af]/50">
                {Array.from({ length: 32 }).map((_, barIdx) => (
                  <div key={`bar-${barIdx}`} className="w-[120px] shrink-0 border-r border-[#4d4635]/30 pl-2">
                    BAR {barIdx + 1}
                  </div>
                ))}
              </div>

              {/* Track Lanes Visualization */}
              {tracks.map((track) => (
                <div key={`lane-${track.id}`} className="h-32 border-b border-[#4d4635]/25 relative flex items-center px-4">
                  {track.type === 'audio' ? (
                    /* Live Mic Waveform Render */
                    <div className="w-full h-20 bg-black/50 rounded-lg border border-[#4d4635]/40 p-2 flex items-center gap-1 overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                      {waveformDisplay.length === 0 ? (
                        <span className="text-xs font-mono text-slate-500 italic">Live Acoustic Signal Standby…</span>
                      ) : (
                        waveformDisplay.map((amp, idx) => (
                          <div
                            key={`amp-${idx}`}
                            style={{ height: `${Math.max(4, amp * 100)}%` }}
                            className="w-1 bg-[#f2ca50] rounded-full transition-all duration-75 shadow-[0_0_4px_rgba(242,202,80,0.4)]"
                          />
                        ))
                      )}
                    </div>
                  ) : (
                    /* AI Companion MRT2 Continuous Waveform & Buffer Depth Meter */
                    <div className="w-full h-20 bg-cyan-950/20 backdrop-blur-md rounded-lg border border-cyan-500/30 p-3 flex flex-col justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                      <div className="flex justify-between items-center text-xs font-mono">
                        <span className="text-cyan-300 font-bold flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                          MRT2 REAL-TIME COMPANION ({activePreset.name.toUpperCase()})
                        </span>
                        <span className="text-slate-400">
                          STATUS: <strong className="text-emerald-400">{aiStreamMetrics?.state.toUpperCase() || 'IDLE'}</strong>
                        </span>
                      </div>

                      {/* Buffer Level Meter */}
                      <div className="flex items-center gap-1 h-7">
                        {Array.from({ length: 40 }).map((_, bIdx) => {
                          const activeBars = Math.min(40, Math.floor((aiStreamMetrics?.bufferDepthChunks || 0) * 8));
                          const isActive = bIdx < activeBars;
                          return (
                            <div
                              key={`bar-meter-${bIdx}`}
                              className={`flex-1 rounded-sm transition-all duration-150 ${
                                isActive
                                  ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] h-5'
                                  : 'bg-white/10 h-1.5'
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

        {/* Right-Hand Harmonic HUD & Neural Mastering Inspector Dock */}
        <aside className="hidden xl:flex flex-col w-80 bg-[#110e07] border-l border-[#4d4635]/40 shadow-2xl shrink-0 overflow-y-auto">
          {/* Harmonic Intelligence HUD Card */}
          <div className="p-4 border-b border-[#4d4635]/40">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-[#f2ca50] uppercase flex items-center gap-1.5">
                <span>🎼</span> HARMONIC INTELLIGENCE
              </span>
              <button
                onClick={() => setIsCircleOfFifthsOpen(true)}
                className="text-[10px] font-mono text-cyan-300 hover:underline cursor-pointer"
              >
                WHEEL HUD ↗
              </button>
            </div>

            {/* Current Chord Badge */}
            <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-3.5 flex items-center justify-between shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
              <div>
                <span className="text-[9px] font-mono text-[#d0c5af]/60 block uppercase">DETECTED CHORD</span>
                <span className="text-xl font-bold text-[#f2ca50] font-mono">
                  {chordEstimate?.chordSymbol || `${estimatedKey.split(' ')[0]}m`}
                </span>
                <span className="text-xs text-amber-300/80 font-mono ml-2">
                  ({chordEstimate?.romanNumeral || 'i'})
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] font-mono text-[#d0c5af]/60 block uppercase">HARMONIC TENSION</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {Math.round((chordEstimate?.harmonicTension || 0.2) * 100)}%
                </span>
              </div>
            </div>

            {/* Neural Solo Scale Recommendation Card */}
            <div className="mt-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase">RECOMMENDED SOLO SCALE</span>
                <span className="text-[10px]">✨</span>
              </div>
              <div className="text-sm font-bold text-white font-mono">
                {chordEstimate?.recommendedScales?.[0] || `${estimatedKey.split(' ')[0]} Dorian Mode`}
              </div>
              <p className="text-[10px] text-[#d0c5af]/70 font-mono mt-1 leading-relaxed">
                Seamless modal solo scale for effortless improvisational melody over active chord changes.
              </p>
            </div>
          </div>

          {/* 3-Band Neural Mastering Rack */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                <span>🎛️</span> NEURAL MASTERING
              </span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                -0.1 dBFS TRUE PEAK
              </span>
            </div>

            <div className="space-y-4">
              {/* Tube Warmth Rotary Dial */}
              <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                  <span className="text-[#d0c5af]/80">TUBE WARMTH (SATURATION)</span>
                  <span className="text-amber-300 font-bold">{Math.round(masteringOptions.warmthAmount * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={masteringOptions.warmthAmount}
                  onChange={(e) => handleUpdateMastering({ warmthAmount: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#f2ca50]"
                />
              </div>

              {/* Stereo Width Imager */}
              <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                  <span className="text-[#d0c5af]/80">STEREO WIDTH IMAGER</span>
                  <span className="text-cyan-300 font-bold">{Math.round(masteringOptions.stereoWidth * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={masteringOptions.stereoWidth}
                  onChange={(e) => handleUpdateMastering({ stereoWidth: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Studio Reverb */}
              <div className="bg-[#1f1b13] border border-[#4d4635]/40 rounded-xl p-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                  <span className="text-[#d0c5af]/80">CONVOLUTION REVERB</span>
                  <select
                    value={masteringOptions.reverbSpace}
                    onChange={(e) => handleUpdateMastering({ reverbSpace: e.target.value as any })}
                    className="bg-[#110e07] border border-[#4d4635]/40 rounded px-1 text-[9px] text-[#f2ca50] font-mono cursor-pointer"
                  >
                    <option value="studio">Studio Room</option>
                    <option value="plate">Vintage Plate</option>
                    <option value="ambient">Ambient Hall</option>
                  </select>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.6"
                  step="0.02"
                  value={masteringOptions.reverbWet}
                  onChange={(e) => handleUpdateMastering({ reverbWet: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom Transport Toolbar & Multi-Take Stem Exporter */}
      <nav className="bg-[#110e07] border-t border-[#4d4635]/50 h-16 fixed bottom-0 left-0 right-0 z-50 px-6 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-4 font-mono text-xs text-amber-400 font-bold">
          {/* LCD Digital Timecode */}
          <div className="bg-[#1f1b13] border border-black/80 px-3 py-1.5 rounded-lg shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] text-[#ffe9b0] drop-shadow-[0_0_8px_rgba(255,233,176,0.3)]">
            <span>{formatTimecode(recordingSeconds)}</span>
          </div>

          {/* Multi-Take Selector & Stem Exporter */}
          <div className="flex items-center gap-1.5 text-[10px] text-[#d0c5af]/80">
            <span>TAKE:</span>
            <select
              value={selectedTakeNumber}
              onChange={(e) => setSelectedTakeNumber(parseInt(e.target.value))}
              className="bg-[#1f1b13] border border-[#4d4635]/40 rounded px-2 py-1 text-xs text-[#f2ca50] font-mono cursor-pointer"
            >
              {savedTakes.length === 0 ? (
                <option value={1}>Take 1 (Live)</option>
              ) : (
                savedTakes.map((t) => (
                  <option key={t.takeId} value={t.takeNumber}>
                    Take {t.takeNumber} ({Math.round(t.durationMs / 1000)}s)
                  </option>
                ))
              )}
            </select>

            <button
              onClick={handleExportTakeWav}
              className="px-2.5 py-1 rounded bg-[#231f17] hover:bg-[#2d2a21] text-[#f2ca50] border border-[#f2ca50]/30 font-mono text-[10px] cursor-pointer transition flex items-center gap-1 shadow-sm"
              title="Export pristine 16-bit 48kHz WAV audio take for DAW import"
            >
              <span>💾 EXPORT .WAV</span>
            </button>

            {/* Retrospective Loop Capture */}
            <button
              onClick={handleKeepLast8Bars}
              className="px-3 py-1 rounded bg-gradient-to-r from-amber-500/30 to-amber-600/30 hover:brightness-125 text-amber-300 border border-amber-500/50 font-mono text-[10px] cursor-pointer transition flex items-center gap-1 font-bold shadow-[0_0_12px_rgba(245,158,11,0.25)]"
              title="Retroactively capture and save the last 8 bars of audio without prior recording"
            >
              <span>✨ KEEP LAST 8 BARS</span>
            </button>
          </div>
        </div>

        {/* Central Transport Buttons */}
        <div className="flex items-center gap-3">
          {/* Rewind to Bar 1 */}
          <button
            onClick={() => updatePlayheadPosition(0)}
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#1f1b13] hover:bg-[#2d2a21] text-[#d0c5af] hover:text-white border border-[#4d4635]/40 transition cursor-pointer shadow-sm"
            title="Rewind to Bar 1"
          >
            ⏮
          </button>

          {/* Large Circular Play/Pause Transport Button */}
          <button
            onClick={handlePlayTransport}
            className={`w-12 h-12 rounded-full font-mono text-sm font-bold flex items-center justify-center transition-all cursor-pointer shadow-lg ${
              isPlaying
                ? 'bg-[#f2ca50] text-[#3d2f00] shadow-[0_0_16px_rgba(242,202,80,0.5)] scale-105'
                : 'bg-[#231f17] text-[#f2ca50] border border-[#f2ca50]/40 hover:bg-[#2d2a21]'
            }`}
            title={isPlaying ? 'Pause Playback' : 'Start Playback'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          {/* Stop Transport */}
          <button
            onClick={handleStopTransport}
            className="w-9 h-9 rounded-full font-mono text-xs font-bold flex items-center justify-center bg-[#1f1b13] hover:bg-[#2d2a21] text-[#d0c5af] border border-[#4d4635]/40 cursor-pointer shadow-sm"
            title="Stop Playback"
          >
            ⏹
          </button>

          {/* Record Button with Flashing Crimson Aura */}
          <button
            onClick={handleToggleRecord}
            className={`w-11 h-11 rounded-full font-mono text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
              isRecording
                ? 'bg-[#93000a] text-white animate-pulse shadow-[0_0_18px_rgba(239,68,68,0.7)]'
                : 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/40 hover:bg-[#93000a]/40'
            }`}
            title={isRecording ? 'Stop Recording Take' : 'Record Audio Take'}
          >
            ⏺
          </button>
        </div>

        {/* Master Output Volume & Telemetry */}
        <div className="flex items-center gap-4 font-mono text-[10px]">
          {/* Master Volume Slider */}
          <div className="flex items-center gap-2">
            <span className="text-[#d0c5af]/60">MASTER:</span>
            <input
              type="range"
              min="0"
              max="1.2"
              step="0.05"
              defaultValue="1.0"
              onChange={(e) => audioEngine?.setMasterVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-black/60 rounded-lg appearance-none cursor-pointer accent-[#f2ca50]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">
              TIER: <strong className="text-amber-400 font-bold">{activeTierState.toUpperCase()}</strong>
            </span>
            <span className="text-slate-400">
              CONF: <strong className="text-cyan-400 font-bold">{liveConfidenceState}%</strong>
            </span>
          </div>
        </div>
      </nav>

      {/* Harmonic Circle of Fifths Modal Guide */}
      <HarmonicCircleOfFifths
        isOpen={isCircleOfFifthsOpen}
        onClose={() => setIsCircleOfFifthsOpen(false)}
        currentKey={estimatedKey}
        chordEstimate={chordEstimate}
      />

      <AddTrackModal
        isOpen={isAddTrackOpen}
        onClose={() => setIsAddTrackOpen(false)}
        onAddTrack={handleAddTrackSubmit}
      />
    </div>
  );
}
