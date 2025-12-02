export interface BluetoothDeviceDisplay {
  id: string;
  name: string;
  rssi?: number; // Signal strength
  status: 'available' | 'connecting' | 'connected' | 'error';
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'partner' | 'system';
  timestamp: number;
  isPending?: boolean;
}

export enum AppView {
  SCANNER = 'SCANNER',
  CHAT = 'CHAT',
}

// Nordic UART Service UUIDs (Standard for BLE Chat)
export const UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
export const UART_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write
export const UART_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify
