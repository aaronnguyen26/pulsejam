'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AudioEngine } from '@/lib/audio/AudioEngine';
import {
  DSPMetrics,
  PerformanceTier,
  AudioEngineStatus,
  NoteSequencePayload,
} from '@/lib/audio/types';
import { AddTrackModal, TrackType } from '@/components/AddTrackModal';
import { useAudioSettingsStore } from '@/lib/state/audioSettingsStore';

// Helper to convert MIDI note number to note name string (e.g. 60 -> C4)
function getNoteNameLabel(pitch: number): string {
  if (!pitch || pitch <= 0) return '--';
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(pitch / 12) - 1;
  return `${notes[pitch % 12]}${octave}`;
}

// Fixed Pitch Mapping for Lead Synth (Melody): Range C3 (48) to C6 (84)
function getMelodyPitchY(pitch: number): number {
  const minPitch = 48; // C3
  const maxPitch = 84; // C6
  const clamped = Math.max(minPitch, Math.min(maxPitch, pitch));
  const norm = (clamped - minPitch) / (maxPitch - minPitch);
  return Math.round(92 - norm * 76); // Y ranges from 16px (top) to 92px (bottom)
}

// Fixed Pitch Mapping for Bassline: Range E1 (28) to E3 (52)
function getBassPitchY(pitch: number): number {
  const minPitch = 28; // E1
  const maxPitch = 52; // E3
  const clamped = Math.max(minPitch, Math.min(maxPitch, pitch));
  const norm = (clamped - minPitch) / (maxPitch - minPitch);
  return Math.round(92 - norm * 76); // Y ranges from 16px to 92px
}

// Fixed GM Drum Kit Pitch Mapping for Drums Companion (5 Rows)
function getDrumPitchY(pitch: number): number {
  if (pitch === 35 || pitch === 36) return 92; // Kick Drum -> Row 5 (Bottom)
  if (pitch === 38 || pitch === 40) return 74; // Snare Drum -> Row 4
  if ([41, 43, 45, 47, 48, 50].includes(pitch)) return 56; // Toms -> Row 3
  if (pitch === 42 || pitch === 44 || pitch === 46) return 38; // Hi-Hats -> Row 2
  return 18; // Cymbals / Ride / Crash -> Row 1 (Top)
}

function getTrackNoteTopY(pitch: number, trackType: string): number {
  if (trackType === 'drums') return getDrumPitchY(pitch);
  if (trackType === 'bass') return getBassPitchY(pitch);
  return getMelodyPitchY(pitch);
}

export interface StoredBarNoteData {
  barIndex: number;
  tierAtGeneration: PerformanceTier;
  noteSequence: NoteSequencePayload;
  createdAt: number;
}

