
import React, { useState, useEffect } from 'react';
import DeviceScanner from './components/DeviceScanner';
import ChatScreen from './components/ChatScreen';
import { AppView, BluetoothDeviceDisplay } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SCANNER);
  const [activeDevice, setActiveDevice] = useState<BluetoothDeviceDisplay | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleDeviceConnect = (device: BluetoothDeviceDisplay) => {
    setActiveDevice(device);
    setCurrentView(AppView.CHAT);
  };

  const handleDisconnect = () => {
    setActiveDevice(null);
    setCurrentView(AppView.SCANNER);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-darker font-sans text-slate-200 flex flex-col">
       {/* Install Banner */}
       {showInstallBtn && currentView === AppView.SCANNER && (
         <div className="bg-primary/20 p-2 text-center flex justify-between items-center px-4">
           <span className="text-xs text-primary font-bold">Установить для быстрого доступа</span>
           <button 
             onClick={handleInstallClick}
             className="bg-primary text-darker text-xs font-bold px-3 py-1 rounded-full"
           >
             СКАЧАТЬ
           </button>
         </div>
       )}

       {currentView === AppView.SCANNER && (
         <DeviceScanner 
           onConnect={handleDeviceConnect} 
         />
       )}
       
       {currentView === AppView.CHAT && activeDevice && (
         <ChatScreen 
           device={activeDevice} 
           onDisconnect={handleDisconnect} 
         />
       )}
    </div>
  );
};

export default App;
