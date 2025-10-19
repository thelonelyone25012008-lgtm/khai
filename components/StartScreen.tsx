
import React from 'react';
import { PencilIcon, BookOpenIcon, NovaIcon, LightningBoltIcon } from './Icons';
import { LearningMode, EducationalStage, DifficultyLevel } from '../types';
import LevelSelector from './LevelSelector';

interface StartScreenProps {
  onSelectMode: (mode: LearningMode) => void;
  selectedStage: EducationalStage;
  setSelectedStage: (stage: EducationalStage) => void;
  selectedDifficulty: DifficultyLevel;
  setSelectedDifficulty: (difficulty: DifficultyLevel) => void;
  isLoading: boolean;
}


const StartScreen: React.FC<StartScreenProps> = ({ 
    onSelectMode,
    selectedStage,
    setSelectedStage,
    selectedDifficulty,
    setSelectedDifficulty,
    isLoading
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-sans bg-gradient-to-br from-slate-900 to-slate-700 text-white p-6">
      <div className="w-full max-w-md text-center">
        
        <div className="mb-8">
            <NovaIcon className="w-24 h-24 text-indigo-400 mx-auto" />
            <h1 className="text-4xl font-bold mt-4">Chào mừng đến với NOVA</h1>
            <p className="text-lg text-gray-300 mt-2">Trợ lý học tập AI của bạn.</p>
        </div>

        <div className="mb-8 p-4 bg-slate-800/50 rounded-xl border border-white/10">
            <h2 className="text-lg text-gray-200 mb-4 font-semibold">
              Trước tiên, hãy chọn trình độ học tập:
            </h2>
            <LevelSelector
                selectedStage={selectedStage}
                setSelectedStage={setSelectedStage}
                selectedDifficulty={selectedDifficulty}
                setSelectedDifficulty={setSelectedDifficulty}
                isLoading={isLoading}
            />
        </div>
        
        <h2 className="text-lg text-gray-300 mb-6">
          Bây giờ, bạn muốn bắt đầu như thế nào?
        </h2>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => onSelectMode('solve_socratic')}
            className="group text-center p-5 bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out hover:bg-slate-800/80 focus:outline-none focus:ring-4 focus:ring-indigo-500 focus:ring-opacity-50 border border-white/10"
            aria-label="Hướng dẫn giải bài"
          >
            <div className="flex items-center justify-center gap-4">
                <PencilIcon className="w-8 h-8 text-indigo-400" />
                <div className="text-left">
                    <h3 className="text-md font-bold text-gray-100">Hướng dẫn giải bài</h3>
                    <p className="text-sm text-gray-400">Nhận gợi ý và được dẫn dắt từng bước để tự tìm ra đáp án.</p>
                </div>
            </div>
          </button>
          
          <button
            onClick={() => onSelectMode('solve_direct')}
            className="group text-center p-5 bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out hover:bg-slate-800/80 focus:outline-none focus:ring-4 focus:ring-purple-400 focus:ring-opacity-50 border border-white/10"
            aria-label="Xem lời giải chi tiết"
          >
            <div className="flex items-center justify-center gap-4">
                <LightningBoltIcon className="w-8 h-8 text-purple-400" />
                <div className="text-left">
                    <h3 className="text-md font-bold text-gray-100">Xem lời giải chi tiết</h3>
                    <p className="text-sm text-gray-400">Nhận ngay lời giải đầy đủ, rõ ràng cho bài tập của bạn.</p>
                </div>
            </div>
          </button>

          <button
            onClick={() => onSelectMode('review')}
            className="group text-center p-5 bg-slate-800/50 rounded-xl transition-all duration-300 ease-in-out hover:bg-slate-800/80 focus:outline-none focus:ring-4 focus:ring-teal-400 focus:ring-opacity-50 border border-white/10"
            aria-label="Ôn lại kiến thức"
          >
            <div className="flex items-center justify-center gap-4">
                <BookOpenIcon className="w-8 h-8 text-teal-400" />
                <div className="text-left">
                    <h3 className="text-md font-bold text-gray-100">Ôn lại kiến thức</h3>
                    <p className="text-sm text-gray-400">Cùng xem lại các khái niệm, công thức và lý thuyết quan trọng.</p>
                </div>
            </div>
          </button>

        </div>
      </div>
    </div>
  );
};

export default StartScreen;