export interface DynamicTrackLane {
  id: string;
  name: string;
  trackLabel: string;
  icon: 'keyboard' | 'music_note' | 'mic' | 'memory';
  type: 'audio' | 'drums' | 'melody' | 'bass' | 'master-ai' | 'custom';
  isMuted: boolean;
  isSoloed: boolean;
  isArmed: boolean;
  isPlayingStored: boolean;
  storedBars: StoredBarNoteData[];
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
  // 1. Initial State: Clean Timeline without initial mock bars
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
      isPlayingStored: false,
      storedBars: [],
    },
    {
      id: 'melody-lane',
      name: 'Lead Synth',
      trackLabel: 'MIDI TRACK 01',
      icon: 'keyboard',
      type: 'melody',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
      isPlayingStored: false,
      storedBars: [],
    },
    {
      id: 'bass-lane',
      name: 'Bassline',
      trackLabel: 'MIDI TRACK 02',
      icon: 'music_note',
      type: 'bass',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
      isPlayingStored: false,
      storedBars: [],
    },
    {
      id: 'drums-lane',
      name: 'Drums Companion',
      trackLabel: 'MIDI TRACK 03',
      icon: 'memory',
      type: 'drums',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
      isPlayingStored: false,
      storedBars: [],
    },
  ]);

  // In-Memory Live Audio Take & Waveform State
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [waveformDisplay, setWaveformDisplay] = useState<number[]>([]);

  // Recording Target Mode State ('all-armed' | trackId)
  const [recordingTargetTrackId, setRecordingTargetTrackId] = useState<string>('all-armed');

  // Modal State
  const [isAddTrackOpen, setIsAddTrackOpen] = useState(false);

  // Transport & Audio Status State
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Telemetry & Audio References
  const previousTierRef = useRef<PerformanceTier | null>(null);
  const [activeTierState, setActiveTierState] = useState<PerformanceTier>('chill');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const liveWaveformBufferRef = useRef<number[]>([]);
  const currentBarIndexRef = useRef<number>(1);

  // Playhead & Auto-Scroll References & Scrubbing State
  const playheadRef = useRef<HTMLDivElement | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);
  const sessionStartTimeRef = useRef<number | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Playhead scrub position (in seconds)
  const scrubTimeRef = useRef<number>(0);
  const [scrubTimeState, setScrubTimeState] = useState<number>(0);
  const isDraggingPlayheadRef = useRef<boolean>(false);

  const PIXELS_PER_SECOND = 60;

  // Calculate timeline position in seconds from clientX coordinate
  const calculateTimeFromX = (clientX: number): number => {
    if (!timelineScrollRef.current) return 0;
    const rect = timelineScrollRef.current.getBoundingClientRect();
    const xInViewport = clientX - rect.left;
    const contentX = xInViewport + timelineScrollRef.current.scrollLeft;
    return Math.max(0, contentX / PIXELS_PER_SECOND);
  };

  // Update playhead DOM transform and scrub time state
  const updatePlayheadPosition = (timeSec: number) => {
    const clampedTime = Math.max(0, timeSec);
    scrubTimeRef.current = clampedTime;
    setScrubTimeState(clampedTime);
    setRecordingSeconds(Math.floor(clampedTime));
    if (playheadRef.current) {
      playheadRef.current.style.transform = `translateX(${clampedTime * PIXELS_PER_SECOND}px)`;
    }
  };

  // Common scrub start logic (mouse or touch)
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

      if (timelineScrollRef.current) {
        const rect = timelineScrollRef.current.getBoundingClientRect();
        const xInViewport = moveEvt.clientX - rect.left;
        if (xInViewport > rect.width - 40) {
          timelineScrollRef.current.scrollLeft += 15;
        } else if (xInViewport < 40 && timelineScrollRef.current.scrollLeft > 0) {
          timelineScrollRef.current.scrollLeft -= 15;
        }
      }

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

  const handlePlayheadTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length === 0) return;
    handleScrubStart(e.touches[0].clientX);

    const onTouchMove = (moveEvt: TouchEvent) => {
      if (!isDraggingPlayheadRef.current || moveEvt.touches.length === 0) return;
      const targetTime = calculateTimeFromX(moveEvt.touches[0].clientX);
      updatePlayheadPosition(targetTime);

      if (isPlaying || isRecording) {
        const audioCtx = audioEngine?.getAudioContext();
        const currentAudioTime = audioCtx ? audioCtx.currentTime : performance.now() / 1000;
        sessionStartTimeRef.current = currentAudioTime - targetTime;
      }
    };

    const onTouchEnd = () => {
      isDraggingPlayheadRef.current = false;
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
  };

  const handleTimelineHeaderOrCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // 60fps Playhead Position & GarageBand-Style Auto-Scroll Loop
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
      setScrubTimeState(elapsedSec);

      const wholeSec = Math.floor(elapsedSec);
      setRecordingSeconds((prev) => (prev !== wholeSec ? wholeSec : prev));

      const playheadLeftPx = elapsedSec * PIXELS_PER_SECOND;

      // 1. Update Playhead position directly via DOM transform (60fps smooth)
      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${playheadLeftPx}px)`;
      }

      // 2. Auto-scroll timeline (GarageBand style: pin playhead at ~22% viewport width)
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

  // Helper: Check if a track is audible considering Mute and Solo states
  const isTrackAudible = (track: DynamicTrackLane, currentTracks: DynamicTrackLane[]): boolean => {
    if (track.isMuted) return false;
    const hasSoloed = currentTracks.some((t) => t.isSoloed);
    if (hasSoloed) {
      return track.isSoloed;
    }
    return true;
  };

  // Subscribe to Audio Engine Errors & Status
  useEffect(() => {
    if (!audioEngine) return;

    const unsubStatus = audioEngine.subscribeStatus((st: AudioEngineStatus) => {
      if (st.errorMessage) {
        setErrorMessage(st.errorMessage);
      } else {
        setErrorMessage(null);
      }
    });

    return () => unsubStatus();
  }, [audioEngine]);

  // Recording Timecode Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isPlaying) {
      setRecordingSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPlaying]);

  // Smooth 60fps Live Waveform Animation Loop
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

  // Bar Boundary AI Generation Listener: Enforces MUTE, SOLO, and REC logic
  useEffect(() => {
    if (!audioEngine) return;

    const aiEngine = audioEngine.getAIGenerationEngine();
    const synthEngine = audioEngine.getMIDISynthEngine();
    if (!aiEngine || !synthEngine) return;

    const unsubLog = aiEngine.subscribeLogs((logEntry) => {
      const barIdx = logEntry.barIndex;
      currentBarIndexRef.current = barIdx;

      const genDrums: NoteSequencePayload = (aiEngine as unknown as { lastGeneratedBar?: { drums: NoteSequencePayload } })
        .lastGeneratedBar?.drums || {
        notes: [
          { pitch: 36, velocity: 100, startTime: 0, duration: 0.25 },
          { pitch: 38, velocity: 90, startTime: 0.5, duration: 0.25 },
          { pitch: 42, velocity: 85, startTime: 1.0, duration: 0.25 },
        ],
        totalTime: 2.0,
        qpm: 120,
      };

      const genMelody: NoteSequencePayload = (aiEngine as unknown as { lastGeneratedBar?: { melody: NoteSequencePayload } })
        .lastGeneratedBar?.melody || {
        notes: [
          { pitch: 60, velocity: 90, startTime: 0, duration: 0.5 },
          { pitch: 64, velocity: 95, startTime: 0.5, duration: 0.5 },
          { pitch: 67, velocity: 100, startTime: 1.0, duration: 0.5 },
        ],
        totalTime: 2.0,
        qpm: 120,
      };

      const genBass: NoteSequencePayload = (aiEngine as unknown as { lastGeneratedBar?: { bass: NoteSequencePayload } })
        .lastGeneratedBar?.bass || {
        notes: [
          { pitch: 36, velocity: 90, startTime: 0, duration: 0.5 },
          { pitch: 43, velocity: 85, startTime: 1.0, duration: 0.5 },
        ],
        totalTime: 2.0,
        qpm: 120,
      };

      // Evaluate MUTE & SOLO for live synthesized output
      const drumsLane = tracks.find((t) => t.type === 'drums');
      const melodyLane = tracks.find((t) => t.type === 'melody');
      const bassLane = tracks.find((t) => t.type === 'bass');

      const drumsAudible = drumsLane ? isTrackAudible(drumsLane, tracks) : false;
      const melodyAudible = melodyLane ? isTrackAudible(melodyLane, tracks) : false;
      const bassAudible = bassLane ? isTrackAudible(bassLane, tracks) : false;

      // Play live sound through MIDISynthEngine only if track is audible
      synthEngine.scheduleBarPlayback(
        drumsAudible ? genDrums : null,
        melodyAudible ? genMelody : null,
        bassAudible ? genBass : null,
        synthEngine['ctx'].currentTime + 0.05,
        120
      );

      // Evaluate REC (Record Arm): Store generated bars into armed tracks only
      setTracks((prevTracks) =>
        prevTracks.map((lane) => {
          if (lane.type === 'drums' && lane.isArmed) {
            const newBar: StoredBarNoteData = {
              barIndex: barIdx,
              tierAtGeneration: activeTierState,
              noteSequence: genDrums,
              createdAt: Date.now(),
            };
            return { ...lane, storedBars: [...lane.storedBars, newBar] };
          }
          if (lane.type === 'melody' && lane.isArmed) {
            const newBar: StoredBarNoteData = {
              barIndex: barIdx,
              tierAtGeneration: activeTierState,
              noteSequence: genMelody,
              createdAt: Date.now(),
            };
            return { ...lane, storedBars: [...lane.storedBars, newBar] };
          }
          if (lane.type === 'bass' && lane.isArmed) {
            const newBar: StoredBarNoteData = {
              barIndex: barIdx,
              tierAtGeneration: activeTierState,
              noteSequence: genBass,
              createdAt: Date.now(),
            };
            return { ...lane, storedBars: [...lane.storedBars, newBar] };
          }
          return lane;
        })
      );
    });

    return () => unsubLog();
  }, [audioEngine, activeTierState, tracks]);

  // Audio Engine Worklet Metric Listener for Live Input Waveform & Telemetry
  const [pitchConfidenceState, setPitchConfidenceState] = useState<number | null>(null);

  useEffect(() => {
    if (!audioEngine) return;

    const unsubMetrics = audioEngine.subscribeMetrics((metrics: DSPMetrics) => {
      if (metrics.activeTier !== previousTierRef.current) {
        previousTierRef.current = metrics.activeTier;
        setActiveTierState(metrics.activeTier);
      }

      if (metrics.calibration && metrics.calibration.pitchConfidenceScore !== undefined) {
        setPitchConfidenceState(metrics.calibration.pitchConfidenceScore);
      }

      // Collect real-time peak amplitude for live input waveform lane when recording
      const amp = metrics.peakAmplitude ?? Math.min(1.0, Math.max(0.05, (metrics.rawRmsDb + 60) / 60));
      liveWaveformBufferRef.current.push(amp);
      if (liveWaveformBufferRef.current.length > 300) {
        liveWaveformBufferRef.current.shift();
      }
    });

    return () => unsubMetrics();
  }, [audioEngine]);

  // Track Control Toggles (MUTE, SOLO, REC)
  const handleToggleMute = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextMuted = !t.isMuted;
          if (t.type === 'audio' && playbackAudioRef.current) {
            playbackAudioRef.current.muted = nextMuted;
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

  const hasAnySoloed = tracks.some((t) => t.isSoloed);

  // Real-Time Audio Routing: Sync Track Mute & Solo states to MIDISynthEngine isolated GainNodes & audio element
  useEffect(() => {
    if (!audioEngine) return;
    const synthEngine = audioEngine.getMIDISynthEngine();

    const liveLane = tracks.find((t) => t.type === 'audio');
    const melodyLane = tracks.find((t) => t.type === 'melody');
    const bassLane = tracks.find((t) => t.type === 'bass');
    const drumsLane = tracks.find((t) => t.type === 'drums');

    const liveAudible = liveLane ? isTrackAudible(liveLane, tracks) : true;
    const melodyAudible = melodyLane ? isTrackAudible(melodyLane, tracks) : true;
    const bassAudible = bassLane ? isTrackAudible(bassLane, tracks) : true;
    const drumsAudible = drumsLane ? isTrackAudible(drumsLane, tracks) : true;

    if (synthEngine) {
      synthEngine.updateLaneAudibility(melodyAudible, bassAudible, drumsAudible);
    }

    if (playbackAudioRef.current) {
      playbackAudioRef.current.muted = !liveAudible;
    }
  }, [tracks, audioEngine]);

  // Preview an individual single note's pitch for its duration on note click
  const handlePreviewSingleNote = (trackType: string, pitch: number, durationSec: number = 0.4) => {
    if (!audioEngine) return;
    const synthEngine = audioEngine.getMIDISynthEngine();
    if (!synthEngine) return;
    synthEngine.playSingleNote(trackType, pitch, 0.85, durationSec);
  };

  // CONCERN 1: Per-Lane Isolated Recording Handler
  const handleSoloRecordTrack = async (targetTrack: DynamicTrackLane) => {
    if (!audioEngine) {
      setErrorMessage('Audio Engine is not initialized.');
      return;
    }

    // If already recording, stop session
    if (isRecording) {
      stopRecordingSession();
      return;
    }

    setErrorMessage(null);
    setIsPlaying(false);
    setRecordingTargetTrackId(targetTrack.id);

    const audioCtx = audioEngine.getAudioContext();
    const startOffset = scrubTimeRef.current;
    sessionStartTimeRef.current = audioCtx ? audioCtx.currentTime - startOffset : (performance.now() / 1000) - startOffset;

    // Update track arm states so ONLY targetTrack is armed
    setTracks((prev) =>
      prev.map((t) => ({ ...t, isArmed: t.id === targetTrack.id }))
    );

    if (targetTrack.type === 'audio') {
      // 1. ISOLATED LIVE INPUT RECORDING: Mic audio capture only. Zero MIDI generation/audio!
      recordedChunksRef.current = [];
      liveWaveformBufferRef.current = [];

      try {
        const success = await audioEngine.startMicrophone();
        if (!success) {
          setIsRecording(false);
          return;
        }

        setIsRecording(true);
        // Do NOT start AIGenerationEngine (prevents MIDI AI inference)

        const stream = audioEngine.getMicStream();
        if (stream && typeof MediaRecorder !== 'undefined') {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };
          recorder.start(100);
          mediaRecorderRef.current = recorder;
        }
      } catch (err: unknown) {
        setIsRecording(false);
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Microphone access error: ${msg}`);
      }
    } else {
      // 2. ISOLATED MIDI LANE RECORDING: Record from this instrument's isolated WebAudio bus (zero bleed!)
      recordedChunksRef.current = [];
      setIsRecording(true);

      const synthEngine = audioEngine.getMIDISynthEngine();
      let isolatedStream: MediaStream | null = null;
      if (targetTrack.type === 'melody') isolatedStream = synthEngine?.getLeadSynthStream() || null;
      else if (targetTrack.type === 'bass') isolatedStream = synthEngine?.getBasslineStream() || null;
      else if (targetTrack.type === 'drums') isolatedStream = synthEngine?.getDrumsStream() || null;

      if (isolatedStream && typeof MediaRecorder !== 'undefined') {
        const recorder = new MediaRecorder(isolatedStream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunksRef.current.push(e.data);
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      }

      audioEngine.getAIGenerationEngine()?.start(startOffset);
    }
  };

  // Master "Record All AI Accompaniment" Handler (Captures Lead Synth + Bassline + Drums together)
  const handleMasterAIRecordToggle = async () => {
    if (!audioEngine) {
      setErrorMessage('Audio Engine is not initialized.');
      return;
    }

    if (isRecording) {
      stopRecordingSession();
      return;
    }

    setErrorMessage(null);
    setIsPlaying(false);
    setRecordingTargetTrackId('master-ai');

    const audioCtx = audioEngine.getAudioContext();
    const startOffset = scrubTimeRef.current;
    sessionStartTimeRef.current = audioCtx ? audioCtx.currentTime - startOffset : (performance.now() / 1000) - startOffset;

    // Arm all 3 MIDI accompaniment lanes
    setTracks((prev) =>
      prev.map((t) => ({ ...t, isArmed: t.type !== 'audio' }))
    );

    recordedChunksRef.current = [];
    setIsRecording(true);

    const synthEngine = audioEngine.getMIDISynthEngine();
    const masterStream = synthEngine?.getAIMasterStream() || null;

    if (masterStream && typeof MediaRecorder !== 'undefined') {
      const recorder = new MediaRecorder(masterStream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.start(100);
      mediaRecorderRef.current = recorder;
    }

    audioEngine.getAIGenerationEngine()?.start(startOffset);
  };

  // Replay Single Track Stored Data with Mute/Solo evaluation
  const handleReplayLane = (lane: DynamicTrackLane) => {
    if (!audioEngine) return;
    const synthEngine = audioEngine.getMIDISynthEngine();
    if (!synthEngine) return;

    if (!isTrackAudible(lane, tracks)) return;

    setTracks((prev) =>
      prev.map((t) => (t.id === lane.id ? { ...t, isPlayingStored: !t.isPlayingStored } : t))
    );

    if (lane.type === 'audio' && recordedAudioUrl && playbackAudioRef.current) {
      playbackAudioRef.current.currentTime = 0;
      playbackAudioRef.current.play();
      return;
    }

    lane.storedBars.forEach((barData, idx) => {
      const playTime = synthEngine['ctx'].currentTime + idx * 2.0;
      const dSeq = lane.type === 'drums' ? barData.noteSequence : null;
      const mSeq = lane.type === 'melody' ? barData.noteSequence : null;
      const bSeq = lane.type === 'bass' ? barData.noteSequence : null;
      synthEngine.scheduleBarPlayback(dSeq, mSeq, bSeq, playTime, 120);
    });
  };

  // Add Track Handler
  const handleAddTrackSubmit = (trackData: { name: string; type: TrackType; inputSource: string }) => {
    const nextNum = tracks.length + 1;
    const newTrack: DynamicTrackLane = {
      id: `custom-track-${nextNum}`,
      name: trackData.name,
      trackLabel: `MIDI TRACK 0${nextNum}`,
      icon: trackData.type === 'audio' ? 'mic' : trackData.type === 'ai-companion' ? 'memory' : 'keyboard',
      type: trackData.type === 'ai-companion' ? 'drums' : 'custom',
      isMuted: false,
      isSoloed: false,
      isArmed: true,
      isPlayingStored: false,
      storedBars: [],
    };
    setTracks([...tracks, newTrack]);
  };

  // Stop Recording Session: Stores captured audio Blob in memory
  const stopRecordingSession = () => {
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = () => {
        if (recordedChunksRef.current.length > 0) {
          const mimeType = MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
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

    if (audioEngine) {
      audioEngine.getAIGenerationEngine()?.stop();
    }
  };

  // Global Transport REC Handler: Records all armed lanes together in sync
  const handleStartRecording = async () => {
    if (!audioEngine) {
      setErrorMessage('Audio Engine is not initialized.');
      return;
    }

    if (isRecording) {
      stopRecordingSession();
    } else {
      setErrorMessage(null);
      setIsPlaying(false);
      setRecordingTargetTrackId('all-armed');
      recordedChunksRef.current = [];
      liveWaveformBufferRef.current = [];

      const audioCtx = audioEngine.getAudioContext();
      const startOffset = scrubTimeRef.current;
      sessionStartTimeRef.current = audioCtx ? audioCtx.currentTime - startOffset : (performance.now() / 1000) - startOffset;

      try {
        const liveInputTrack = tracks.find((t) => t.type === 'audio');
        const anyMidiArmed = tracks.some((t) => t.type !== 'audio' && t.isArmed);

        // If Live Input is armed, start mic capture
        if (liveInputTrack?.isArmed) {
          const success = await audioEngine.startMicrophone();
          if (!success) {
            setIsRecording(false);
            return;
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
        }

        setIsRecording(true);

        // If any MIDI lane is armed, start AI generation engine
        if (anyMidiArmed) {
          audioEngine.getAIGenerationEngine()?.start(startOffset);
        }
      } catch (err: unknown) {
        setIsRecording(false);
        const msg = err instanceof Error ? err.message : String(err);
        setErrorMessage(`Microphone access error: ${msg}`);
      }
    }
  };

  const handleStopTransport = () => {
    if (isRecording) {
      stopRecordingSession();
    }

    // If already stopped, pressing STOP again rewinds playhead to 0 (Bar 1)
    if (!isPlaying && !isRecording) {
      updatePlayheadPosition(0);
      if (timelineScrollRef.current) {
        timelineScrollRef.current.scrollLeft = 0;
      }
      return;
    }

    setIsPlaying(false);

    if (playbackAudioRef.current) {
      playbackAudioRef.current.pause();
    }

    if (audioEngine) {
      audioEngine.getAIGenerationEngine()?.stop();
    }
  };

  // Synchronized Global PLAY: Plays recorded live audio + audible armed MIDI lanes starting from scrub position
  const handlePlayTransport = () => {
    if (isRecording) {
      stopRecordingSession();
    }

    if (isPlaying) {
      handleStopTransport();
      return;
    }

    setIsPlaying(true);
    const audioCtx = audioEngine?.getAudioContext();
    const currentAudioTime = audioCtx ? audioCtx.currentTime : performance.now() / 1000;
    const startOffset = scrubTimeRef.current;
    sessionStartTimeRef.current = currentAudioTime - startOffset;

    // 1. Play stored live audio take if live input lane is audible
    const liveLane = tracks.find((t) => t.type === 'audio');
    if (recordedAudioUrl && playbackAudioRef.current && liveLane && isTrackAudible(liveLane, tracks)) {
      playbackAudioRef.current.currentTime = startOffset;
      playbackAudioRef.current.muted = false;
      playbackAudioRef.current.play().catch((err) => console.warn('Audio playback error:', err));
    }

    // 2. Play all audible MIDI lanes' stored bars in sync starting from startOffset
    if (audioEngine) {
      const synthEngine = audioEngine.getMIDISynthEngine();
      if (synthEngine) {
        const now = synthEngine['ctx'].currentTime + 0.05;

        const drumLane = tracks.find((t) => t.type === 'drums');
        const melodyLane = tracks.find((t) => t.type === 'melody');
        const bassLane = tracks.find((t) => t.type === 'bass');

        const drumAudible = drumLane ? isTrackAudible(drumLane, tracks) : false;
        const melodyAudible = melodyLane ? isTrackAudible(melodyLane, tracks) : false;
        const bassAudible = bassLane ? isTrackAudible(bassLane, tracks) : false;

        const drumBars = drumAudible ? drumLane?.storedBars || [] : [];
        const melodyBars = melodyAudible ? melodyLane?.storedBars || [] : [];
        const bassBars = bassAudible ? bassLane?.storedBars || [] : [];

        const maxBars = Math.max(drumBars.length, melodyBars.length, bassBars.length, 1);
        for (let i = 0; i < maxBars; i++) {
          const barStartTime = i * 2.0;
          const barEndTime = (i + 1) * 2.0;

          // Skip bars that have completely ended before startOffset
          if (barEndTime <= startOffset) continue;

          const dBar = drumBars[i]?.noteSequence || null;
          const mBar = melodyBars[i]?.noteSequence || null;
          const bBar = bassBars[i]?.noteSequence || null;

          const scheduleAudioTime = now + (barStartTime - startOffset);
          synthEngine.scheduleBarPlayback(dBar, mBar, bBar, scheduleAudioTime, 120);
        }
      }
    }
  };

  const formatTimecode = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `00:${pad(mins)}:${pad(secs)}:00`;
  };

  return (
    <div className="bg-[#121414] text-[#e3e2e2] font-sans min-h-screen flex flex-col antialiased selection:bg-[#f2ca50] selection:text-[#3c2f00]">
      {/* Hidden In-Memory Audio Playback Element */}
      <audio ref={playbackAudioRef} onEnded={() => setIsPlaying(false)} className="hidden" />

      {/* TopAppBar */}
      <header className="bg-[#0d0e0f] text-[#f2ca50] border-b border-[#4d4635]/40 flex justify-between items-center h-12 px-6 w-full z-50 shrink-0">
        <div className="flex items-center gap-4">
          {onNavigateBack && (
            <button
              onClick={onNavigateBack}
              className="text-[#d0c5af] hover:text-[#f2ca50] transition-colors p-1 rounded-full flex items-center justify-center cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
            </button>
          )}
          <div className="font-mono text-xs font-bold tracking-widest text-[#f2ca50] uppercase">
            PulseJam Studio
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="text-[#d0c5af] hover:text-[#f2ca50] hover:bg-[#383939] transition-colors active:scale-95 duration-100 p-2 rounded-full flex items-center justify-center cursor-pointer"
              title="Studio Settings & Mic Check"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}

          <button
            onClick={onOpenCalibration}
            className="text-[#d0c5af] hover:text-[#f2ca50] hover:bg-[#383939] transition-colors active:scale-95 duration-100 p-2 rounded-full flex items-center justify-center cursor-pointer"
            title="Recalibrate Acoustic Levels"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </header>

      {/* Error Status Banner */}
      {errorMessage && (
        <div className="bg-[#93000a] text-[#ffdad6] border-b border-[#ffb4ab]/40 px-6 py-2 flex items-center justify-between text-xs font-mono z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#ffb4ab] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#ffdad6] hover:text-white uppercase text-[10px] tracking-widest font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Content Canvas */}
      <main className="flex-grow flex flex-col relative pt-4 pb-12">
        <div className="flex-grow flex flex-col gap-2 px-6 mt-4 overflow-y-auto pb-24">
          {/* Multi-Lane Container (Fixed Left Sidebar Column + Unified Right Scroll Container) */}
          <div className="flex bg-[#1a1c1c] border border-[#4d4635]/30 rounded-lg overflow-hidden shadow-sm relative">
            {/* Left Column: Fixed Track Sidebars */}
            <div className="w-48 bg-[#292a2a] border-r border-[#4d4635]/30 flex flex-col shrink-0 z-30 shadow-md">
              <div className="h-8 bg-[#1f2020] border-b border-[#4d4635]/30 px-3 flex items-center text-[10px] font-mono font-bold text-[#d0c5af]/70 uppercase tracking-wider">
                TRACKS
              </div>
              {tracks.map((track, idx) => (
                <React.Fragment key={`sidebar-${track.id}`}>
                  {idx === 0 && (
                    <div className="px-3 py-1 bg-[#1a1c1c] text-[#f2ca50] font-mono text-[9px] font-bold uppercase tracking-wider border-b border-[#4d4635]/30 truncate">
                      YOUR PERFORMANCE
                    </div>
                  )}
                  {idx === 1 && (
                    <div className="px-3 py-1 bg-[#1a1c1c] text-[#d0c5af] font-mono text-[9px] font-bold uppercase tracking-wider border-b border-t border-[#4d4635]/30 flex items-center justify-between truncate">
                      <span>AI ACCOMPANIMENT</span>
                      <button
                        onClick={handleMasterAIRecordToggle}
                        disabled={isRecording && recordingTargetTrackId !== 'master-ai'}
                        className={`px-1.5 py-0.5 rounded text-[7px] font-mono font-bold tracking-wider transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                          isRecording && recordingTargetTrackId === 'master-ai'
                            ? 'bg-[#93000a] text-[#ffb4ab] border border-[#ffb4ab]/60 shadow-[0_0_8px_rgba(255,180,171,0.5)] animate-pulse'
                            : isRecording && recordingTargetTrackId !== 'master-ai'
                            ? 'bg-[#292a2a] text-[#d0c5af]/30 border border-[#4d4635]/20 cursor-not-allowed'
                            : 'bg-[#93000a]/20 text-[#ffb4ab] border border-[#ffb4ab]/40 hover:bg-[#93000a]/40'
                        }`}
                        title={
                          isRecording && recordingTargetTrackId !== 'master-ai'
                            ? `Recording isolated ${recordingTargetTrackId}`
                            : 'Record all 3 AI accompaniment voices together into one master audio take'
                        }
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-[#ffb4ab]" />
                        <span>{isRecording && recordingTargetTrackId === 'master-ai' ? 'REC MASTER...' : 'REC ALL AI'}</span>
                      </button>
                    </div>
                  )}
                  <div className={`h-32 p-2 flex flex-col justify-between border-b border-[#4d4635]/20 last:border-b-0 bg-[#292a2a] transition-opacity duration-200 ${
                    hasAnySoloed && !track.isSoloed ? 'opacity-40' : 'opacity-100'
                  }`}>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5">
                        {track.icon === 'mic' && (
                          <svg className="w-5 h-5 text-[#f2ca50] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                            <line x1="12" y1="19" x2="12" y2="22" />
                          </svg>
                        )}
                        {track.icon === 'keyboard' && (
                          <svg className="w-5 h-5 text-[#f2ca50] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="5" width="20" height="14" rx="2" />
                            <path d="M6 5v14M10 5v14M14 5v14M18 5v14" />
                          </svg>
                        )}
                        {track.icon === 'music_note' && (
                          <svg className="w-5 h-5 text-[#f2ca50] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 18V5l12-2v13" />
                            <circle cx="6" cy="18" r="3" />
                            <circle cx="18" cy="16" r="3" />
                          </svg>
                        )}
                        {track.icon === 'memory' && (
                          <svg className="w-5 h-5 text-[#f2ca50] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <rect x="9" y="9" width="6" height="6" />
                          </svg>
                        )}
                        <input
                          className="bg-transparent border-none text-[#f2ca50] font-serif text-base font-semibold focus:ring-0 p-0 w-full outline-none"
                          type="text"
                          value={track.name}
                          onChange={(e) => {
                            const newName = e.target.value;
                            setTracks((prev) =>
                              prev.map((t) => (t.id === track.id ? { ...t, name: newName } : t))
                            );
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#d0c5af]/70 font-bold uppercase">
                        {track.trackLabel}
                      </span>
                    </div>

                    <div className="flex gap-2 mt-4">
                      {/* MUTE Button */}
                      <button
                        onClick={() => handleToggleMute(track.id)}
                        className="flex flex-col items-center gap-1 group cursor-pointer"
                        title={track.type === 'audio' ? 'Mute speaker playback' : 'Mute track'}
                      >
                        <div
                          className={`w-8 h-8 rounded-full border border-[#4d4635]/50 flex items-center justify-center transition-colors shadow-sm ${
                            track.isMuted
                              ? 'bg-[#f2ca50] text-[#3c2f00] border-[#f2ca50]'
                              : 'bg-[#343535] text-[#d0c5af] hover:bg-[#383939] group-hover:text-[#f2ca50]'
                          }`}
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                          </svg>
                        </div>
                        <span className="text-[8px] font-mono text-[#d0c5af] font-bold">MUTE</span>
                      </button>

                      {/* SOLO Button */}
                      <button
                        onClick={() => handleToggleSolo(track.id)}
                        className="flex flex-col items-center gap-1 group cursor-pointer"
                        title="Solo track"
                      >
                        <div
                          className={`w-8 h-8 rounded-full border border-[#4d4635]/50 flex items-center justify-center transition-colors shadow-sm ${
                            track.isSoloed
                              ? 'bg-[#f2ca50] text-[#3c2f00] border-[#f2ca50]'
                              : 'bg-[#343535] text-[#d0c5af] hover:bg-[#383939] group-hover:text-[#f2ca50]'
                          }`}
                        >
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                            <path d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h3v-8H5v-1a7 7 0 0 1 14 0v1h-3v8h3c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z" />
                          </svg>
                        </div>
                        <span className="text-[8px] font-mono text-[#d0c5af] font-bold">SOLO</span>
                      </button>

                      {/* REC Button */}
                      <button
                        onClick={() => handleSoloRecordTrack(track)}
                        disabled={isRecording && recordingTargetTrackId === 'master-ai'}
                        className={`flex flex-col items-center gap-1 group ${
                          isRecording && recordingTargetTrackId === 'master-ai' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                        }`}
                        title={
                          isRecording && recordingTargetTrackId === 'master-ai'
                            ? 'Included in Master AI Accompaniment Recording'
                            : `Record ${track.name} in isolation`
                        }
                      >
                        <div
                          className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-sm transition-colors ${
                            track.isArmed && isRecording && (recordingTargetTrackId === track.id || recordingTargetTrackId === 'master-ai')
                              ? 'bg-[#93000a] border-[#ffb4ab] shadow-[0_0_12px_rgba(255,180,171,0.6)] animate-pulse'
                              : track.isArmed
                              ? 'bg-[#93000a]/30 border-[#ffb4ab]/60 shadow-[0_0_8px_rgba(255,180,171,0.3)]'
                              : 'bg-[#343535] border-[#4d4635]/50 hover:bg-[#383939]'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-full ${
                              track.isArmed ? 'bg-[#ffb4ab] shadow-[0_0_6px_rgba(255,180,171,0.8)]' : 'bg-[#d0c5af]'
                            }`}
                          />
                        </div>
                        <span className={`text-[8px] font-mono font-bold ${track.isArmed ? 'text-[#ffb4ab]' : 'text-[#d0c5af]'}`}>
                          {isRecording && recordingTargetTrackId === 'master-ai' ? 'INCLUDED' : 'REC'}
                        </span>
                      </button>
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>

            {/* Right Column: Unified Horizontal Scroll Container */}
            <div
              ref={timelineScrollRef}
              className="flex-grow overflow-x-auto overflow-y-hidden relative bg-[#0a0a0a]"
            >
              <div className="relative min-w-[2400px] min-h-full">
                {/* Timeline Bar Header (Click-to-seek & drag-to-scrub) */}
                <div
                  onMouseDown={handleTimelineHeaderOrCanvasMouseDown}
                  className="h-8 bg-[#141515] border-b border-[#4d4635]/30 flex items-center relative z-10 cursor-pointer select-none"
                >
                  {Array.from({ length: 20 }).map((_, barIdx) => (
                    <div
                      key={barIdx}
                      className="h-full border-r border-[#4d4635]/20 px-2 flex items-center text-[10px] font-mono text-[#d0c5af]/50 font-bold select-none shrink-0"
                      style={{ width: '120px' }}
                    >
                      <span>{barIdx + 1}</span>
                    </div>
                  ))}
                </div>

                {/* Persistent Red GarageBand Playhead Line & Knob */}
                <div
                  ref={playheadRef}
                  onMouseDown={handlePlayheadMouseDown}
                  onTouchStart={handlePlayheadTouchStart}
                  className="absolute top-0 bottom-0 w-[2px] bg-[#ff5252] shadow-[0_0_10px_rgba(255,82,82,0.9)] z-40 cursor-ew-resize opacity-100 select-none"
                  style={{ left: 0, transform: `translateX(${scrubTimeState * 60}px)` }}
                >
                  {/* Invisible wider hit area (24px centered on playhead line) */}
                  <div className="absolute top-0 bottom-0 -left-[11px] w-[24px] cursor-ew-resize" />
                  {/* Top Handle Knob (GarageBand Diamond / Handle) */}
                  <div className="absolute top-0 -left-[7px] w-4 h-8 bg-[#ff5252] rounded-b-xs shadow-[0_2px_8px_rgba(255,82,82,0.8)] flex items-center justify-center cursor-grab active:cursor-grabbing border border-white/30 z-50">
                    <div className="w-1 h-3 bg-white/60 rounded-full" />
                  </div>
                </div>

                {/* Track Row Canvases */}
                <div
                  onMouseDown={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.getAttribute('data-note-block') === 'true' || target.closest('[data-note-block="true"]')) return;
                    handleTimelineHeaderOrCanvasMouseDown(e);
                  }}
                  className="relative"
                >
                  {tracks.map((track, idx) => (
                    <React.Fragment key={`canvas-${track.id}`}>
                      {idx === 0 && (
                        <div className="px-3 py-1 bg-[#1a1c1c] text-transparent font-mono text-[9px] font-bold uppercase tracking-wider border-b border-[#4d4635]/30 select-none">
                          &nbsp;
                        </div>
                      )}
                      {idx === 1 && (
                        <div className="px-3 py-1 bg-[#1a1c1c] text-transparent font-mono text-[9px] font-bold uppercase tracking-wider border-b border-t border-[#4d4635]/30 select-none">
                          &nbsp;
                        </div>
                      )}

                      <div
                        className={`h-32 relative bg-[#0a0a0a] border-b border-[#4d4635]/20 last:border-b-0 overflow-hidden transition-opacity duration-200 ${
                          hasAnySoloed && !track.isSoloed ? 'opacity-40' : 'opacity-100'
                        }`}
                        style={{
                          backgroundImage:
                            'linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)',
                          backgroundSize: '40px 20px',
                        }}
                      >
                        {/* Live Audio Input Waveform or MIDI Note Blocks */}
                        {track.type === 'audio' ? (
                          <div className="w-full h-full flex items-center px-4 overflow-hidden">
                            {isRecording || isPlaying || waveformDisplay.length > 0 || recordedAudioUrl ? (
                              <div className="w-full h-16 flex items-center gap-1 overflow-hidden">
                                {waveformDisplay.slice(-140).map((amp, sampleIdx) => (
                                  <div
                                    key={sampleIdx}
                                    className={`w-1 rounded-full transition-all duration-75 ${
                                      isRecording
                                        ? 'bg-[#f2ca50] shadow-[0_0_8px_rgba(242,202,80,0.4)] animate-pulse'
                                        : 'bg-[#d4af37]'
                                    }`}
                                    style={{ height: `${Math.max(8, Math.min(100, amp * 100))}%` }}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs font-mono text-[#d0c5af]/50 italic">
                                Press REC to capture your live performance...
                              </div>
                            )}
                          </div>
                        ) : (
                          track.storedBars.map((bar, bIdx) => {
                            const barWidthPx = 120;
                            const barDurationSec = 2.0;
                            const barLeftPx = bar.barIndex * barWidthPx;
                            const notes = bar.noteSequence?.notes || [];

                            if (notes.length === 0) return null;

                            return (
                              <React.Fragment key={bIdx}>
                                {notes.map((n, nIdx) => {
                                  const startTimeSec =
                                    n.startTime !== undefined
                                      ? n.startTime
                                      : (n.quantizedStartStep || 0) * (barDurationSec / 16);

                                  const durationSec =
                                    n.duration !== undefined
                                      ? n.duration
                                      : ((n.quantizedEndStep || (n.quantizedStartStep || 0) + 1) -
                                          (n.quantizedStartStep || 0)) *
                                        (barDurationSec / 16);

                                  const noteLeftPx = Math.round(barLeftPx + (startTimeSec / barDurationSec) * barWidthPx);
                                  const noteWidthPx = Math.max(6, Math.round((durationSec / barDurationSec) * barWidthPx));
                                  const noteTopY = getTrackNoteTopY(n.pitch, track.type);
                                  const noteHeightPx = track.type === 'drums' ? 10 : 8;

                                  const noteName = getNoteNameLabel(n.pitch);
                                  const tooltip = `Bar ${bar.barIndex + 1} | ${noteName} (MIDI ${n.pitch}) | Start: ${startTimeSec.toFixed(2)}s | Duration: ${durationSec.toFixed(2)}s`;

                                  return (
                                    <div
                                      key={`${bIdx}-${nIdx}`}
                                      data-note-block="true"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handlePreviewSingleNote(track.type, n.pitch, durationSec);
                                      }}
                                      className="absolute rounded-xs bg-[#f2ca50] hover:bg-white shadow-[0_0_8px_rgba(242,202,80,0.6)] cursor-pointer hover:scale-105 transition-all z-20 flex items-center justify-center overflow-hidden"
                                      style={{
                                        left: `${noteLeftPx}px`,
                                        width: `${noteWidthPx}px`,
                                        top: `${noteTopY}px`,
                                        height: `${noteHeightPx}px`,
                                      }}
                                      title={tooltip}
                                    />
                                  );
                                })}
                              </React.Fragment>
                            );
                          })
                        )}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ADD TRACK Button */}
          <button
            onClick={() => setIsAddTrackOpen(true)}
            className="mt-4 w-full py-4 border-2 border-dashed border-[#4d4635]/30 rounded-lg text-[#d0c5af] hover:text-[#f2ca50] hover:border-[#f2ca50]/50 transition-all flex items-center justify-center gap-2 font-mono text-xs tracking-widest uppercase cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>ADD TRACK</span>
          </button>
        </div>
      </main>

      {/* Bottom Transport Nav */}
      <nav className="fixed bottom-0 left-0 w-full h-20 bg-[#0d0e0f] border-t border-[#4d4635]/30 flex items-center justify-between px-6 z-50 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]">
        {/* Left Side: Session Metadata */}
        <div className="flex-1 flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[24px] font-mono text-[#f2ca50] tracking-tighter leading-none">
              {formatTimecode(recordingSeconds)}
            </span>
            <span className="text-[9px] font-mono text-[#d0c5af]/50 uppercase font-bold">Timecode</span>
          </div>

          <div className="flex flex-col border-l border-[#4d4635]/20 pl-6">
            <span className="text-[18px] font-serif text-[#e3e2e2] leading-none">120.0</span>
            <span className="text-[9px] font-mono text-[#d0c5af]/50 uppercase font-bold">BPM</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[18px] font-serif text-[#e3e2e2] leading-none">C Maj</span>
            <span className="text-[9px] font-mono text-[#d0c5af]/50 uppercase font-bold">Key</span>
          </div>
        </div>

        {/* Center: Transport Controls Group */}
        <div className="flex items-center justify-center">
          <div className="flex items-center bg-[#1a1c1c] rounded-lg p-1 border border-[#4d4635]/20 shadow-inner">
            {/* PLAY Button */}
            <button
              onClick={handlePlayTransport}
              className={`w-12 h-12 flex flex-col items-center justify-center group transition-colors rounded-sm cursor-pointer ${
                isPlaying ? 'bg-[#383939] text-[#f2ca50]' : 'hover:bg-[#383939]'
              }`}
            >
              <svg className={`w-6 h-6 fill-current ${isPlaying ? 'text-[#f2ca50]' : 'text-[#d0c5af] group-hover:text-[#f2ca50]'}`} viewBox="0 0 24 24">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              <span className={`text-[8px] font-mono font-bold ${isPlaying ? 'text-[#f2ca50]' : 'text-[#d0c5af]/70'}`}>
                PLAY
              </span>
            </button>

            {/* STOP Button */}
            <button
              onClick={handleStopTransport}
              className="w-12 h-12 flex flex-col items-center justify-center group hover:bg-[#383939] transition-colors rounded-sm cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current text-[#d0c5af] group-hover:text-[#f2ca50]" viewBox="0 0 24 24">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              <span className="text-[8px] font-mono text-[#d0c5af]/70 font-bold">STOP</span>
            </button>

            {/* Global Session REC Button */}
            <button
              onClick={handleStartRecording}
              className={`w-12 h-12 flex flex-col items-center justify-center group transition-colors rounded-sm relative cursor-pointer ${
                isRecording && recordingTargetTrackId === 'all-armed' ? 'bg-[#93000a]/30' : 'bg-[#93000a]/10 hover:bg-[#93000a]/20'
              }`}
              title="Record all currently armed tracks together"
            >
              <div className="w-4 h-4 rounded-full bg-[#ffb4ab] shadow-[0_0_8px_rgba(255,180,171,0.5)] mb-0.5" />
              <span className="text-[8px] font-mono text-[#ffb4ab] font-bold">REC</span>
              {isRecording && recordingTargetTrackId === 'all-armed' && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#ffb4ab] animate-ping" />}
            </button>
          </div>
        </div>

        {/* Right Side Status */}
        <div className="flex-1 flex items-center justify-end gap-4">
          <div className="flex flex-col items-end">
            {(() => {
              const activeCal = audioEngine?.getActiveCalibration() || null;
              const currentGainDb = useAudioSettingsStore.getState().inputGainDb;
              const isCalibrated = activeCal && activeCal.isPitchVerified;
              const calibratedGain = activeCal?.calibratedAtGainDb;
              const gainDelta = isCalibrated && calibratedGain !== undefined ? currentGainDb - calibratedGain : 0;

              if (isCalibrated) {
                return (
                  <>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#81c784] uppercase">
                      <span className="w-2 h-2 rounded-full bg-[#81c784] shadow-[0_0_8px_rgba(129,199,132,0.6)]" />
                      <span>
                        INPUT STABLE {gainDelta !== 0 ? `(GAIN ADJ ${gainDelta > 0 ? `+${gainDelta}` : gainDelta}dB)` : `(CONFIDENCE: ${pitchConfidenceState ?? activeCal.pitchConfidenceScore ?? 85}%)`}
                      </span>
                    </div>
                    <span className="text-[8px] font-mono text-[#d0c5af]/80 uppercase font-bold">
                      SESSION_01 // {gainDelta !== 0 ? `AUTO-ADJUSTED THRESHOLDS` : 'CALIBRATED & VERIFIED'} // TIER: {activeTierState.toUpperCase()}
                    </span>
                  </>
                );
              }

              return (
                <>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#f2ca50] uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#f2ca50] animate-pulse" />
                    <span>DEFAULT ACOUSTIC LEVELS (UNCALIBRATED)</span>
                  </div>
                  <span className="text-[8px] font-mono text-[#d0c5af]/80 uppercase font-bold">
                    SESSION_01 // RUNNING ON DEFAULT FALLBACK THRESHOLDS // TIER: {activeTierState.toUpperCase()}
                  </span>
                </>
              );
            })()}
          </div>
        </div>
      </nav>

      {/* Stitch Add Track Modal */}
      <AddTrackModal
        isOpen={isAddTrackOpen}
        onClose={() => setIsAddTrackOpen(false)}
        onAddTrack={handleAddTrackSubmit}
      />
    </div>
  );
}
