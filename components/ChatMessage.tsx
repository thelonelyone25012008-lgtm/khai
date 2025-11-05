
import React, { useRef, useEffect } from 'react';
import { ChatMessage, Part, UploadedFile } from '../types';
import { NovaIcon, DocumentTextIcon } from './Icons';
import QuizResult from './QuizResult'; // Import the new component

// This function parses a custom markdown dialect that also supports LaTeX via MathJax.
// It works by temporarily replacing math and code blocks with unique placeholders,
// processing the markdown, and then re-injecting the original math/code blocks.
// This prevents the markdown parser from interfering with LaTeX syntax (e.g., `_` for subscripts).
const parseMarkdown = (text: string) => {
    const placeholders = new Map<string, string>();
    const addPlaceholder = (content: string) => {
        const key = `__PLACEHOLDER_${placeholders.size}__`;
        placeholders.set(key, content);
        return key;
    };

    let tempText = text;

    // 1. Protect content that should not be parsed as markdown.
    // Order is important: handle larger/more specific blocks first.
    tempText = tempText
        // Multi-line code blocks
        .replace(/```([\s\S]*?)```/g, (match) => addPlaceholder(match))
        // Display math
        .replace(/\$\$([\s\S]*?)\$\$/g, (match) => addPlaceholder(match))
        // Inline math. A simpler regex is used for better compatibility.
        .replace(/\$([^$\n]+?)\$/g, (match) => addPlaceholder(match))
        // Inline code
        .replace(/`([^`]+?)`/g, (match) => addPlaceholder(match));

    // 2. Process markdown on the remaining text.
    const processInlineMarkdown = (line: string) => {
        return line
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>');
    };

    let html = tempText
        .split('\n\n') // Split into paragraphs/blocks
        .map(block => {
            block = block.trim();
            if (!block) return '';

            const isUnorderedList = block.match(/^\s*(\*|-)\s/m);
            const isOrderedList = block.match(/^\s*\d+\.\s/m);

            // Handle lists (both ordered and unordered) with multi-line items
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
                    // Regex to match the start of a list item (ordered or unordered)
                    const listItemMatch = line.match(/^\s*(?:(?:\*|-)|(?:\d+\.))\s+(.*)/);
                    if (listItemMatch) {
                        commitCurrentItem();
                        currentItemContent = listItemMatch[1]; // content is in the first capture group
                    } else if (currentItemContent) {
                        // This line is a continuation of the previous list item
                        currentItemContent += ' ' + line.trim();
                    }
                }
                commitCurrentItem(); // Commit the last item

                const listTag = isUnorderedList ? 'ul' : 'ol';
                const listClasses = isUnorderedList 
                    ? 'list-disc list-inside space-y-1 my-2' 
                    : 'list-decimal list-inside space-y-1 my-2';
                
                return `<${listTag} class="${listClasses}">${listHtml}</${listTag}>`;
            }

            // Handle paragraphs
            const processedBlock = processInlineMarkdown(block);
            // In Markdown, single newlines within a paragraph are treated as spaces for text reflow.
            // Paragraph breaks are handled by the `split('\n\n')`.
            return `<p class="leading-relaxed">${processedBlock.replace(/\n/g, ' ')}</p>`;
        })
        .join('');

    // 3. Restore placeholders with their final HTML representation.
    placeholders.forEach((value, key) => {
        let replacementContent: string;
        if (value.startsWith('```')) {
            const code = value.slice(3, -3).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
            replacementContent = `<pre class="bg-gray-200 dark:bg-gray-800 rounded-md p-3 my-2 overflow-x-auto"><code>${code}</code></pre>`;
        } else if (value.startsWith('`')) {
            const code = value.slice(1, -1);
            replacementContent = `<code class="bg-gray-200 dark:bg-gray-800 rounded px-1 py-0.5 text-blue-600 dark:text-blue-400 font-medium">${code}</code>`;
        } else {
            // This is a MathJax block. Restore it as-is.
            replacementContent = value;
        }
        
        // Use a replacer function with .replace(). This is safer than using a replacement string,
        // as it prevents any special sequences (like '$&' or '$1') inside `replacementContent`
        // from being interpreted. Since our keys are unique, this will replace exactly one placeholder.
        html = html.replace(key, () => replacementContent);
    });


    return { __html: html };
};


const ChatMessageContent: React.FC<{ part: Part, isStreaming?: boolean, onViewPdf: (base64: string) => void }> = ({ part, isStreaming, onViewPdf }) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const MathJax = (window as any).MathJax;
        // Only run MathJax typesetting when the stream for this message has finished.
        if (contentRef.current && part.text && !isStreaming && MathJax?.typesetPromise) {
            MathJax.typesetPromise([contentRef.current]).catch((err: any) => {
                console.error("MathJax typesetting failed:", err);
            });
        }
    }, [part.text, isStreaming]);

    if (part.inlineData) {
        // If the part is an image, display it.
        if (part.inlineData.mimeType.startsWith('image/')) {
            return (
                <img
                    src={`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`}
                    alt="Uploaded content"
                    className="max-w-xs rounded-lg mt-2 shadow-md"
                />
            );
        }
        // If it's a PDF, make it clickable to open the viewer.
        if (part.inlineData.mimeType === 'application/pdf') {
            return (
                 <button
                    onClick={() => onViewPdf(part.inlineData.data)}
                    className="flex items-center gap-3 bg-gray-100 dark:bg-gray-600 p-3 my-2 rounded-lg border border-gray-300 dark:border-gray-500 hover:bg-gray-200 dark:hover:bg-gray-500 cursor-pointer text-left w-full max-w-xs transition-colors"
                >
                    <DocumentTextIcon className="w-8 h-8 flex-shrink-0 text-gray-500 dark:text-gray-400" />
                    <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                            Tệp PDF đính kèm
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                            Nhấn để xem nội dung
                        </p>
                    </div>
                </button>
            );
        }
        // For other file types, show a generic placeholder.
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
    if (part.text === '...') { // Show a thinking indicator for the placeholder
        return <div className="flex items-center space-x-2"><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></span><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span><span className="w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></span></div>;
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

  // Render QuizResult component if the message contains quiz data
  if (message.quizResult) {
    return (
      <div className={`flex ${containerClasses} mb-4`}>
        {!isUser && (
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3">
            <NovaIcon className="w-8 h-8 text-white" />
          </div>
        )}
        <div className="max-w-2xl w-full">
          <QuizResult items={message.quizResult} />
        </div>
      </div>
    );
  }

  const bubbleClasses = isUser
    ? 'bg-blue-600 text-white self-end'
    : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 self-start';
  const isPdfConfirmation = message.specialActions?.type === 'pdfConfirmation';

  return (
    <div className={`flex ${containerClasses} mb-4`}>
        {!isUser && (
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center mr-3">
                <NovaIcon className="w-8 h-8 text-white" />
            </div>
        )}
      <div className={`max-w-2xl p-4 rounded-2xl shadow font-sans ${bubbleClasses}`}>
        {message.parts.map((part, index) => (
          <ChatMessageContent key={index} part={part} isStreaming={message.isStreaming} onViewPdf={onViewPdf} />
        ))}
        {message.sources && message.sources.length > 0 && !message.isStreaming && (
            <div className="mt-4 pt-3 border-t border-gray-200/20">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400/80 mb-2">Nguồn</h4>
                <ul className="space-y-1 text-sm">
                    {message.sources.map((source, index) => (
                        <li key={index} className="flex items-start">
                           <span className="mr-2 text-gray-400/80">&#8226;</span>
                           <a 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-blue-400 hover:underline break-all"
                                title={source.title}
                            >
                                {source.title || source.uri}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        {isPdfConfirmation && message.specialActions && onPdfDownload && onPdfConfirmAndContinue && (
          <div className="mt-4 pt-4 border-t border-gray-200/20 flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => onPdfDownload(message.specialActions.pdfBase64)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold bg-gray-500/50 hover:bg-gray-500/80 text-white rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50"
            >
              Tải xuống
            </button>
            <button
              onClick={() => onPdfConfirmAndContinue(message.specialActions)}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-semibold bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors w-full sm:w-auto disabled:opacity-50"
            >
              Chấp nhận & Tiếp tục
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(ChatMessageComponent);