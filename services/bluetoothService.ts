
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
   * In Real mode: Opens the browser picker. If user selects a device, we CACHE it.
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
      console.log("Requesting Bluetooth Device...");
      // In a real app, we scan for devices advertising the UART service
      // Note: requestDevice requires a user gesture (this function must be called from a click handler)
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [UART_SERVICE_UUID] }],
        optionalServices: [UART_SERVICE_UUID]
      });

      console.log("Device selected by user:", device.name);
      
      // CACHE THE DEVICE so we can connect to it later without asking again
      this.device = device;
      
      // Return a displayable object
      return [{ id: device.id, name: device.name || 'Неизвестное устройство', rssi: -50 }];
    } catch (error) {
      console.error('Scan error:', error);
      throw error;
    }
  }

  /**
   * Connects to the device.
   * In Real mode: Uses the CACHED device from the scan step.
   */
  async connect(deviceId: string): Promise<void> {
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(resolve, 1000);
      });
    }

    // Check if we have a device cached from the scan step
    if (!this.device) {
      throw new Error("Устройство не выбрано. Пожалуйста, выполните поиск снова.");
    }

    // Double check IDs match (though with privacy enabled, IDs might rotate, so we mostly trust the instance)
    if (this.device.id !== deviceId) {
      console.warn("Connecting to a different ID than scanned? Proceeding with cached device anyway.");
    }

    await this.connectToDeviceObject(this.device);
  }

  // Helper to attach to a real Web Bluetooth Device object
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
      console.error("Connection failed:", err);
      this.disconnect(); // Cleanup
      throw err;
    }
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
