
import React, { useState } from 'react';
import { BluetoothDeviceDisplay } from '../types';
import { bluetoothService } from '../services/bluetoothService';

interface DeviceScannerProps {
  onConnect: (device: BluetoothDeviceDisplay) => void;
  isSimulated: boolean;
  toggleSimulation: () => void;
}

const DeviceScanner: React.FC<DeviceScannerProps> = ({ onConnect, isSimulated, toggleSimulation }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDeviceDisplay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const addLog = (msg: string) => {
    setDebugLog(prev => [msg, ...prev].slice(0, 5)); // Keep last 5 logs
  };

  const startScan = async () => {
    // CRITICAL: We must call the API *immediately* on click to preserve the User Gesture.
    // Do not set state or await anything else before this call if possible.
    setError(null);
    setDevices([]);
    addLog("Запуск сканирования...");

    try {
      // 1. Trigger the native browser picker immediately
      const foundDevices = await bluetoothService.scan();
      
      // 2. Only update state AFTER the user has interacted with the native picker
      setIsScanning(true);
      addLog("Устройство выбрано!");

      const formattedDevices: BluetoothDeviceDisplay[] = foundDevices.map(d => ({
        id: d.id,
        name: d.name || 'Неизвестное устройство',
        rssi: d.rssi,
        status: 'available'
      }));

      if (formattedDevices.length > 0) {
        setDevices(formattedDevices);
        handleConnect(formattedDevices[0]);
      } else {
        setError("Устройства не найдены");
        setIsScanning(false);
      }

    } catch (err: any) {
      console.error("Scan Error:", err);
      addLog(`ERR: ${err.name} - ${err.message}`);
      
      setIsScanning(false);

      if (err.name === 'NotFoundError') {
        setError("Поиск отменен (или тайм-аут)");
      } else if (err.name === 'SecurityError') {
        setError("Нужен HTTPS или Localhost");
      } else if (err.name === 'NotAllowedError') {
        setError("Доступ запрещен. Проверьте настройки Brave/Android.");
      } else {
        setError(`Ошибка: ${err.message}`);
      }
    }
  };

  const handleConnect = async (device: BluetoothDeviceDisplay) => {
    try {
      addLog("Подключение...");
      setError(null);
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: 'connecting' } : d));
      
      await bluetoothService.connect(device.id);

      addLog("Успех!");
      onConnect(device);
    } catch (err: any) {
      console.error("Connect Error:", err);
      addLog(`CONN ERR: ${err.message}`);
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, status: 'error' } : d));
      setError(`Ошибка подключения: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-6 items-center bg-darker relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-darker to-darker"></div>

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-darker/95 p-6 flex flex-col justify-center animate-fade-in">
          <h3 className="text-xl font-bold text-primary mb-4">Проблемы с Android/Brave?</h3>
          <div className="text-sm text-slate-300 space-y-3 mb-6 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-800 p-3 rounded">
              <strong className="text-white block mb-1">1. Геолокация (GPS)</strong>
              <p>На Android Bluetooth требует включенного GPS.</p>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <strong className="text-white block mb-1">2. Права браузера</strong>
              <p>Настройки -> Приложения -> Brave -> Права -> Местоположение (Разрешить).</p>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <strong className="text-white block mb-1">3. Brave Shields</strong>
              <p>Нажмите на иконку Льва в адресной строке и ОТКЛЮЧИТЕ защиту для этого сайта (Shields DOWN).</p>
            </div>
          </div>
          <button 
            onClick={() => setShowHelp(false)}
            className="w-full py-3 bg-secondary text-white rounded-lg font-bold"
          >
            Закрыть
          </button>
        </div>
      )}

      <div className="z-10 w-full max-w-md flex flex-col items-center flex-grow">
        <div className="flex w-full justify-between items-center mb-2">
           <h2 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
             BLUECHAT
           </h2>
           <button onClick={() => setShowHelp(true)} className="text-xs text-primary border border-primary px-2 py-1 rounded-full">
             ? Помощь
           </button>
        </div>
        
        <p className="text-slate-400 text-sm mb-8 text-center">
          {isScanning ? 'Инициализация...' : 'Нажмите кнопку поиска'}
        </p>

        {/* Radar UI */}
        <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
          <div className="absolute border border-slate-700 rounded-full w-full h-full"></div>
          <div className="absolute border border-slate-700 rounded-full w-44 h-44"></div>
          <div className="absolute border border-slate-700 rounded-full w-24 h-24"></div>
          
          {isScanning && (
            <>
               <div className="absolute w-full h-full rounded-full border-2 border-primary opacity-50 animate-ping-slow"></div>
               <div className="absolute w-full h-1/2 bg-gradient-to-b from-transparent to-primary/20 top-1/2 left-0 origin-top animate-[spin_3s_linear_infinite] rounded-b-full blur-md"></div>
            </>
          )}

          <button
            onClick={startScan}
            disabled={isScanning}
            className={`z-20 w-20 h-20 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform active:scale-95 ${
              isScanning ? 'bg-slate-800 text-primary' : 'bg-primary text-darker hover:bg-cyan-400'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>
        </div>

        {/* Device List */}
        <div className="w-full space-y-3 flex-grow overflow-y-auto no-scrollbar pb-20">
          {devices.map((device) => (
            <div 
              key={device.id}
              onClick={() => device.status === 'available' && handleConnect(device)}
              className={`p-4 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                device.status === 'connecting' 
                  ? 'border-yellow-500/50 bg-yellow-500/10' 
                  : 'border-slate-700 bg-surface hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3">
                 <div className={`w-2 h-2 rounded-full ${device.status === 'connecting' ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                 <div>
                    <h3 className="font-medium text-slate-200">{device.name}</h3>
                    <p className="text-xs text-slate-500">ID: {device.id.substring(0, 15)}...</p>
                 </div>
              </div>
              {device.status === 'connecting' && <span className="text-xs text-yellow-400">Подключение...</span>}
            </div>
          ))}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          {/* DEBUG LOG - Helps identify Brave/Android issues */}
          {debugLog.length > 0 && (
            <div className="mt-4 p-2 bg-black/40 rounded text-[10px] font-mono text-slate-500 w-full overflow-hidden">
              <div className="text-slate-400 mb-1 border-b border-slate-700">DEBUG LOG:</div>
              {debugLog.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer / Mode Toggle */}
      <div className="absolute bottom-4 left-0 w-full flex flex-col items-center gap-2">
         <button 
           onClick={toggleSimulation}
           className="text-xs text-slate-500 hover:text-primary transition-colors flex items-center gap-2 mb-2"
         >
           <span className={`w-2 h-2 rounded-full ${isSimulated ? 'bg-green-500' : 'bg-slate-600'}`}></span>
           {isSimulated ? 'Режим Симуляции' : 'Режим Bluetooth (Real)'}
         </button>
         
         <div className="text-[10px] text-slate-600 font-medium">
            Разработано Благоевски Димитаром
         </div>
      </div>
    </div>
  );
};

export default DeviceScanner;
