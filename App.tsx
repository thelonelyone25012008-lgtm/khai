
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatInput from './components/ChatInput';
import ChatMessageComponent from './components/ChatMessage';
import Header from './components/Header';
import { NovaIcon, BrandmarkIcon } from './components/Icons';
import { EducationalStage, DifficultyLevel, ChatMessage, UploadedFile, Part, Theme, LearningMode, QuizResultItem } from './types';
import { getResponseStream, generateImage, extractTextFromFile } from './services/geminiService';
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
  const [appState, setAppState] = useState<'AUTH' | 'CHAT'>('AUTH');
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
    if (isLoading || isCameraOpen || learningMode === 'generate_image') return;
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
  }, [isLoading, isCameraOpen, learningMode]);
    
  // Bắt đầu một phiên trò chuyện mới, thường được gọi sau khi đăng nhập hoặc thay đổi chế độ
  const startNewChatSession = useCallback((mode: LearningMode) => {
    setLearningMode(mode);
    setMessages([]); // Xóa các tin nhắn cũ

    // If switching away from a mode that was triggered by 'Advanced' difficulty,
    // reset difficulty to 'Basic' so it can be triggered again.
    if (mode !== 'deep_research' && difficultyLevel === DifficultyLevel.Advanced) {
      setDifficultyLevel(DifficultyLevel.Basic);
    }

    let initialText = 'Xin chào! Tôi là NOVA, trợ lý học tập của bạn. Hãy đặt câu hỏi cho tôi nhé.';
    if (mode === 'generate_image') {
        initialText = 'Xin chào! Hãy mô tả hình ảnh bạn muốn tôi tạo ra, hoặc tải lên một tệp để tôi trích xuất yêu cầu.';
    } else if (mode === 'solve_socratic') {
        initialText = `Chào mừng! Tôi sẽ hướng dẫn bạn giải bài tập. Hãy đưa ra vấn đề và ý tưởng của bạn nhé.`
    } else if (mode === 'deep_research') {
        initialText = 'Chế độ Nghiên cứu sâu đã được kích hoạt. Tôi sẽ sử dụng Google Search để cung cấp câu trả lời chi tiết và đáng tin cậy. Bạn muốn tìm hiểu về điều gì?';
    }
    
    setMessages([
        {
            id: 'initial-message',
            role: 'model',
            parts: [{ text: initialText }]
        }
    ]);
  }, [difficultyLevel]);

  const handleLogin = async (username: string) => {
    setCurrentUser(username);
    setAppState('CHAT');

    try {
      const history = await getChatHistory(username);
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        startNewChatSession('solve_socratic');
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setError("Không thể tải lịch sử trò chuyện.");
      startNewChatSession('solve_socratic');
    }
  };

  const handleNewChat = () => {
    startNewChatSession(learningMode);
  };

  const handleContinueAsGuest = () => {
      setCurrentUser(null);
      startNewChatSession('solve_socratic'); // Bắt đầu với chế độ mặc định
      setAppState('CHAT');
  };

  const handleLogout = () => {
      setCurrentUser(null);
      setMessages([]);
      setAppState('AUTH');
  };

  const handleClearAllFiles = () => setUploadedFiles([]);
  
  const onRemoveFile = (indexToRemove: number) => {
    setUploadedFiles(files => files.filter((_, index) => index !== indexToRemove));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
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
    let currentStreamedText = '';

    try {
        const streamResult = await getResponseStream(messageHistory, educationalStage, difficultyLevel, learningMode);
        let finalResponse: any = null;

        for await (const chunk of streamResult) {
            const chunkText = chunk.text;
            if (chunkText) {
                fullResponseText += chunkText;
                currentStreamedText += chunkText;
                setMessages(prev => prev.map(msg => 
                    msg.id === modelMessageId ? { ...msg, parts: [{ text: currentStreamedText }] } : msg
                ));
            }
            finalResponse = chunk;
        }

        if (!finalResponse) {
            console.warn("Final aggregated response was not available after streaming.");
            const finalMessage = { 
                id: modelMessageId, 
                role: 'model' as const, 
                parts: [{ text: fullResponseText || "Rất tiếc, đã có lỗi xảy ra và không nhận được phản hồi." }], 
                isStreaming: false 
            };
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? finalMessage : msg));
            setIsLoading(false);
            return; 
        }

        const groundingChunks = finalResponse.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const sources = groundingChunks
            ?.map((chunk: any) => chunk.web)
            .filter(Boolean)
            .map((web: any) => ({ uri: web.uri, title: web.title }))
            .filter((v: any, i: number, a: any[]) => a.findIndex((t: any) => t.uri === v.uri) === i) || [];
        
        let finalMessage: ChatMessage;

        try {
            const parsedJson = JSON.parse(fullResponseText) as QuizResultItem[];
            if (Array.isArray(parsedJson) && parsedJson.length > 0 && 'title' in parsedJson[0] && 'solution' in parsedJson[0]) {
                finalMessage = { id: modelMessageId, role: 'model', quizResult: parsedJson, parts: [], isStreaming: false, sources };
            } else {
                 throw new Error("JSON response does not match QuizResult schema.");
            }
        } catch (jsonError) {
            const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
            const cleanedText = fullResponseText.replace(imageGenRegex, '').trim();
            finalMessage = { id: modelMessageId, role: 'model', parts: [{ text: cleanedText }], isStreaming: false, sources };
        }
        
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? finalMessage : msg));

        const imageGenRegex = /\[GENERATE_IMAGE:\s*"([^"]+)"\]/g;
        const imagePrompts: string[] = [];
        let match;
        while ((match = imageGenRegex.exec(fullResponseText)) !== null) {
            imagePrompts.push(match[1]);
        }
        
        await Promise.all(imagePrompts.map(async (prompt) => {
            const placeholderId = `img-placeholder-${Date.now()}-${Math.random()}`;
            const placeholderMessage: ChatMessage = { role: 'model', parts: [{ text: `Đang tạo hình ảnh: "${prompt}"...` }], id: placeholderId };
            setMessages(prev => [...prev, placeholderMessage]);
            try {
                const imageBase64 = await generateImage(prompt);
                const imageResponse: ChatMessage = { 
                    role: 'model', 
                    parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }],
                    imagePrompt: prompt // Save prompt for regeneration
                };
                setMessages(prev => prev.map(msg => msg.id === placeholderId ? imageResponse : msg));
            } catch (imgErr) {
                console.error(imgErr);
                const errorResponse: ChatMessage = { role: 'model', parts: [{ text: `Rất tiếc, không thể tạo hình ảnh cho: "${prompt}"` }] };
                setMessages(prev => prev.map(msg => msg.id === placeholderId ? errorResponse : msg));
            }
        }));

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

  const handleRegenerateImage = useCallback(async (prompt: string) => {
    if (isLoading) return;
    setIsLoading(true);
    const modelMessageId = `model-regen-${Date.now()}`;
    
    // Add a temporary status message
    setMessages(prev => [...prev, { 
        id: modelMessageId, 
        role: 'model', 
        parts: [{ text: `Đang tạo lại hình ảnh: "${prompt}"...` }] 
    }]);

    try {
        const imageBase64 = await generateImage(prompt);
        const imageResponse: ChatMessage = {
            id: modelMessageId,
            role: 'model',
            parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }],
            imagePrompt: prompt // Keep the prompt so it can be regenerated again
        };
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? imageResponse : msg));
    } catch (err) {
        console.error("Regeneration failed", err);
        const errorResponse: ChatMessage = {
            id: modelMessageId,
            role: 'model',
            parts: [{ text: `Rất tiếc, không thể tạo lại hình ảnh cho: "${prompt}"` }]
        };
        setMessages(prev => prev.map(msg => msg.id === modelMessageId ? errorResponse : msg));
        setError('Không thể tạo lại hình ảnh.');
    } finally {
        setIsLoading(false);
    }
  }, [isLoading]);


  const handleSendMessage = useCallback(async () => {
    if (isLoading) return;

    if (learningMode === 'generate_image') {
        const readyFiles = uploadedFiles.filter(f => f.progress === 100);
        if (!input.trim() && readyFiles.length === 0) return;

        const userParts: Part[] = [...readyFiles.flatMap(f => f.parts)];
        if (input.trim()) {
            userParts.push({ text: input });
        }
        const userMessage: ChatMessage = { role: 'user', parts: userParts };
        setMessages(prev => [...prev, userMessage]);
        
        const currentInputText = input;
        const currentFiles = readyFiles;
        setInput('');
        setUploadedFiles([]);
        setIsLoading(true);
        setError(null);
        
        const modelMessageId = `model-img-${Date.now()}`;
        let finalPrompt = currentInputText.trim();
        
        try {
            if (currentFiles.length > 0) {
                const placeholderMessage: ChatMessage = {
                    id: modelMessageId, role: 'model', parts: [{ text: `Đang phân tích tệp để trích xuất yêu cầu...` }]
                };
                setMessages(prev => [...prev, placeholderMessage]);
                
                const fileParts = currentFiles.flatMap(f => f.parts);
                const extractedText = await extractTextFromFile(fileParts);
                finalPrompt = (finalPrompt + ' ' + extractedText).trim();
            }

            if (!finalPrompt) {
                throw new Error("Không tìm thấy yêu cầu nào trong tệp hoặc văn bản bạn nhập.");
            }

            const placeholderMessage: ChatMessage = {
                id: modelMessageId, role: 'model', parts: [{ text: `Đã hiểu yêu cầu! Đang tạo hình ảnh: "${finalPrompt}"...` }]
            };
            setMessages(prev => {
                const placeholderExists = prev.some(m => m.id === modelMessageId);
                if (placeholderExists) {
                    return prev.map(m => m.id === modelMessageId ? placeholderMessage : m);
                }
                return [...prev, placeholderMessage];
            });

            const imageBase64 = await generateImage(finalPrompt);
            const imageResponse: ChatMessage = {
                id: modelMessageId, 
                role: 'model', 
                parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }],
                imagePrompt: finalPrompt // Save prompt for regeneration
            };
            setMessages(prev => prev.map(msg => msg.id === modelMessageId ? imageResponse : msg));

        } catch (err) {
            console.error(err);
            const errorMessage = (err as Error).message || `Rất tiếc, không thể tạo hình ảnh. Vui lòng thử lại.`;
            setError(errorMessage);
            const errorResponse: ChatMessage = {
                id: modelMessageId, role: 'model', parts: [{ text: errorMessage }]
            };
            setMessages(prev => {
                const placeholderExists = prev.some(m => m.id === modelMessageId);
                if (placeholderExists) {
                    return prev.map(m => m.id === modelMessageId ? errorResponse : m);
                }
                return [...prev, errorResponse];
            });
        } finally {
            setIsLoading(false);
        }
        return;
    }

    const readyFiles = uploadedFiles.filter(f => f.progress === 100);
    if (!input.trim() && readyFiles.length === 0) return;
    
    const imageFiles = readyFiles.filter(f => f.type.startsWith('image/'));
    const otherFiles = readyFiles.filter(f => !f.type.startsWith('image/'));

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
        return;
    }


    const userParts: Part[] = [...readyFiles.flatMap(f => f.parts)];
    if (input.trim()) userParts.push({ text: input });

    const newUserMessage: ChatMessage = { role: 'user', parts: userParts };
    const currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setInput('');
    setUploadedFiles([]);
    
    await processAndStreamResponse(currentMessages);
  }, [input, uploadedFiles, messages, isLoading, processAndStreamResponse, learningMode]);

  const handlePdfDownload = useCallback((base64: string) => {
    downloadFileFromBase64(base64, `NOVA_synthesis_${Date.now()}.pdf`, 'application/pdf');
  }, []);

  const handlePdfConfirmAndContinue = useCallback((payload: { pdfBase64: string; originalUserInput: string; }) => {
      const userParts: Part[] = [
          { inlineData: { mimeType: 'application/pdf', data: payload.pdfBase64 } }
      ];
      if (payload.originalUserInput.trim()) {
          userParts.push({ text: payload.originalUserInput });
      }

      const newUserMessage: ChatMessage = { role: 'user', parts: userParts };
      const currentMessages = [...messages, newUserMessage];
      setMessages(currentMessages);
      processAndStreamResponse(currentMessages);
  }, [messages, processAndStreamResponse]);

  // --- EFFECTS ---
  
  useEffect(() => {
      initDB().catch(err => {
          console.error("Failed to initialize database:", err);
          setError("Không thể khởi tạo bộ nhớ cục bộ.");
      });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);
  
  useEffect(() => {
    const root = window.document.documentElement;
    const isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    root.classList.toggle('dark', isDark);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  useEffect(() => {
      if (currentUser && messages.length > 0 && appState === 'CHAT' && !isLoading && learningMode !== 'generate_image') {
          const historyToSave = messages.filter(m => m.specialActions?.type !== 'pdfConfirmation');
          if (historyToSave.length > 0) {
            saveChatHistory(currentUser, historyToSave).catch(err => {
                console.error("Failed to save chat history:", err);
            });
          }
      }
  }, [messages, currentUser, appState, isLoading, learningMode]);
  
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

  return (
    <div className="flex flex-col h-screen font-sans bg-slate-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        {isCameraOpen && <CameraCapture onCapture={handlePhotoTaken} onClose={() => setIsCameraOpen(false)} />}
        {pdfToView && <PdfViewer base64Data={pdfToView} onClose={() => setPdfToView(null)} />}
        
        <Header 
            theme={theme} setTheme={setTheme}
            selectedStage={educationalStage} setSelectedStage={setEducationalStage}
            selectedDifficulty={difficultyLevel} setSelectedDifficulty={setDifficultyLevel}
            learningMode={learningMode} setLearningMode={startNewChatSession}
            isLoading={isLoading}
            currentUser={currentUser} onLogout={handleLogout}
            onNewChat={handleNewChat}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                <BrandmarkIcon className="w-1/2 max-w-lg h-auto text-gray-200 dark:text-gray-900 opacity-10 dark:opacity-10 [filter:drop-shadow(1px_1px_0_#a1a1aa)_drop_shadow(-1px_-1px_0_#a1a1aa)_drop_shadow(1px_-1px_0_#a1a1aa)_drop_shadow(-1px_1px_0_#a1a1aa)] dark:[filter:drop-shadow(1px_1px_0_#fafafa)_drop_shadow(-1px_-1px_0_#fafafa)_drop_shadow(1px_-1px_0_#fafafa)_drop_shadow(-1px_1px_0_#fafafa)]" />
            </div>
            <div className="max-w-4xl mx-auto relative z-10">
                {messages.length === 0 && !isLoading && (
                    <div className="text-center py-20">
                        <NovaIcon className="w-24 h-24 text-gray-300 dark:text-gray-600 mx-auto" />
                        <h2 className="mt-4 text-2xl font-semibold text-gray-600 dark:text-gray-400">Bắt đầu cuộc trò chuyện</h2>
                        <p className="mt-2 text-gray-500 dark:text-gray-500">
                           Chọn một chế độ ở trên và đặt câu hỏi cho tôi.
                        </p>
                    </div>
                )}
                {messages.map((msg, index) => (
                    <ChatMessageComponent 
                        key={msg.id || index} 
                        message={msg} 
                        onViewPdf={setPdfToView}
                        onPdfDownload={handlePdfDownload}
                        onPdfConfirmAndContinue={handlePdfConfirmAndContinue}
                        onRegenerateImage={handleRegenerateImage}
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
                learningMode={learningMode}
            />
        </footer>
    </div>
  );
};

export default App;
