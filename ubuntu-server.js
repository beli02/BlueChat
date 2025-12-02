
/*
  UBUNTU BLUETOOTH SERVER (PERIPHERAL)
  ------------------------------------
*/

const { exec } = require('child_process');

console.log("Initializing...");
console.log("Resetting Bluetooth Adapter (hci0)...");

// FORCE RESET BLUETOOTH ADAPTER
exec('sudo hciconfig hci0 down && sudo hciconfig hci0 up', (err, stdout, stderr) => {
  if (err) {
    console.error("Warning: Could not reset bluetooth adapter (sudo needed?)");
    console.error(err);
  } else {
    console.log("Bluetooth Adapter Reset Complete.");
  }
  startBleno();
});

function startBleno() {
  let bleno;
  try {
    bleno = require('@abandonware/bleno');
  } catch (e) {
    try {
      bleno = require('bleno');
    } catch (e2) {
      console.error("ERROR: Run 'npm install @abandonware/bleno'");
      process.exit(1);
    }
  }

  const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
  const TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; 
  const RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; 

  let updateValueCallback = null;

  const TxCharacteristic = new bleno.Characteristic({
    uuid: TX_UUID,
    properties: ['notify'],
    onSubscribe: function(maxValueSize, updateValueCallbackRef) {
      console.log('Client Subscribed!');
      updateValueCallback = updateValueCallbackRef;
      setTimeout(() => sendMessage("Chat Server Ready!"), 1000);
    },
    onUnsubscribe: function() {
      console.log('Client Unsubscribed');
      updateValueCallback = null;
    }
  });

  const RxCharacteristic = new bleno.Characteristic({
    uuid: RX_UUID,
    properties: ['write', 'writeWithoutResponse'],
    onWriteRequest: function(data, offset, withoutResponse, callback) {
      const message = data.toString('utf-8');
      console.log(`Msg: ${message}`);
      callback(this.RESULT_SUCCESS);
      setTimeout(() => sendMessage(`Echo: ${message}`), 500);
    }
  });

  function sendMessage(text) {
    if (updateValueCallback) {
      const data = Buffer.from(text, 'utf-8');
      updateValueCallback(data);
    }
  }

  bleno.on('stateChange', function(state) {
    if (state === 'poweredOn') {
      console.log('Bluetooth ON. Advertising "BlueChat"...');
      // 31-byte limit is tricky. We advertise Name + Service UUID.
      bleno.startAdvertising('BlueChat', [SERVICE_UUID]);
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
      console.log("Server Running. Scan now!");
    } else {
      console.error('Advertising Error:', error);
    }
  });
}
