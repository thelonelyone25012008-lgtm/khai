
import React, { useRef, useEffect } from 'react';
import { ChatMessage, Part, UploadedFile } from '../types';
import { NovaIcon, DocumentTextIcon } from './Icons';
import QuizResult from './QuizResult';

// This function parses a custom markdown dialect that also supports LaTeX via MathJax.
const parseMarkdown = (text: string) => {
    const placeholders = new Map<string, string>();
    const addPlaceholder = (content: string) => {
        const key = `__PLACEHOLDER_${placeholders.size}__`;
        placeholders.set(key, content);
        return key;
    };

    let tempText = text;

    // 1. Protect content that should not be parsed as markdown.
    tempText = tempText
        .replace(/```([\s\S]*?)```/g, (match) => addPlaceholder(match))
        .replace(/\$\$([\s\S]*?)\$\$/g, (match) => addPlaceholder(match))
        .replace(/\$([^$\n]+?)\$/g, (match) => addPlaceholder(match))
        .replace(/`([^`]+?)`/g, (match) => addPlaceholder(match));

    // 2. Process markdown on the remaining text.
    const processInlineMarkdown = (line: string) => {
        return line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    // Custom split logic to handle blockquotes correctly without losing structure
    // We split by newlines to process line-by-line for better control over blockquotes
    const blocks = tempText.split(/\n\n+/);

    let html = blocks
        .map(block => {
            block = block.trim();
            if (!block) return '';

            // Handle Horizontal Rules (--- or ***)
            if (block.match(/^(\*{3,}|-{3,})$/)) {
                 return '<hr class="my-6 border-t-2 border-gray-200 dark:border-gray-700 border-dashed" />';
            }

            // Handle Blockquotes (Styled specifically for Data Audit / Problem Statement)
            // This logic groups consecutive lines starting with '>' into a single container
            if (block.startsWith('>')) {
                 const lines = block.split('\n');
                 const processedLines = lines.map(line => {
                     const content = line.replace(/^>\s?/, '');
                     // Handle internal HRs within quotes (e.g., separating questions)
                     if (content.trim().match(/^(\*{3,}|-{3,})$/)) {
                         return '<hr class="my-4 border-t border-indigo-200 dark:border-indigo-700 border-dashed" />';
                     }
                     return processInlineMarkdown(content);
                 });
                 
                 // Join with <br/> to preserve formatting (essential for multiple choice questions)
                 const contentHtml = processedLines.join('<br/>');
                 
                 return `
                    <div class="my-4 pl-4 border-l-4 border-indigo-500 bg-indigo-50 dark:bg-gray-800/50 dark:border-indigo-400 rounded-r-lg p-4 shadow-sm">
                        <div class="text-gray-800 dark:text-gray-200 text-sm leading-relaxed font-medium font-sans">
                            ${contentHtml}
                        </div>
                    </div>
                 `;
            }

            // Handle Lists
            const isUnorderedList = block.match(/^\s*(\*|-)\s/m);
            const isOrderedList = block.match(/^\s*\d+\.\s/m);

            if (isUnorderedList || isOrderedList) {
                const lines = block.split('\n');
                let listHtml = '';
                let currentItemContent = '';

                const commitCurrentItem = () => {
                    if (currentItemContent) {
                        listHtml += `<li>${processInlineMarkdown(currentItemContent.trim())}</li>`;
                        currentItemContent = '';
                    }
                };

                for (const line of lines) {
                    const listItemMatch = line.match(/^\s*(?:(?:\*|-)|(?:\d+\.))\s+(.*)/);
                    if (listItemMatch) {
                        commitCurrentItem();
                        currentItemContent = listItemMatch[1];
                    } else if (currentItemContent) {
                        currentItemContent += ' ' + line.trim();
                    }
                }
                commitCurrentItem();

                const listTag = isUnorderedList ? 'ul' : 'ol';
                const listClasses = isUnorderedList 
                    ? 'list-disc list-inside space-y-1 my-2 ml-2' 
                    : 'list-decimal list-inside space-y-1 my-2 ml-2';
                
                return `<${listTag} class="${listClasses}">${listHtml}</${listTag}>`;
            }

            // Handle Paragraphs
            const processedBlock = processInlineMarkdown(block);
            return `<p class="leading-relaxed mb-3">${processedBlock.replace(/\n/g, ' ')}</p>`;
        })
        .join('');

    // 3. Restore placeholders.
    placeholders.forEach((value, key) => {
        let replacementContent: string;
        if (value.startsWith('```')) {
            const code = value.slice(3, -3).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
            replacementContent = `<pre class="bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md p-3 my-3 overflow-x-auto"><code class="text-sm font-mono text-gray-800 dark:text-gray-200">${code}</code></pre>`;
        } else if (value.startsWith('`')) {
            const code = value.slice(1, -1);
            replacementContent = `<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600 dark:text-pink-400 font-medium">${code}</code>`;
        } else {
            replacementContent = value;
        }
        html = html.replace(key, () => replacementContent);
    });

    return { __html: html };
};

