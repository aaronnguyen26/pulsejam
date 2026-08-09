import {
  AIGenerationLogEntry,
  AIGenerationMetrics,
  MIDINoteEvent,
  NoteSequencePayload,
  PerformanceTier,
} from './types';
import { MIDISynthEngine } from './MIDISynthEngine';
import { getTemperatureForTier } from './magentaLogic';

type AIGenMetricsCallback = (metrics: AIGenerationMetrics) => void;
type AIGenLogCallback = (entry: AIGenerationLogEntry) => void;

/**
 * AIGenerationEngine
 *
 * Manages bar-boundary lookahead AI generation & Worker message passing.
 * Operates at 120 BPM (2.0s per bar). Triggers 1-bar lookahead inference at bar N downbeat,
 * and schedules synthesized MIDI playback at bar N+1 downbeat with graceful fallback.
 */
export class AIGenerationEngine {
  private ctx: AudioContext;
  private synth: MIDISynthEngine;
  private worker: Worker | null = null;

  private isWorkerReady = false;
  private isActive = false;

  private bpm = 120;
  private secondsPerBar = 2.0; // 4 beats * (60 / 120)
  private startTime = 0;
  private timerId: NodeJS.Timeout | null = null;

  private currentBarIndex = 0;
  private pendingGenerations: Map<number, { drums: NoteSequencePayload | null; melody: NoteSequencePayload | null; bass: NoteSequencePayload | null; latencyMs: number }> = new Map();
  private lastGeneratedBar: { drums: NoteSequencePayload | null; melody: NoteSequencePayload | null; bass: NoteSequencePayload | null } | null = null;

  private latencyLogs: AIGenerationLogEntry[] = [];
  private metricsListeners: Set<AIGenMetricsCallback> = new Set();
  private logListeners: Set<AIGenLogCallback> = new Set();

  private bufferedNotes: MIDINoteEvent[] = [];
  private activeTier: PerformanceTier = 'groove';

  constructor(ctx: AudioContext, synth: MIDISynthEngine) {
    this.ctx = ctx;
    this.synth = synth;
  }

