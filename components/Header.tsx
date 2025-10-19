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
  isLoading
}) => {

  const ThemeToggleButton = () => {
    const nextTheme: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
    };

    return (
        <button
            onClick={() => setTheme(nextTheme[theme])}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={`Switch to ${nextTheme[theme]} mode`}
        >
            <SunIcon className="w-6 h-6 text-gray-700 dark:text-gray-300 hidden [.dark_&]:hidden [html:not(.dark)_&]:block" />
            <MoonIcon className="w-6 h-6 text-gray-700 dark:text-gray-300 hidden [.dark_&]:block" />
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
        
        <div className="flex-shrink-0">
            <SettingsDropdowns 
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                learningMode={learningMode}
                setLearningMode={setLearningMode}
                isLoading={isLoading}
            />
        </div>

        <div className="flex items-center justify-end flex-1">
            <ThemeToggleButton />
        </div>
    </header>
  );
};

export default Header;