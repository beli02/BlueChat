import React, { useState, useEffect, useRef } from 'react';
import { BluetoothDeviceDisplay, ChatMessage } from '../types';
import { bluetoothService } from '../services/bluetoothService';

interface ChatScreenProps {
  device: BluetoothDeviceDisplay;
  onDisconnect: () => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ device, onDisconnect }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial system message
    setMessages([{
      id: 'sys-1',
      text: `Подключено к ${device.name}. Защищенный канал установлен.`,
      sender: 'system',
      timestamp: Date.now()
    }]);

    // Subscribe to incoming messages
    bluetoothService.onMessage((text) => {
      const msg: ChatMessage = {
        id: Date.now().toString() + Math.random().toString(),
        text: text,
        sender: 'partner',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, msg]);
    });

    bluetoothService.onDisconnect(() => {
      onDisconnect();
    });

    return () => {
      // Cleanup handled in service mostly
    };
  }, [device, onDisconnect]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const tempId = Date.now().toString();
    const newMsg: ChatMessage = {
      id: tempId,
      text: inputText,
      sender: 'me',
      timestamp: Date.now(),
      isPending: true
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');

    try {
      await bluetoothService.send(newMsg.text);
      // Mark as sent
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, isPending: false } : m));
    } catch (err) {
      console.error(err);
      // Mark as error
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, text: m.text + ' (Ошибка)', isPending: false } : m));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="flex flex-col h-full bg-dark">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-surface border-b border-slate-700 shadow-md z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-darker font-bold">
            {device.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 leading-tight">{device.name}</h3>
            <p className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
              В сети
            </p>
          </div>
        </div>
        <button 
          onClick={() => bluetoothService.disconnect()}
          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-darker/50">
        {messages.map((msg) => {
          if (msg.sender === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-4">
                <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50">
                  {msg.text}
                </span>
              </div>
            );
          }

          const isMe = msg.sender === 'me';
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                  isMe 
                    ? 'bg-primary text-darker rounded-tr-none' 
                    : 'bg-surface text-slate-200 border border-slate-700 rounded-tl-none'
                }`}
              >
                {msg.text}
                <div className={`text-[10px] mt-1 flex justify-end opacity-60 ${isMe ? 'text-darker' : 'text-slate-400'}`}>
                   {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                   {isMe && msg.isPending && ' • Отправка...'}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-surface border-t border-slate-700">
        <div className="flex items-center gap-2 bg-darker rounded-full p-1 pl-4 border border-slate-700 focus-within:border-primary transition-colors">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Сообщение..."
            className="flex-grow bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none py-2"
          />
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="p-2 rounded-full bg-primary text-darker hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;