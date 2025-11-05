import React from 'react';
import { SunIcon, MoonIcon, NovaIcon, BrandmarkIcon } from './Icons';
import { Theme, EducationalStage, DifficultyLevel, LearningMode } from '../types';
import SettingsDropdowns from './LevelSelector';

interface HeaderProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  learningMode: LearningMode;
  setLearningMode: (mode: LearningMode) => void;
  isLoading: boolean;
  currentUser: string | null;
  onLogout: () => void;
  onNewChat: () => void;
}

const Header: React.FC<HeaderProps> = ({
  theme,
  setTheme,
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  learningMode,
  setLearningMode,
  isLoading,
  currentUser,
  onLogout,
  onNewChat
}) => {

  const ThemeToggleButton = () => {
    const nextTheme: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
    };
    
    const SystemIcon = ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
    );

    return (
        <button
            onClick={() => setTheme(nextTheme[theme])}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={`Chuyển sang chế độ ${nextTheme[theme]}`}
        >
            {theme === 'light' && <SunIcon className="w-6 h-6 text-gray-700" />}
            {theme === 'dark' && <MoonIcon className="w-6 h-6 text-gray-300" />}
            {theme === 'system' && <SystemIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
        </button>
    );
  };
    
  return (
    <header className="flex justify-between items-center p-2 md:p-3 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 flex-1">
          <a href="/" aria-label="Trang chủ NOVA" className="flex items-center gap-2 p-1">
              <NovaIcon className="w-12 h-12 text-gray-800 dark:text-gray-200" />
              <BrandmarkIcon className="h-9 text-gray-800 dark:text-gray-200" />
          </a>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
            <SettingsDropdowns 
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                learningMode={learningMode}
                setLearningMode={setLearningMode}
                isLoading={isLoading}
            />
            <button
                onClick={onNewChat}
                disabled={isLoading}
                className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
                Trò chuyện mới
            </button>
        </div>

        <div className="flex items-center justify-end flex-1 gap-2">
            {currentUser && (
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline truncate" title={currentUser}>
                        Xin chào, <span className="font-bold">{currentUser}</span>
                    </span>
                    <button 
                        onClick={onLogout}
                        className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Đăng xuất
                    </button>
                </div>
            )}
            <ThemeToggleButton />
        </div>
    </header>
  );
};

export default Header;