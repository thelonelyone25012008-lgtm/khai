
import React, { useState, useRef, useEffect } from 'react';
import { QuizResultItem } from '../types';
import { CheckCircleIcon, ChevronDownIcon } from './Icons';

// This function is copied from ChatMessage.tsx to be self-contained.
// It parses a custom markdown dialect that also supports LaTeX via MathJax.
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

    let html = tempText
        .split('\n\n') // Split into paragraphs/blocks
        .map(block => {
            block = block.trim();
            if (!block) return '';

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
                    ? 'list-disc list-inside space-y-1 my-2' 
                    : 'list-decimal list-inside space-y-1 my-2';
                return `<${listTag} class="${listClasses}">${listHtml}</${listTag}>`;
            }
            const processedBlock = processInlineMarkdown(block);
            return `<p class="leading-relaxed">${processedBlock.replace(/\n/g, ' ')}</p>`;
        })
        .join('');

    // 3. Restore placeholders.
    placeholders.forEach((value, key) => {
        let replacementContent: string;
        if (value.startsWith('```')) {
            const code = value.slice(3, -3).replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
            replacementContent = `<pre class="bg-gray-200 dark:bg-gray-900 rounded-md p-3 my-2 overflow-x-auto"><code>${code}</code></pre>`;
        } else if (value.startsWith('`')) {
            const code = value.slice(1, -1);
            replacementContent = `<code class="bg-gray-200 dark:bg-gray-900 rounded px-1 py-0.5 text-primary-600 dark:text-primary-400 font-medium">${code}</code>`;
        } else {
            replacementContent = value;
        }
        html = html.replace(key, () => replacementContent);
    });

    return { __html: html };
};


const AccordionItem: React.FC<{ item: QuizResultItem }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);
  const solutionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const MathJax = (window as any).MathJax;
    if (isOpen && solutionRef.current && MathJax?.typesetPromise) {
      MathJax.typesetPromise([solutionRef.current]).catch((err: any) => {
        console.error("MathJax typesetting failed:", err);
      });
    }
  }, [isOpen]);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0" />
          <span className="font-medium text-gray-800 dark:text-gray-200">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          Xem lời giải
          <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-4">
          <div
            ref={solutionRef}
            className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
            dangerouslySetInnerHTML={parseMarkdown(item.solution)}
          />
        </div>
      )}
    </div>
  );
};

const QuizResult: React.FC<{ items: QuizResultItem[] }> = ({ items }) => {
  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      {items.map((item, index) => (
        <AccordionItem key={index} item={item} />
      ))}
    </div>
  );
};

export default QuizResult;
