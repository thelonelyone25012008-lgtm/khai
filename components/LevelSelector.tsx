
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
  // FIX: Made learningMode and setLearningMode optional to allow this component to be used without the learning mode dropdown.
  learningMode?: LearningMode;
  setLearningMode?: (mode: LearningMode) => void;
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

  const learningModeOptions: Record<LearningMode, string> = {
    'solve_socratic': 'Hướng dẫn (Socratic)',
    'solve_direct': 'Giải chi tiết',
    'get_answer': 'Chỉ xem đáp án',
    'review': 'Ôn kiến thức',
  };
  
  const handleModeSelect = (mode: LearningMode) => {
    // FIX: Check if setLearningMode is provided before calling it.
    if (setLearningMode) {
      setLearningMode(mode);
    }
    setIsModeOpen(false);
  }

  const baseButtonClass = "flex items-center justify-between gap-2 w-full sm:w-auto text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900";
  const buttonColors = "bg-gray-200/80 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 hover:bg-gray-300/90 dark:hover:bg-gray-600/90";
  const activeRing = "focus:ring-blue-500";

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {/* Learning Mode Dropdown */}
      {/* FIX: Conditionally render the learning mode dropdown only if the required props are provided. */}
      {learningMode && setLearningMode && (
        <div className="relative w-full sm:w-auto" ref={modeRef}>
          <button
            onClick={() => { setIsModeOpen(!isModeOpen); setIsLevelOpen(false); }}
            disabled={isLoading}
            className={`${baseButtonClass} ${buttonColors} ${isModeOpen ? 'ring-2 ring-blue-500' : activeRing}`}
            style={{minWidth: '200px'}}
          >
            <span>{learningModeOptions[learningMode]}</span>
            <ChevronDownIcon className={`w-5 h-5 transition-transform ${isModeOpen ? 'rotate-180' : ''}`} />
          </button>
          {isModeOpen && (
            <div className="absolute z-20 mt-1 w-full sm:w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1">
              {Object.entries(learningModeOptions).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => handleModeSelect(key as LearningMode)}
                  className={`block w-full text-left px-4 py-2 text-sm ${
                    learningMode === key
                      ? 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                      : 'text-gray-700 dark:text-gray-300'
                  } hover:bg-blue-500 hover:text-white`}
                >
                  {value}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Level and Difficulty Dropdown */}
      <div className="relative w-full sm:w-auto" ref={levelRef}>
        <button
          onClick={() => { setIsLevelOpen(!isLevelOpen); setIsModeOpen(false); }}
          disabled={isLoading}
          className={`${baseButtonClass} ${buttonColors} ${isLevelOpen ? 'ring-2 ring-blue-500' : activeRing}`}
           style={{minWidth: '200px'}}
        >
          <span>{selectedStage}</span>
          <ChevronDownIcon className={`w-5 h-5 transition-transform ${isLevelOpen ? 'rotate-180' : ''}`} />
        </button>
        {isLevelOpen && (
          <div className="absolute z-20 mt-1 w-full sm:w-64 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div>
              <label htmlFor="stage-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Trình độ
              </label>
              <select
                id="stage-select"
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as EducationalStage)}
                className="block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(EducationalStage).map(stage => (
                  <option key={stage} value={stage}>{stage}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="difficulty-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Mức độ
              </label>
              <select
                id="difficulty-select"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value as DifficultyLevel)}
                className="block w-full text-sm rounded-md border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
              >
                {Object.values(DifficultyLevel).map(difficulty => (
                  <option key={difficulty} value={difficulty}>{difficulty}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsDropdowns;
