
import React, { useState } from 'react';
import { BluetoothDeviceDisplay } from '../types';
import { bluetoothService } from '../services/bluetoothService';

interface DeviceScannerProps {
  onConnect: (device: BluetoothDeviceDisplay) => void;
}

const DeviceScanner: React.FC<DeviceScannerProps> = ({ onConnect }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<BluetoothDeviceDisplay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const addLog = (msg: string) => {
    setDebugLog(prev => [msg, ...prev].slice(0, 5));
  };

  const startScan = async (simulation: boolean = false) => {
    setError(null);
    setDevices([]);
    bluetoothService.setSimulationMode(simulation);
    
    if(simulation) addLog("Запуск ДЕМО режима...");
    else addLog("Запуск сканирования (Все устройства)...");

    try {
      const foundDevices = await bluetoothService.scan();
      
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
        // Auto-select the first one if it's the only one found (common in web bluetooth)
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
        setError("Поиск отменен.");
      } else if (err.name === 'NotAllowedError') {
        setError("Доступ запрещен. Проверьте права.");
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
      setError(`Ошибка: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-6 items-center bg-darker relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-darker to-darker"></div>

      {/* Help Modal */}
      {showHelp && (
        <div className="absolute inset-0 z-50 bg-darker/95 p-6 flex flex-col justify-center animate-fade-in">
          <h3 className="text-xl font-bold text-primary mb-4">Помощь</h3>
          <div className="text-sm text-slate-300 space-y-3 mb-6 overflow-y-auto max-h-[60vh]">
            <div className="bg-slate-800 p-3 rounded">
              <strong className="text-white block mb-1">Как найти сервер?</strong>
              <p>Мы включили режим "Показать всё".</p>
              <p>1. Нажмите "Поиск".</p>
              <p>2. В списке Bluetooth выберите <strong>BlueChat</strong> (или похожее).</p>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <strong className="text-white block mb-1">Ничего не работает?</strong>
              <p>Нажмите кнопку "ДЕМО РЕЖИМ" внизу экрана, чтобы протестировать чат без сервера.</p>
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
          {isScanning ? 'Выберите устройство в списке...' : 'Нажмите кнопку поиска'}
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
            onClick={() => startScan(false)}
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

      {/* Footer Actions */}
      <div className="absolute bottom-4 left-0 w-full flex flex-col items-center gap-2 z-30">
         <button 
           onClick={() => startScan(true)}
           className="text-xs font-bold text-slate-500 hover:text-white transition-colors border border-slate-700 px-4 py-2 rounded-full"
         >
           ДЕМО РЕЖИМ (БЕЗ BLUETOOTH)
         </button>
         <div className="text-[10px] text-slate-600 font-medium mt-1">
            Разработано Благоевски Димитаром
         </div>
      </div>
    </div>
  );
};

export default DeviceScanner;
