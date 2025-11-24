
export enum EducationalStage {
  Elementary = 'Tiểu học',
  MiddleSchool = 'Trung học cơ sở',
  HighSchool = 'Trung học phổ thông',
}

export enum DifficultyLevel {
  Basic = 'Cơ bản',
  Advanced = 'Nâng cao',
}

export type LearningMode = 'solve_socratic' | 'solve_direct' | 'get_answer' | 'review' | 'deep_research';

// Removed Theme type as it is no longer used explicitly
export type AccentColor = string;

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

// Kiểu dữ liệu cho một mục trong kết quả trắc nghiệm/bài tập
export interface QuizResultItem {
  title: string;
  solution: string;
}

export interface ChatMessage {
  id?: string; // Optional unique identifier for a message
  role: 'user' | 'model';
  parts: Part[];
  isStreaming?: boolean; // True if the message is actively being streamed
  // New property for special message types like PDF confirmation
  specialActions?: {
    type: 'pdfConfirmation';
    pdfBase64: string;
    originalUserInput: string;
    originalFiles: UploadedFile[];
  };
  // New property to hold structured quiz/exercise results
  quizResult?: QuizResultItem[];
  // New property to hold grounding sources from Google Search
  sources?: { uri: string; title: string }[];
}

export interface UploadedFile {
    id: string; // Unique ID for tracking progress and removal
    name: string;
    type: string;
    base64Data: string;
    parts: Part[];
    progress?: number; // 0-100 for progress, -1 for error
}

// Khai báo kiểu toàn cục cho aistudio để quản lý API key
declare global {
  // FIX: Moved the AIStudio interface inside the global scope to resolve the type conflict.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    jspdf: any; // Add jsPDF to the global window object for client-side PDF creation
  }
}
