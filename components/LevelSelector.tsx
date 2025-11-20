
import React, { useState, useRef, useEffect } from 'react';
import { EducationalStage, DifficultyLevel, LearningMode } from '../types';
import { ChevronDownIcon } from './Icons';

// Custom hook to handle clicks outside of a component
const useOnClickOutside = (ref: React.RefObject<HTMLDivElement>, handler: (event: MouseEvent | TouchEvent) => void) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

interface SettingsDropdownsProps {
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  learningMode: LearningMode;
  setLearningMode: (mode: LearningMode) => void;
  isLoading: boolean;
}

const SettingsDropdowns: React.FC<SettingsDropdownsProps> = ({
  selectedStage,
  setSelectedStage,
  selectedDifficulty,
  setSelectedDifficulty,
  learningMode,
  setLearningMode,
  isLoading
}) => {
  const [isModeOpen, setIsModeOpen] = useState(false);
  const [isLevelOpen, setIsLevelOpen] = useState(false);
  
  const modeRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(modeRef, () => setIsModeOpen(false));
  useOnClickOutside(levelRef, () => setIsLevelOpen(false));

  const learningModeDisplayMap: Record<LearningMode, string> = {
    'solve_socratic': 'Hướng dẫn (Socratic)',
    'solve_direct': 'Giải chi tiết',
    'get_answer': 'Chỉ xem đáp án',
    'review': 'Ôn kiến thức',
    'generate_image': 'Tạo hình ảnh',
    'deep_research': 'Nghiên cứu sâu',
  };

  // Exclude 'deep_research' from the list of user-selectable options in the dropdown.
  // It can only be activated by selecting the 'Advanced' difficulty level.
  const learningModeOptions = Object.fromEntries(
    Object.entries(learningModeDisplayMap).filter(([key]) => key !== 'deep_research')
  );
  
  const handleModeSelect = (mode: LearningMode) => {
    if (setLearningMode) {
      setLearningMode(mode);
    }
    setIsModeOpen(false);
  }

  const baseButtonClass = "flex items-center justify-between gap-2 w-full sm:w-auto text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900";
  const buttonColors = "bg-gray-200/80 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200";
  const activeItemClass = "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
  const inactiveItemClass = "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700";

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      {/* Learning Mode Dropdown */}
      <div className="relative w-full sm:w-auto" ref={modeRef}>
        <button
          onClick={() => !isLoading && setIsModeOpen(!isModeOpen)}
          disabled={isLoading}
          className={`${baseButtonClass} ${buttonColors} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-haspopup="true"
          aria-expanded={isModeOpen}
        >
          <span className="truncate">{learningModeDisplayMap[learningMode]}</span>
          <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isModeOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isModeOpen && (
          <div className="absolute z-50 mt-2 w-full sm:w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in duration-200 origin-top-left">
            <div className="py-1" role="menu" aria-orientation="vertical">
              {Object.entries(learningModeOptions).map(([modeKey, label]) => (
                <button
                  key={modeKey}
                  onClick={() => handleModeSelect(modeKey as LearningMode)}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${learningMode === modeKey ? activeItemClass : inactiveItemClass}`}
                  role="menuitem"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Educational Level Dropdown (Combined Stage & Difficulty) */}
       <div className="relative w-full sm:w-auto" ref={levelRef}>
        <button
          onClick={() => !isLoading && setIsLevelOpen(!isLevelOpen)}
          disabled={isLoading}
          className={`${baseButtonClass} ${buttonColors} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-haspopup="true"
          aria-expanded={isLevelOpen}
        >
            <span className="truncate">
                {selectedStage === EducationalStage.Elementary && 'Tiểu học'}
                {selectedStage === EducationalStage.MiddleSchool && 'THCS'}
                {selectedStage === EducationalStage.HighSchool && 'THPT'}
                {' - '}
                {selectedDifficulty}
            </span>
           <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${isLevelOpen ? 'transform rotate-180' : ''}`} />
        </button>

        {isLevelOpen && (
          <div className="absolute z-50 mt-2 w-full sm:w-64 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in duration-200 origin-top-left">
             {/* Difficulty Selection */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                 <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-2 mb-2 uppercase tracking-wider">Độ khó</p>
                 <div className="flex gap-2">
                    {Object.values(DifficultyLevel).map((level) => (
                        <button
                            key={level}
                            onClick={() => {
                                setSelectedDifficulty(level);
                                setIsLevelOpen(false); // Close on selection for better UX on mobile
                            }}
                            className={`flex-1 text-xs font-medium py-1.5 px-2 rounded-md transition-colors border ${
                                selectedDifficulty === level
                                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                : 'bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            {level}
                        </button>
                    ))}
                 </div>
            </div>

             {/* Stage Selection */}
            <div className="py-1" role="menu" aria-orientation="vertical">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-4 py-2 uppercase tracking-wider">Trình độ</p>
              {Object.values(EducationalStage).map((stage) => (
                <button
                  key={stage}
                  onClick={() => {
                      setSelectedStage(stage);
                      setIsLevelOpen(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${selectedStage === stage ? activeItemClass : inactiveItemClass}`}
                  role="menuitem"
                >
                  {stage}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsDropdowns;