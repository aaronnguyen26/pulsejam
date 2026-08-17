/**
 * PulseJam Stage 3 — WebMIDIManager (Hardware Footswitch & Controller Engine)
 *
 * Connects standard USB/Bluetooth MIDI pedalboards and footswitches (e.g. Line 6 FBV,
 * Behringer FCB1010, iRig BlueBoard, standard sustain pedals) to PulseJam studio controls.
 *
 * Supported Actions:
 * - CC#64 (Sustain Pedal): TOGGLE_RECORD / TAP_TEMPO
 * - CC#80: TOGGLE_RECORD
 * - CC#81: TIER_UP
 * - CC#82: TIER_DOWN
 * - CC#83: COUNT_IN
 * - CC#84: MUTE_MIC
 * - CC#85: MUTE_AI
 */

import { MIDIFootswitchAction } from './types';

export interface WebMIDIManagerOptions {
  customCcMappings?: Record<number, MIDIFootswitchAction['action']>;
  onActionTriggered?: (action: MIDIFootswitchAction['action'], value: number) => void;
  onDeviceConnected?: (deviceName: string) => void;
  onDeviceDisconnected?: (deviceName: string) => void;
}

const DEFAULT_CC_MAPPINGS: Record<number, MIDIFootswitchAction['action']> = {
  64: 'TOGGLE_RECORD', // Sustain Pedal (standard)
  80: 'TOGGLE_RECORD',
  81: 'TIER_UP',
  82: 'TIER_DOWN',
  83: 'COUNT_IN',
  84: 'MUTE_MIC',
  85: 'MUTE_AI',
};

export class WebMIDIManager {
  private midiAccess: any = null;
  private isSupported: boolean = false;
  private isConnected: boolean = false;
  private connectedDevices: string[] = [];
  private ccMappings: Record<number, MIDIFootswitchAction['action']>;

  private onActionTriggered?: (action: MIDIFootswitchAction['action'], value: number) => void;
  private onDeviceConnected?: (deviceName: string) => void;
  private onDeviceDisconnected?: (deviceName: string) => void;

  constructor(options: WebMIDIManagerOptions = {}) {
    this.ccMappings = { ...DEFAULT_CC_MAPPINGS, ...options.customCcMappings };
    this.onActionTriggered = options.onActionTriggered;
    this.onDeviceConnected = options.onDeviceConnected;
    this.onDeviceDisconnected = options.onDeviceDisconnected;
  }

  public async initialize(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !('requestMIDIAccess' in navigator)) {
      this.isSupported = false;
      return false;
    }

    try {
      this.midiAccess = await (navigator as any).requestMIDIAccess({ sysex: false });
      this.isSupported = true;
      this.scanDevices();

      this.midiAccess.onstatechange = (event: any) => {
        this.scanDevices();
        if (event.port?.state === 'connected') {
          this.onDeviceConnected?.(event.port.name || 'MIDI Device');
        } else if (event.port?.state === 'disconnected') {
          this.onDeviceDisconnected?.(event.port.name || 'MIDI Device');
        }
      };

      return true;
    } catch {
      this.isSupported = false;
      return false;
    }
  }

  public scanDevices(): string[] {
    if (!this.midiAccess) return [];

    const devices: string[] = [];
    const inputs = this.midiAccess.inputs.values();

    for (const input of inputs) {
      devices.push(input.name || 'Generic MIDI Input');
      input.onmidimessage = (event: any) => this.handleMIDIMessage(event);
    }

    this.connectedDevices = devices;
    this.isConnected = devices.length > 0;
    return devices;
  }

  public handleMIDIMessage(event: { data: Uint8Array }): void {
    if (!event || !event.data || event.data.length < 3) return;

    const [status, data1, data2] = event.data;
    const messageType = status & 0xf0;

    // Control Change (CC) message (0xB0..0xBF)
    if (messageType === 0xb0) {
      const ccNumber = data1;
      const ccValue = data2;

      // Handle momentary vs toggle footswitches: trigger only on press (ccValue >= 64)
      if (ccValue >= 64) {
        const action = this.ccMappings[ccNumber];
        if (action) {
          this.onActionTriggered?.(action, ccValue);
        }
      }
    }
  }

  public setCCMapping(ccNumber: number, action: MIDIFootswitchAction['action']): void {
    this.ccMappings[ccNumber] = action;
  }

  public getConnectedDevices(): string[] {
    return this.connectedDevices;
  }

  public getStatus(): { isSupported: boolean; isConnected: boolean; deviceCount: number } {
    return {
      isSupported: this.isSupported,
      isConnected: this.isConnected,
      deviceCount: this.connectedDevices.length,
    };
  }

  public disconnect(): void {
    if (this.midiAccess) {
      const inputs = this.midiAccess.inputs.values();
      for (const input of inputs) {
        input.onmidimessage = null;
      }
      this.midiAccess.onstatechange = null;
      this.midiAccess = null;
    }
    this.isConnected = false;
    this.connectedDevices = [];
  }
}
