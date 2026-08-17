/**
 * DynamicArranger.ts - Intelligent Musical Structure & Dynamic Section Engine
 *
 * Manages song arrangement lifecycle, bar-boundary transitions, and real-time fill triggers:
 * 1. Section State Machine (Intro -> Verse -> PreChorus -> Chorus -> Solo -> Breakdown -> Outro).
 * 2. Bar & Beat Synchronization (4/4 time, 4-bar and 8-bar phrasing marks).
 * 3. Energy-Triggered Drum Fills & Transition Crashes.
 * 4. Half-Time / Double-Time rhythmic feel modifications.
 */

export type SongSection =
  | 'intro'
  | 'verse'
  | 'preChorus'
  | 'chorus'
  | 'solo'
  | 'breakdown'
  | 'outro';

export type RhythmicFeel = 'standard' | 'halfTime' | 'doubleTime';

export interface ArrangerState {
  currentSection: SongSection;
  currentBar: number;
  currentBeat: number; // 1 to 4
  totalBarsPlayed: number;
  feel: RhythmicFeel;
  isFillQueued: boolean;
  isFillActive: boolean;
  energyLevel: number; // 0.0 - 1.0
  sectionProgress: number; // 0.0 - 1.0
}

export interface DynamicArrangerCallbacks {
  onSectionChanged?: (section: SongSection, bar: number) => void;
  onBarTriggered?: (bar: number, beat: number) => void;
  onDrumFillTriggered?: (bar: number) => void;
}

export class DynamicArranger {
  private section: SongSection = 'verse';
  private currentBar: number = 1;
  private currentBeat: number = 1;
  private totalBarsPlayed: number = 0;
  private feel: RhythmicFeel = 'standard';
  private isFillQueued: boolean = false;
  private isFillActive: boolean = false;
  private energyLevel: number = 0.3;
  private sectionLengthBars: number = 8; // default 8 bars per section

  private callbacks: DynamicArrangerCallbacks = {};
  private lastBeatTime: number = 0;

  constructor(callbacks?: DynamicArrangerCallbacks) {
    if (callbacks) this.callbacks = callbacks;
    this.reset();
  }

  public reset(): void {
    this.section = 'verse';
    this.currentBar = 1;
    this.currentBeat = 1;
    this.totalBarsPlayed = 0;
    this.feel = 'standard';
    this.isFillQueued = false;
    this.isFillActive = false;
    this.energyLevel = 0.3;
    this.lastBeatTime = 0;
  }

  /**
   * Called by TempoTracker on every detected musical beat
   */
  public advanceBeat(timestampMs: number, liveEnergy: number = 0.3): ArrangerState {
    this.lastBeatTime = timestampMs;
    this.energyLevel = this.energyLevel * 0.7 + liveEnergy * 0.3;

    // Advance beat (1 -> 2 -> 3 -> 4)
    this.currentBeat++;
    if (this.currentBeat > 4) {
      this.currentBeat = 1;
      this.advanceBar();
    }

    // Check if drum fill should be activated on beat 4 of transition bar
    if (this.currentBeat === 4 && (this.currentBar % 4 === 0 || this.isFillQueued)) {
      this.isFillActive = true;
      if (this.callbacks.onDrumFillTriggered) {
        this.callbacks.onDrumFillTriggered(this.currentBar);
      }
    } else if (this.currentBeat === 1) {
      this.isFillActive = false;
      this.isFillQueued = false;
    }

    if (this.callbacks.onBarTriggered) {
      this.callbacks.onBarTriggered(this.currentBar, this.currentBeat);
    }

    return this.getState();
  }

  private advanceBar(): void {
    this.currentBar++;
    this.totalBarsPlayed++;

    // Check for automatic section evolution
    if (this.currentBar > this.sectionLengthBars) {
      this.currentBar = 1;
      this.evolveSection();
    }
  }

  private evolveSection(): void {
    let nextSection: SongSection = this.section;

    // Section progression logic based on energy level
    switch (this.section) {
      case 'intro':
        nextSection = 'verse';
        this.sectionLengthBars = 8;
        break;
      case 'verse':
        nextSection = this.energyLevel > 0.6 ? 'preChorus' : 'verse';
        this.sectionLengthBars = 8;
        break;
      case 'preChorus':
        nextSection = 'chorus';
        this.sectionLengthBars = 8;
        break;
      case 'chorus':
        nextSection = this.energyLevel > 0.75 ? 'solo' : 'verse';
        this.sectionLengthBars = 8;
        break;
      case 'solo':
        nextSection = 'breakdown';
        this.sectionLengthBars = 4;
        break;
      case 'breakdown':
        nextSection = 'chorus';
        this.sectionLengthBars = 8;
        break;
      case 'outro':
        nextSection = 'outro';
        this.sectionLengthBars = 8;
        break;
      default:
        nextSection = 'verse';
    }

    this.setSection(nextSection);
  }

  public setSection(newSection: SongSection): void {
    this.section = newSection;
    this.currentBar = 1;
    this.currentBeat = 1;
    if (this.callbacks.onSectionChanged) {
      this.callbacks.onSectionChanged(this.section, this.totalBarsPlayed);
    }
  }

  public triggerFill(): void {
    this.isFillQueued = true;
  }

  public setFeel(feel: RhythmicFeel): void {
    this.feel = feel;
  }

  public getState(): ArrangerState {
    const progress = Math.min(1, ((this.currentBar - 1) * 4 + this.currentBeat) / (this.sectionLengthBars * 4));
    return {
      currentSection: this.section,
      currentBar: this.currentBar,
      currentBeat: this.currentBeat,
      totalBarsPlayed: this.totalBarsPlayed,
      feel: this.feel,
      isFillQueued: this.isFillQueued,
      isFillActive: this.isFillActive,
      energyLevel: this.energyLevel,
      sectionProgress: progress,
    };
  }
}
