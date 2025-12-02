
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

  /**
   * Scans for devices.
   * Brave/Android Note: We must use 'filters' with specific UUIDs. 
   * 'acceptAllDevices' is often blocked by privacy shields.
   */
  async scan(): Promise<any[]> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(MOCK_DEVICES);
        }, 1500);
      });
    }

    try {
      console.log("Starting Scan...");
      
      // CRITICAL UPDATE: 
      // 1. Look for Service UUID (Standard)
      // 2. OR Look for Name 'BlueChat' (Fallback if Linux drops UUID from packet)
      // 3. Must include optionalServices to access the UART service if matched by Name.
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { services: [UART_SERVICE_UUID] },
          { name: 'BlueChat' }
        ],
        optionalServices: [UART_SERVICE_UUID]
      });

      console.log("Device selected by user:", device.name);
      
      // CACHE THE DEVICE
      this.device = device;
      
      return [{ id: device.id, name: device.name || 'Неизвестное устройство', rssi: -50 }];
    } catch (error) {
      console.error('Scan error:', error);
      throw error;
    }
  }

  /**
   * Connects to the device.
   * Uses the cached device object to avoid asking permission twice.
   */
  async connect(deviceId: string): Promise<void> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }

    if (!this.device) {
      throw new Error("Устройство не выбрано (No Device Cache)");
    }

    await this.connectToDeviceObject(this.device);
  }

  async connectToDeviceObject(device: any): Promise<void> {
    try {
      this.device = device;
      device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

      console.log("Connecting to GATT Server...");
      this.server = await device.gatt.connect();
      
      console.log("Getting Primary Service...");
      const service = await this.server.getPrimaryService(UART_SERVICE_UUID);
      
      console.log("Getting Characteristics...");
      this.rxCharacteristic = await service.getCharacteristic(UART_RX_CHAR_UUID);
      this.txCharacteristic = await service.getCharacteristic(UART_TX_CHAR_UUID);

      console.log("Starting Notifications...");
      await this.txCharacteristic?.startNotifications();
      this.txCharacteristic?.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));
      console.log("Connected successfully!");
    } catch (err) {
      console.error("Connection failed details:", err);
      this.disconnect();
      throw err;
    }
  }

  async send(text: string): Promise<void> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(() => {
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

    if (!this.rxCharacteristic) throw new Error("Нет соединения");

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
    if (this.device && this.device.gatt && this.device.gatt.connected) {
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