const ChatMessageContent: React.FC<{ part: Part, isStreaming?: boolean, onViewPdf: (base64: string) => void }> = ({ part, isStreaming, onViewPdf }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const MathJax = (window as any).MathJax;
        if (contentRef.current && part.text && !isStreaming && MathJax?.typesetPromise) {
            MathJax.typesetPromise([contentRef.current]).catch((err: any) => {
                console.error("MathJax typesetting failed:", err);
            });
        }
    }, [part.text, isStreaming]);

    if (part.inlineData) {
        if (part.inlineData.mimeType.startsWith('image/')) {
            return (
                <img
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt="Uploaded content"
                    className="max-w-xs rounded-lg mt-2 shadow-md border border-gray-200 dark:border-gray-700"
                />
            );
        }
        if (part.inlineData.mimeType === 'application/pdf') {
            return (
                 <button
                    onClick={() => onViewPdf(part.inlineData.data)}
                    className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-3 my-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-left w-full max-w-xs transition-colors group"
                >
                    <DocumentTextIcon className="w-8 h-8 flex-shrink-0 text-gray-400 group-hover:text-blue-500 transition-colors" />
                    <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Tệp PDF đính kèm
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Nhấn để xem nội dung
                        </p>
                    </div>
                </button>
            );
        }
        return (
            <div className="bg-gray-100 dark:bg-gray-600 p-3 my-2 rounded-lg border border-gray-300 dark:border-gray-500">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Tệp đính kèm
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                    {part.inlineData.mimeType}
                </p>
            </div>
        )
    }
    if (part.text === '...') {
        return <div className="flex items-center space-x-1.5 py-2"><span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span><span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }}></span><span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></span></div>;
    }
    if (part.text) {
        return <div ref={contentRef} dangerouslySetInnerHTML={parseMarkdown(part.text)} />;
    }
    return null;
};

interface ChatMessageComponentProps {
  message: ChatMessage;
  onViewPdf: (base64: string) => void;
  onPdfDownload?: (base64: string) => void;
  onPdfConfirmAndContinue?: (payload: {
    pdfBase64: string;
    originalUserInput: string;
    originalFiles: UploadedFile[];
  }) => void;
  isLoading: boolean;
}

const ChatMessageComponent: React.FC<ChatMessageComponentProps> = ({ 
    message, 
    onViewPdf,
    onPdfDownload,
    onPdfConfirmAndContinue,
    isLoading
}) => {
  const isUser = message.role === 'user';
  const containerClasses = isUser ? 'justify-end' : 'justify-start';

  if (message.quizResult) {
    return (
      <div className={`flex ${containerClasses} mb-6`}>
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-3 mt-1 shadow-sm">
            <NovaIcon className="w-5 h-5 text-white" />
          </div>
        )}
        <div className="max-w-3xl w-full">
          <QuizResult items={message.quizResult} />
        </div>
      </div>
    );
  }

  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white self-end rounded-2xl rounded-tr-sm'
    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 self-start rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700/50';
  const isPdfConfirmation = message.specialActions?.type === 'pdfConfirmation';

  return (
    <div className={`flex ${containerClasses} mb-6 group`}>
        {!isUser && (
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center mr-3 mt-1 shadow-sm">
                <NovaIcon className="w-5 h-5 text-white" />
            </div>
        )}
      <div className={`max-w-3xl p-5 shadow-sm font-sans ${bubbleClasses}`}>
        {message.parts.map((part, index) => (
          <ChatMessageContent key={index} part={part} isStreaming={message.isStreaming} onViewPdf={onViewPdf} />
        ))}
        {message.sources && message.sources.length > 0 && !message.isStreaming && (
            <div className="mt-4 pt-3 border-t border-gray-200/30 dark:border-gray-600/30">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">Nguồn tham khảo</h4>
                <ul className="space-y-1.5">
                    {message.sources.map((source, index) => (
                        <li key={index} className="flex items-start text-xs">
                           <span className="mr-2 text-blue-400">&#8226;</span>
                           <a 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:underline break-all transition-colors"
                                title={source.title}
                            >
                                {source.title || new URL(source.uri).hostname}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {isPdfConfirmation && message.specialActions && onPdfDownload && onPdfConfirmAndContinue && (
          <div className="mt-4 pt-4 border-t border-white/20 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => onPdfDownload(message.specialActions.pdfBase64)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium bg-black/20 hover:bg-black/30 text-white rounded-lg transition-all w-full sm:w-auto"
            >
              Tải xuống PDF
            </button>
            <button
              onClick={() => onPdfConfirmAndContinue(message.specialActions)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold bg-white text-blue-600 hover:bg-blue-50 rounded-lg transition-all w-full sm:w-auto shadow-sm"
            >
              Tiếp tục với PDF này
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatMessageComponent);