  public initializeWorker(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        this.worker = new Worker(new URL('./magenta-worker.ts', import.meta.url));
        this.worker.onmessage = (event) => this.handleWorkerMessage(event.data);
        this.worker.postMessage({ type: 'INIT_WORKER' });

        // Resolve ready status
        const checkReady = setInterval(() => {
          if (this.isWorkerReady) {
            clearInterval(checkReady);
            resolve(true);
          }
        }, 100);

        // Fallback resolve after 3 seconds if worker initialized algorithmic fallback
        setTimeout(() => {
          clearInterval(checkReady);
          this.isWorkerReady = true;
          this.notifyMetrics();
          resolve(true);
        }, 3000);
      } catch (err) {
        console.warn('Failed to spawn Magenta Web Worker:', err);
        this.isWorkerReady = true; // Fallback mode active
        resolve(true);
      }
    });
  }

  public start(startOffsetSec: number = 0) {
    if (this.isActive) return;
    this.isActive = true;
    this.currentBarIndex = Math.floor(startOffsetSec / this.secondsPerBar);
    this.startTime = (this.ctx.currentTime + 0.05) - startOffsetSec;

    // Align bar boundary loop
    this.scheduleNextBarBoundary();
    this.notifyMetrics();
  }

  public stop() {
    this.isActive = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.notifyMetrics();
  }

  public updateBufferedNotes(notes: MIDINoteEvent[]) {
    this.bufferedNotes = notes;
  }

  public setActiveTier(tier: PerformanceTier) {
    this.activeTier = tier;
  }

  private scheduleNextBarBoundary() {
    if (!this.isActive) return;

    const now = this.ctx.currentTime;
    const elapsed = now - this.startTime;
    const nextBarNumber = Math.floor(elapsed / this.secondsPerBar) + 1;
    const nextBarTime = this.startTime + nextBarNumber * this.secondsPerBar;

    // 1. Process Playback for Upcoming Bar (N+1)
    const targetBarToPlay = nextBarNumber;
    const genResult = this.pendingGenerations.get(targetBarToPlay);

    let isFallback = false;
    let playDrums: NoteSequencePayload | null = null;
    let playMelody: NoteSequencePayload | null = null;
    let playBass: NoteSequencePayload | null = null;

    if (genResult) {
      playDrums = genResult.drums;
      playMelody = genResult.melody;
      playBass = genResult.bass;
      this.lastGeneratedBar = { drums: playDrums, melody: playMelody, bass: playBass };
      this.pendingGenerations.delete(targetBarToPlay);
    } else if (this.lastGeneratedBar) {
      // Graceful Fallback: Repeat previous bar if Worker computation is delayed
      playDrums = this.lastGeneratedBar.drums;
      playMelody = this.lastGeneratedBar.melody;
      playBass = this.lastGeneratedBar.bass;
      isFallback = true;
    }

    if (playDrums || playMelody || playBass) {
      this.synth.scheduleBarPlayback(playDrums, playMelody, playBass, nextBarTime, this.bpm);
    }

    // 2. Trigger 1-Bar Lookahead Generation Request for Bar (N+2)
    const targetBarToGenerate = nextBarNumber + 1;
    this.requestBarGeneration(targetBarToGenerate);

    // Schedule next bar tick ~50ms before boundary
    const delayMs = Math.max(20, (nextBarTime - now - 0.05) * 1000);
    this.timerId = setTimeout(() => this.scheduleNextBarBoundary(), delayMs);
  }

  private requestBarGeneration(targetBarIndex: number) {
    if (!this.worker || !this.isWorkerReady) return;

    // Format current primed sequence (self-continuation chain + live pitch blending)
    const primedSeq = this.getPrimedSequenceForBar(targetBarIndex);

    const temperature = getTemperatureForTier(this.activeTier);

    this.worker.postMessage({
      type: 'GENERATE_BAR',
      payload: {
        primedSequence: primedSeq,
        stepsPerBar: 16,
        temperature,
        activeTier: this.activeTier,
        barIndex: targetBarIndex,
      },
    });
  }

  public getPrimedSequenceForBar(targetBarIndex: number): NoteSequencePayload {
    const liveNotesFormatted: MIDINoteEvent[] = this.bufferedNotes.map((n) => ({
      pitch: n.pitch,
      velocity: n.velocity,
      startTime: Math.max(0, Math.min(this.secondsPerBar, n.startTime % this.secondsPerBar)),
      duration: Math.max(0.1, n.duration),
    }));

    const lastMelodyNotes = this.lastGeneratedBar?.melody?.notes || [];

    // Case 1: First bar of session (seed ONLY on bar 1 if no live input)
    if (targetBarIndex <= 1 && lastMelodyNotes.length === 0) {
      if (liveNotesFormatted.length > 0) {
        return {
          notes: liveNotesFormatted,
          totalTime: this.secondsPerBar,
          qpm: this.bpm,
          quantizationInfo: { stepsPerQuarter: 4 },
        };
      }
      return {
        notes: [
          { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5 },
          { pitch: 64, velocity: 0.8, startTime: 0.5, duration: 0.5 },
          { pitch: 67, velocity: 0.8, startTime: 1.0, duration: 0.5 },
        ],
        totalTime: this.secondsPerBar,
        qpm: this.bpm,
        quantizationInfo: { stepsPerQuarter: 4 },
      };
    }

    // Case 2: Subsequent bars (self-continuation chain default when silent)
    if (liveNotesFormatted.length === 0) {
      const chainNotes: MIDINoteEvent[] = lastMelodyNotes.map((n) => {
        const start = n.startTime ?? ((n.quantizedStartStep || 0) * 0.125);
        const dur = n.duration ?? (((n.quantizedEndStep || 2) - (n.quantizedStartStep || 0)) * 0.125);
        return {
          pitch: n.pitch,
          velocity: n.velocity || 0.8,
          startTime: start,
          duration: Math.max(0.1, dur),
        };
      });

      return {
        notes: chainNotes.length > 0 ? chainNotes : [
          { pitch: 60, velocity: 0.8, startTime: 0, duration: 0.5 },
          { pitch: 64, velocity: 0.8, startTime: 0.5, duration: 0.5 },
          { pitch: 67, velocity: 0.8, startTime: 1.0, duration: 0.5 },
        ],
        totalTime: this.secondsPerBar,
        qpm: this.bpm,
        quantizationInfo: { stepsPerQuarter: 4 },
      };
    }

    // Case 3: Blend live pitch into self-continuation chain
    const blendedNotes: MIDINoteEvent[] = [...liveNotesFormatted];

    for (const chainNote of lastMelodyNotes) {
      const chainStart = chainNote.startTime ?? ((chainNote.quantizedStartStep || 0) * 0.125);
      const chainDur = chainNote.duration ?? (((chainNote.quantizedEndStep || 2) - (chainNote.quantizedStartStep || 0)) * 0.125);
      const chainEnd = chainStart + chainDur;

      const hasLiveOverlap = liveNotesFormatted.some((liveNote) => {
        const liveEnd = liveNote.startTime + liveNote.duration;
        return liveNote.startTime < chainEnd + 0.15 && liveEnd > chainStart - 0.15;
      });

      if (!hasLiveOverlap) {
        blendedNotes.push({
          pitch: chainNote.pitch,
          velocity: chainNote.velocity || 0.7,
          startTime: chainStart,
          duration: Math.max(0.1, chainDur),
        });
      }
    }

    blendedNotes.sort((a, b) => a.startTime - b.startTime);

    return {
      notes: blendedNotes,
      totalTime: this.secondsPerBar,
      qpm: this.bpm,
      quantizationInfo: { stepsPerQuarter: 4 },
    };
  }

  private handleWorkerMessage(data: { type: string; payload: unknown }) {
    if (!data || !data.type) return;

    if (data.type === 'WORKER_READY') {
      this.isWorkerReady = true;
      this.notifyMetrics();
    } else if (data.type === 'BAR_GENERATED') {
      const { drumsSequence, melodySequence, bassSequence, barIndex, generationLatencyMs } = data.payload as {
        drumsSequence: NoteSequencePayload;
        melodySequence: NoteSequencePayload;
        bassSequence?: NoteSequencePayload;
        barIndex: number;
        generationLatencyMs: number;
      };

      this.pendingGenerations.set(barIndex, {
        drums: drumsSequence,
        melody: melodySequence,
        bass: bassSequence || null,
        latencyMs: generationLatencyMs,
      });

      const entry: AIGenerationLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        barIndex,
        generationLatencyMs,
        isFallback: false,
        timestamp: Date.now(),
        drumNotesCount: drumsSequence?.notes?.length || 0,
        melodyNotesCount: melodySequence?.notes?.length || 0,
      };

      this.addLogEntry(entry);
    }
  }

  private addLogEntry(entry: AIGenerationLogEntry) {
    this.latencyLogs = [entry, ...this.latencyLogs].slice(0, 10); // Keep last 10 entries
    this.notifyLog(entry);
    this.notifyMetrics();
  }

  public getLatencyLogs(): AIGenerationLogEntry[] {
    return this.latencyLogs;
  }

  public clearLogs() {
    this.latencyLogs = [];
    this.notifyMetrics();
  }

  public subscribeMetrics(cb: AIGenMetricsCallback): () => void {
    this.metricsListeners.add(cb);
    return () => this.metricsListeners.delete(cb);
  }

  public subscribeLogs(cb: AIGenLogCallback): () => void {
    this.logListeners.add(cb);
    return () => this.logListeners.delete(cb);
  }

  private notifyMetrics() {
    const latencies = this.latencyLogs.map((l) => l.generationLatencyMs);
    const median =
      latencies.length > 0
        ? [...latencies].sort((a, b) => a - b)[Math.floor(latencies.length / 2)]
        : null;

    const metrics: AIGenerationMetrics = {
      appMode: 'ai-gen',
      isWorkerReady: this.isWorkerReady,
      currentPitch: null,
      activeNoteName: null,
      lastGenLatencyMs: this.latencyLogs.length > 0 ? this.latencyLogs[0].generationLatencyMs : null,
      medianGenLatencyMs: median,
      isFallbackActive: this.latencyLogs.length > 0 ? this.latencyLogs[0].isFallback : false,
      totalBarsGenerated: this.latencyLogs.length,
    };

    this.metricsListeners.forEach((cb) => cb(metrics));
  }

  private notifyLog(entry: AIGenerationLogEntry) {
    this.logListeners.forEach((cb) => cb(entry));
  }

  public destroy() {
    this.stop();
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
