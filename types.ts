
export enum EducationalStage {
  Elementary = 'Tiểu học',
  MiddleSchool = 'Trung học cơ sở',
  HighSchool = 'Trung học phổ thông',
}

export enum DifficultyLevel {
  Basic = 'Cơ bản',
  Advanced = 'Nâng cao',
}

export type LearningMode = 'solve_socratic' | 'solve_direct' | 'get_answer' | 'review';

export type Theme = 'light' | 'dark' | 'system';

export interface Part {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

export interface ChatMessage {
  id?: string; // Optional unique identifier for a message
  role: 'user' | 'model';
  parts: Part[];
  isStreaming?: boolean; // True if the message is actively being streamed
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
  }
}