
import { UART_SERVICE_UUID, UART_RX_CHAR_UUID, UART_TX_CHAR_UUID } from '../types';

// Types for Web Bluetooth API (Partial)
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  value?: DataView;
}

export class BluetoothService {
  private device: any = null;
  private server: any = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onMessageCallback: ((msg: string) => void) | null = null;
  private onDisconnectCallback: (() => void) | null = null;
  
  // Simulation flag
  public isSimulation: boolean = false; 

  constructor() {
    if (!('bluetooth' in navigator)) {
      console.warn("Web Bluetooth not supported on this browser.");
    }
  }

  setSimulationMode(enabled: boolean) {
    this.isSimulation = enabled;
  }

  async scan(): Promise<any[]> {
    // SIMULATION MODE
    if (this.isSimulation) {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { id: 'sim-1', name: 'Demo Chat Partner', rssi: -45, status: 'available' }
          ]);
        }, 800);
      });
    }

    // REAL BLUETOOTH MODE
    try {
      console.log("Starting Scan (Accept All Devices)...");
      
      // We use acceptAllDevices: true to bypass any UUID/Name filtering issues.
      // This forces the phone to show everything, allowing the user to pick "BlueChat" manually.
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [UART_SERVICE_UUID] 
      });

      console.log("Device selected:", device.name);
      this.device = device;
      
      return [{ id: device.id, name: device.name || 'Unnamed Device', rssi: -50, status: 'available' }];
    } catch (error) {
      console.error('Scan error:', error);
      throw error;
    }
  }

  async connect(deviceId: string): Promise<void> {
    if (this.isSimulation) {
      this.simulateConnection();
      return;
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
      // Simulate reply
      setTimeout(() => {
        if (this.onMessageCallback) this.onMessageCallback(`Эхо: ${text}`);
      }, 1000);
      return;
    }

    if (!this.rxCharacteristic) throw new Error("Нет соединения");

    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    await this.rxCharacteristic.writeValue(data);
  }

  // ... Rest of the simulation helpers ...
  private simulateConnection() {
    setTimeout(() => {
      // Fake success
    }, 500);
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
