
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import Header from './components/Header';
import { NovaIcon, BrandmarkIcon } from './components/Icons';
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, Theme, LearningMode, QuizResultItem } from './types';
import { generateResponseStream, generateImage } from './services/geminiService';
import { createPdfFromImages } from './services/pdfService';
import CameraCapture from './components/CameraCapture';
import PdfViewer from './components/PdfViewer';
import AuthScreen from './components/AuthScreen';
import { initDB, getChatHistory, saveChatHistory } from './services/dbService';

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64Data = result.split(',')[1];
            resolve(base64Data);
        };
        reader.onerror = (error) => reject(error);
    });
};

const downloadFileFromBase64 = (base64Data: string, fileName: string, mimeType: string) => {
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], {type: mimeType});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};


const App: React.FC = () => {
  // --- STATE MANAGEMENT ---
  const [appState, setAppState] = useState<'AUTH' | 'CHAT_LOADING' | 'CHAT'>('AUTH');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [educationalStage, setEducationalStage] = useState<EducationalStage>(EducationalStage.MiddleSchool);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.Basic);
  const [learningMode, setLearningMode] = useState<LearningMode>('solve_socratic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'system');
  const [pdfToView, setPdfToView] = useState<string | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- HANDLERS & HELPERS ---

  const getPartsForFile = async (file: File): Promise<{ parts: Part[], base64Data: string }> => {
      const base64Data = await fileToBase64(file);
      const parts: Part[] = [];

      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
          parts.push({
              inlineData: {
                  mimeType: file.type,
                  data: base64Data,
              }
          });
      } else { 
          parts.push({ text: `Nội dung từ tệp "${file.name}":\n\n${atob(base64Data)}` });
      }

      return { parts, base64Data };
  };

  const handlePaste = useCallback(async (event: ClipboardEvent) => {
    if (isLoading || isCameraOpen) return;
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageFile = Array.from(items).find(item => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile();
    if (imageFile) {
        event.preventDefault();
        const fileId = `pasted-${Date.now()}`;
        const placeholderFile: UploadedFile = { id: fileId, name: `Ảnh dán_${new Date().toISOString()}.png`, type: imageFile.type, base64Data: '', parts: [], progress: 0 };
        setUploadedFiles(prev => [...prev, placeholderFile]);

        getPartsForFile(imageFile)
            .then(({ parts, base64Data }) => {
                setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, parts, base64Data, progress: 100 } : f ));
            })
            .catch(err => {
                console.error("Lỗi xử lý ảnh dán:", err);
                setError('Lỗi xử lý ảnh dán.');
                setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: -1 } : f ));
            });
    }
  }, [isLoading, isCameraOpen]);

  const handleLogin = async (username: string) => {
      setAppState('CHAT_LOADING');
      const history = await getChatHistory(username);
      
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([
          {
              id: 'initial-message',
              role: 'model',
              parts: [{ text: `Chào mừng, ${username}! Hãy bắt đầu cuộc trò chuyện học tập của chúng ta.` }]
          }
        ]);
      }

      setCurrentUser(username);
      setAppState('CHAT');
  };

  const handleContinueAsGuest = () => {
      setAppState('CHAT_LOADING');
      setMessages([
          {
              id: 'initial-message',
              role: 'model',
              parts: [{ text: 'Xin chào! Tôi là NOVA, trợ lý học tập của bạn. Hãy chọn trình độ ở trên và đặt câu hỏi cho tôi nhé.' }]
          }
      ]);
      setCurrentUser(null);
      setAppState('CHAT');
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setAppState('AUTH');
      setMessages([]);
  };

  const handleClearAllFiles = () => setUploadedFiles([]);
  
  const onRemoveFile = (indexToRemove: number) => {
    setUploadedFiles(files => files.filter((_, index) => index !== indexToRemove));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // FIX: Use a for...of loop to ensure proper type inference for 'file'.
    for (const file of files) {
        const fileId = `${file.name}-${file.size}-${Math.random()}`;
        const placeholderFile: UploadedFile = { id: fileId, name: file.name, type: file.type, base64Data: '', parts: [], progress: 0 };
        setUploadedFiles(prev => [...prev, placeholderFile]);

        getPartsForFile(file)
            .then(({ parts, base64Data }) => {
                setUploadedFiles(prev => prev.map(f =>
                    f.id === fileId ? { ...f, parts, base64Data, progress: 100 } : f
                ));
            })
            .catch(err => {
                console.error("Lỗi xử lý tệp:", file.name, err);
                setError(`Lỗi xử lý tệp: ${file.name}`);
                setUploadedFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: -1 } : f));
            });
    }

    if (event.target) event.target.value = '';
  };
  
  const handlePhotoTaken = (base64Data: string) => {
    const fileName = `Ảnh chụp_${new Date().toISOString()}.jpg`;
    const newFile: UploadedFile = {
        id: `${fileName}-${base64Data.length}`, name: fileName, type: 'image/jpeg', base64Data,
        parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Data } }], progress: 100
    };
    setUploadedFiles(prev => [...prev, newFile]);
    setIsCameraOpen(false);
  };
    
  const processAndStreamResponse = useCallback(async (messageHistory: ChatMessage[]) => {
    setIsLoading(true);
    setError(null);

    const modelMessageId = `model-msg-${Date.now()}`;
    const newModelMessage: ChatMessage = { id: modelMessageId, role: 'model', parts: [{ text: '...' }], isStreaming: true };
    setMessages(prev => [...prev, newModelMessage]);

    let fullResponseText = '';

    try {
        const stream = generateResponseStream(messageHistory, educationalStage, difficultyLevel, learningMode);
        for await (const chunk of stream) {
            fullResponseText += chunk;
        }

        // After stream is complete, process the full response
        let finalMessage: ChatMessage;

        try {
            const parsedJson = JSON.parse(fullResponseText) as QuizResultItem[];
            if (Array.isArray(parsedJson) && parsedJson.length > 0 && 'title' in parsedJson[0] && 'solution' in parsedJson[0]) {
                finalMessage = {
                    id: modelMessageId,
                    role: 'model',
                    quizResult: parsedJson,
                    parts: [],
                    isStreaming: false
                };
            } else {
                throw new Error("JSON response does not match QuizResult schema.");
            }
        } catch (jsonError) {
            // Not a valid JSON or not the expected format, treat as regular text
            const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
            const cleanedText = fullResponseText.replace(imageGenRegex, '').trim();

            finalMessage = {
                id: modelMessageId,
                role: 'model',
                parts: [{ text: cleanedText }],
                isStreaming: false
            };
        }

        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? finalMessage : msg));

        // Handle image generation separately
        const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
        const imagePrompts: string[] = [];
        let match;
        while ((match = imageGenRegex.exec(fullResponseText)) !== null) {
            imagePrompts.push(match[1]);
        }
        
        for (const prompt of imagePrompts) {
            const placeholderId = `img-placeholder-${Date.now()}-${Math.random()}`;
            const placeholderMessage: ChatMessage = { role: 'model', parts: [{ text: `Đang tạo hình ảnh: "${prompt}"...` }], id: placeholderId };
            setMessages(prev => [...prev, placeholderMessage]);
            try {
                const imageBase64 = await generateImage(prompt);
                const imageResponse: ChatMessage = { role: 'model', parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }] };
                setMessages(prev => prev.map(msg => msg.id === placeholderId ? imageResponse : msg));
            } catch (imgErr) {
                console.error(imgErr);
                const errorResponse: ChatMessage = { role: 'model', parts: [{ text: `Rất tiếc, không thể tạo hình ảnh cho: "${prompt}"` }] };
                setMessages(prev => prev.map(msg => msg.id === placeholderId ? errorResponse : msg));
            }
        }

    } catch (err) {
      const errorMessage = 'Đã xảy ra lỗi khi nhận phản hồi. Vui lòng kiểm tra lại API key và thử lại.';
      setError(errorMessage);
      console.error(err);
      setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, role: 'model', parts: [{ text: errorMessage }], isStreaming: false } : msg));
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(msg => msg.id === modelMessageId ? { ...msg, isStreaming: false } : msg));
    }
  }, [educationalStage, difficultyLevel, learningMode]);


  const handleSendMessage = useCallback(async () => {
    const readyFiles = uploadedFiles.filter(f => f.progress === 100);
    if (isLoading || (!input.trim() && readyFiles.length === 0)) return;
    
    const imageFiles = readyFiles.filter(f => f.type.startsWith('image/'));
    const otherFiles = readyFiles.filter(f => !f.type.startsWith('image/'));

    // Special handler: If only images are uploaded, convert to PDF first.
    if (imageFiles.length > 0 && otherFiles.length === 0) {
        setIsLoading(true);
        const thinkingId = `pdf-gen-${Date.now()}`;
        setMessages(prev => [...prev, { id: thinkingId, role: 'model', parts: [{ text: 'Đang tổng hợp các hình ảnh thành tệp PDF...' }] }]);
        setInput('');
        setUploadedFiles([]);

        try {
            const pdfBase64 = await createPdfFromImages(imageFiles);
            const confirmationMessage: ChatMessage = {
                role: 'model',
                parts: [
                    { text: `Tôi đã tổng hợp ${imageFiles.length} hình ảnh thành một tệp PDF. Vui lòng xem lại.` },
                    { inlineData: { mimeType: 'application/pdf', data: pdfBase64 } }
                ],
                specialActions: {
                    type: 'pdfConfirmation',
                    pdfBase64,
                    originalUserInput: input,
                    originalFiles: imageFiles,
                },
            };
            setMessages(prev => prev.map(m => m.id === thinkingId ? confirmationMessage : m));
        } catch (err) {
            console.error("PDF generation failed:", err);
            setError("Không thể tạo tệp PDF từ hình ảnh.");
            setMessages(prev => prev.filter(m => m.id !== thinkingId));
        } finally {
            setIsLoading(false);
        }
        return; // Stop execution, wait for user confirmation
    }


    const userParts: Part[] = [...readyFiles.flatMap(f => f.parts)];
    if (input.trim()) userParts.push({ text: input });

    const newUserMessage: ChatMessage = { role: 'user', parts: userParts };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setInput('');
    setUploadedFiles([]);
    
    await processAndStreamResponse(currentMessages);
  }, [input, uploadedFiles, messages, isLoading, processAndStreamResponse]);

  const handlePdfDownload = useCallback((base64: string) => {
    downloadFileFromBase64(base64, `NOVA_synthesis_${Date.now()}.pdf`, 'application/pdf');
  }, []);

  const handlePdfConfirmAndContinue = useCallback((payload: { pdfBase64: string; originalUserInput: string; }) => {
      // Create a new user message that contains the confirmed PDF and original text prompt
      const userParts: Part[] = [
          { inlineData: { mimeType: 'application/pdf', data: payload.pdfBase64 } }
      ];
      if (payload.originalUserInput.trim()) {
          userParts.push({ text: payload.originalUserInput });
      }

      const newUserMessage: ChatMessage = { role: 'user', parts: userParts };
      const currentMessages = [...messages, newUserMessage];
      setMessages(currentMessages);

      // Now, call the AI with this new context
      processAndStreamResponse(currentMessages);
  }, [messages, processAndStreamResponse]);

  // --- EFFECTS ---
  
  // Initialize DB on component mount
  useEffect(() => {
      initDB().catch(err => {
          console.error("Failed to initialize database:", err);
          setError("Không thể khởi tạo bộ nhớ cục bộ.");
      });
  }, []);

  // Scroll to bottom effect
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  // Theme management effect
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  // Save chat history when messages change for a logged-in user
  useEffect(() => {
      if (currentUser && messages.length > 0 && appState === 'CHAT' && !isLoading) {
          // Don't save temporary PDF confirmation messages
          const historyToSave = messages.filter(m => m.specialActions?.type !== 'pdfConfirmation');
          if (historyToSave.length > 0) {
            saveChatHistory(currentUser, historyToSave).catch(err => {
                console.error("Failed to save chat history:", err);
            });
          }
      }
  }, [messages, currentUser, appState, isLoading]);
  
  // Paste image handler
  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => {
        window.removeEventListener('paste', handlePaste);
    };
  }, [handlePaste]);
  
  // --- RENDER LOGIC ---

  const ModelThinkingIndicator = () => (
        <div className="flex justify-start mb-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3"><NovaIcon className="w-8 h-8 text-white" /></div>
            <div className="max-w-2xl p-4 rounded-2xl shadow bg-white dark:bg-gray-700"><div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span></div></div>
        </div>
  );

  if (appState === 'AUTH') {
      return <AuthScreen onLogin={handleLogin} onContinueAsGuest={handleContinueAsGuest} />;
  }

  if (appState === 'CHAT_LOADING') {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-slate-100 dark:bg-gray-900">
              <NovaIcon className="w-24 h-24 text-indigo-500 dark:text-indigo-400 animate-pulse" />
              <p className="mt-4 text-lg text-gray-700 dark:text-gray-300">Đang tải...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {isCameraOpen && <CameraCapture onCapture={handlePhotoTaken} onClose={() => setIsCameraOpen(false)} />}
        {pdfToView && <PdfViewer base64Data={pdfToView} onClose={() => setPdfToView(null)} />}
        
        <Header 
            theme={theme} setTheme={setTheme}
            selectedStage={educationalStage} setSelectedStage={setEducationalStage}
            selectedDifficulty={difficultyLevel} setSelectedDifficulty={setDifficultyLevel}
            learningMode={learningMode} setLearningMode={setLearningMode}
            isLoading={isLoading}
            currentUser={currentUser} onLogout={handleLogout}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <BrandmarkIcon className="w-1/2 max-w-lg h-auto text-gray-200 dark:text-gray-900 opacity-10 dark:opacity-10 [filter:drop-shadow(1px_1px_0_#a1a1aa)_drop-shadow(-1px_-1px_0_#a1a1aa)_drop-shadow(1px_-1px_0_#a1a1aa)_drop-shadow(-1px_1px_0_#a1a1aa)] dark:[filter:drop-shadow(1px_1px_0_#fafafa)_drop-shadow(-1px_-1px_0_#fafafa)_drop-shadow(1px_-1px_0_#fafafa)_drop-shadow(-1px_1px_0_#fafafa)]" />
            </div>
            <div className="max-w-4xl mx-auto relative z-10">
                {messages.map((msg, index) => (
                    <ChatMessageComponent 
                        key={msg.id || index} 
                        message={msg} 
                        onViewPdf={setPdfToView}
                        onPdfDownload={handlePdfDownload}
                        onPdfConfirmAndContinue={handlePdfConfirmAndContinue}
                        isLoading={isLoading}
                    />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== 'model' && <ModelThinkingIndicator />}
                {error && <div className="text-red-500 text-center p-2">{error}</div>}
                <div ref={chatEndRef} />
            </div>
        </main>

        <footer className="sticky bottom-0 z-10">
            <ChatInput
                input={input} setInput={setInput}
                handleSendMessage={handleSendMessage} handleFileChange={handleFileChange}
                onOpenCamera={() => setIsCameraOpen(true)} isLoading={isLoading}
                uploadedFiles={uploadedFiles} onClearAllFiles={handleClearAllFiles} onRemoveFile={onRemoveFile}
            />
        </footer>
    </div>
  );
};

export default App;
