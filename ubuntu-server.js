
/*
  UBUNTU BLUETOOTH SERVER (PERIPHERAL)
  ------------------------------------
  Run this script on your Ubuntu machine to simulate a Chat Partner.
  
  PREREQUISITES:
  1. Install libraries: sudo apt-get install bluetooth bluez libbluetooth-dev libudev-dev
  2. Install Node packages: npm install bleno
  3. Run with sudo: sudo node ubuntu-server.js

  This will advertise the "BlueChat Host" device that your Android phone can connect to.
*/

const bleno = require('bleno');

// Nordic UART Service UUIDs (Must match the App's types.ts)
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify (Sending to Phone)
const RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write (Receiving from Phone)

let updateValueCallback = null;

// Define the TX Characteristic (Phone subscribes to this to get messages)
const TxCharacteristic = new bleno.Characteristic({
  uuid: TX_UUID,
  properties: ['notify'],
  onSubscribe: function(maxValueSize, updateValueCallbackRef) {
    console.log('Phone subscribed to notifications (Connected)');
    updateValueCallback = updateValueCallbackRef;
    
    // Send a welcome message after 1 second
    setTimeout(() => {
      sendMessage("Привет из Ubuntu! Я готов к общению.");
    }, 1000);
  },
  onUnsubscribe: function() {
    console.log('Phone unsubscribed (Disconnected)');
    updateValueCallback = null;
  }
});

// Define the RX Characteristic (Phone writes to this)
const RxCharacteristic = new bleno.Characteristic({
  uuid: RX_UUID,
  properties: ['write', 'writeWithoutResponse'],
  onWriteRequest: function(data, offset, withoutResponse, callback) {
    const message = data.toString('utf-8');
    console.log(`Received from Phone: ${message}`);
    
    callback(this.RESULT_SUCCESS);

    // Auto-reply logic for testing
    setTimeout(() => {
      sendMessage(`Вы сказали: "${message}"`);
    }, 500);
  }
});

// Helper to send data to phone
function sendMessage(text) {
  if (updateValueCallback) {
    console.log(`Sending: ${text}`);
    const data = Buffer.from(text, 'utf-8');
    updateValueCallback(data);
  }
}

// Start Advertising
bleno.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('Bluetooth ON. Advertising "BlueChat Host"...');
    bleno.startAdvertising('BlueChat Host', [SERVICE_UUID]);
  } else {
    bleno.stopAdvertising();
  }
});

bleno.on('advertisingStart', function(error) {
  if (!error) {
    bleno.setServices([
      new bleno.PrimaryService({
        uuid: SERVICE_UUID,
        characteristics: [TxCharacteristic, RxCharacteristic]
      })
    ]);
  } else {
    console.error('Advertising error:', error);
  }
});

console.log("Starting BlueChat Server...");