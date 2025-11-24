
import React from 'react';
import { NovaIcon, BrandmarkIcon, CogIcon } from './Icons';
import { EducationalStage, DifficultyLevel, LearningMode } from '../types';
import SettingsDropdowns from './LevelSelector';

interface HeaderProps {
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
  onOpenSettings: () => void;
}

const Header: React.FC<HeaderProps> = ({
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  learningMode,
  setLearningMode,
  isLoading,
  currentUser,
  onLogout,
  onNewChat,
  onOpenSettings
}) => {
    
  return (
    <header className="flex justify-between items-center p-2 md:p-3 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-md sticky top-0 z-20 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="flex items-center gap-2 flex-1">
          <a href="/" aria-label="Trang chủ NOVA" className="flex items-center gap-3 p-1">
              <NovaIcon className="w-16 h-16 text-gray-800 dark:text-gray-200" />
              <BrandmarkIcon className="h-12 text-gray-800 dark:text-gray-200" />
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
                className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
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
                        className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Đăng xuất
                    </button>
                </div>
            )}
            <button
                onClick={onOpenSettings}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400"
                aria-label="Cài đặt giao diện"
            >
                <CogIcon className="w-6 h-6" />
            </button>
        </div>
    </header>
  );
};

export default Header;