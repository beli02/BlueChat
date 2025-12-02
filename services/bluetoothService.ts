import { UART_SERVICE_UUID, UART_RX_CHAR_UUID, UART_TX_CHAR_UUID, ChatMessage } from '../types';

// Types for Web Bluetooth API (Partial)
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  value?: DataView;
}

// Mock Data for Simulation
const MOCK_DEVICES = [
  { id: 'mock-1', name: 'iPhone 13 Pro (Sim)', rssi: -45 },
  { id: 'mock-2', name: 'Galaxy S23 (Sim)', rssi: -62 },
  { id: 'mock-3', name: 'ESP32_UART_DEVICE', rssi: -80 },
];

const MOCK_RESPONSES = [
  "Привет! Связь стабильная.",
  "Данные получены.",
  "Это тестовое сообщение через Bluetooth симуляцию.",
  "Классный интерфейс!",
  "Офлайн чат работает отлично."
];

export class BluetoothService {
  private device: any = null;
  private server: any = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onMessageCallback: ((msg: string) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  
  // State for simulation
  private isSimulation: boolean = true; 

  constructor() {
    // Check if browser supports Bluetooth
    if ('bluetooth' in navigator) {
      this.isSimulation = false;
    } else {
      console.warn("Web Bluetooth not supported. Falling back to simulation.");
      this.isSimulation = true;
    }
  }

  setSimulationMode(enabled: boolean) {
    this.isSimulation = enabled;
  }

  getIsSimulation() {
    return this.isSimulation;
  }

  async scan(): Promise<any[]> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(MOCK_DEVICES);
        }, 1500);
      });
    }

    try {
      // In a real app, we scan for devices advertising the UART service
      // Note: requestDevice requires a user gesture
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [UART_SERVICE_UUID] }],
        optionalServices: [UART_SERVICE_UUID]
      });
      return [{ id: device.id, name: device.name || 'Unknown Device', rssi: -50 }];
    } catch (error) {
      console.error('Scan error:', error);
      throw error;
    }
  }

  async connect(deviceId: string): Promise<void> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }

    // Recover device instance from previous scan (Web Bluetooth flow usually returns the device object directly from requestDevice)
    console.log("Connecting to specific ID is restricted in Web Bluetooth. Re-using cached device if available.");
  }

  // Helper to attach to a real Web Bluetooth Device object
  async connectToDeviceObject(device: any): Promise<void> {
    this.device = device;
    device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

    this.server = await device.gatt.connect();
    const service = await this.server.getPrimaryService(UART_SERVICE_UUID);
    
    this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHAR_UUID);
    this.txCharacteristic = await service.getCharacteristic(UART_TX_CHAR_UUID);

    await this.txCharacteristic?.startNotifications();
    this.txCharacteristic?.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));
  }

  async send(text: string): Promise<void> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(() => {
          // Echo back a response randomly
          if (Math.random() > 0.3 && this.onMessageCallback) {
            setTimeout(() => {
              const randomResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
              this.onMessageCallback!(randomResponse);
            }, 2000);
          }
          resolve();
        }, 300);
      });
    }

    if (!this.rxCharacteristic) throw new Error("Not connected");

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    await this.rxCharacteristic.writeValue(data);
  }

  onMessage(callback: (msg: string) => void) {
    this.onMessageCallback = callback;
  }

  onDisconnect(callback: () => void) {
    this.onDisconnectCallback = callback;
  }

  disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
  }

  private cleanup() {
    this.device = null;
    this.server = null;
    this.rxCharacteristic = null;
    this.txCharacteristic = null;
    if (this.onDisconnectCallback) this.onDisconnectCallback();
  }

  private handleDisconnect() {
    console.log('Device disconnected');
    this.cleanup();
  }

  private handleCharacteristicValueChanged(event: any) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(value);
    if (this.onMessageCallback) {
      this.onMessageCallback(text);
    }
  }
}

export const bluetoothService = new BluetoothService();