
import React from 'react';
import { AccentColor } from '../types';
import { XCircleIcon } from './Icons';

interface AppearanceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
}

const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  isOpen,
  onClose,
  accentColor,
  setAccentColor,
  backgroundColor,
  setBackgroundColor,
}) => {
  if (!isOpen) return null;

  // Preset colors for Accent
  const accentPresets: { hex: string; label: string; bgClass: string }[] = [
    { hex: '#3b82f6', label: 'Xanh dương', bgClass: 'bg-blue-500' },
    { hex: '#a855f7', label: 'Tím', bgClass: 'bg-purple-500' },
    { hex: '#22c55e', label: 'Xanh lá', bgClass: 'bg-green-500' },
    { hex: '#f43f5e', label: 'Hồng', bgClass: 'bg-rose-500' },
    { hex: '#f97316', label: 'Cam', bgClass: 'bg-orange-500' },
  ];

  // Common background presets
  const bgPresets: { hex: string; label: string }[] = [
    { hex: '#f1f5f9', label: 'Mặc định (Sáng)' }, // Slate 100
    { hex: '#ffffff', label: 'Trắng' },
    { hex: '#111827', label: 'Tối (Xám)' }, // Gray 900
    { hex: '#000000', label: 'Đen' },
    { hex: '#1a1e34', label: 'Xanh Đêm' }, // Custom Navy
    { hex: '#fdf2f8', label: 'Hồng Phấn' }, // Pink 50
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all scale-100 opacity-100 border border-gray-100 dark:border-gray-700" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tùy chỉnh giao diện</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
            <XCircleIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Background Color Selection */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Màu nền ứng dụng</h3>
          
          {/* BG Presets */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {bgPresets.map((preset) => (
               <button
                key={preset.hex}
                onClick={() => setBackgroundColor(preset.hex)}
                className={`h-10 rounded-lg shadow-sm border transition-all ${
                    backgroundColor === preset.hex 
                    ? 'ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-gray-800 border-transparent' 
                    : 'border-gray-200 dark:border-gray-600 hover:scale-105'
                }`}
                style={{ backgroundColor: preset.hex }}
                title={preset.label}
               />
            ))}
          </div>

          {/* Custom BG Picker */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
             <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-600">
                <input 
                    type="color" 
                    value={backgroundColor} 
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                />
             </div>
             <div className="flex-1">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block">Tự chọn màu nền</label>
                 <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-mono">{backgroundColor}</span>
             </div>
          </div>
        </div>

        {/* Accent Color Selection */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">Màu chủ đạo (Buttons, Highlight)</h3>
          
          {/* Accent Presets */}
          <div className="flex flex-wrap gap-3 mb-4">
            {accentPresets.map((preset) => (
              <button
                key={preset.hex}
                onClick={() => setAccentColor(preset.hex)}
                className="group relative flex items-center justify-center"
                title={preset.label}
              >
                <div 
                  className={`w-10 h-10 rounded-full shadow-sm transition-transform transform group-hover:scale-110 ${preset.bgClass} ${
                    accentColor === preset.hex ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110' : ''
                  }`} 
                />
                {accentColor === preset.hex && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Custom Accent Picker */}
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
             <div className="relative w-10 h-10 rounded-full overflow-hidden shadow-sm ring-1 ring-gray-200 dark:ring-gray-600">
                <input 
                    type="color" 
                    value={accentColor} 
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                />
             </div>
             <div className="flex-1">
                 <label className="text-sm font-medium text-gray-700 dark:text-gray-200 block">Tự chọn màu chủ đạo</label>
                 <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-mono">{accentColor}</span>
             </div>
          </div>

        </div>
        
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
            <button onClick={onClose} className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors">
                Xong
            </button>
        </div>
      </div>
    </div>
  );
};

export default AppearanceSettings;
