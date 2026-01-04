import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

interface SearchResult {
  type: 'transcript' | 'chat' | 'agenda' | 'action';
  timestamp: string;
  speaker?: string;
  text: string;
  context?: string;
  matchScore: number;
  originalIndex: number;
}

interface CallSearchProps {
  transcriptContent?: string;
  chatContent?: string;
  agendaData?: any;
  summaryData?: any;
  tldrData?: any;
  onResultClick?: (timestamp: string, searchResult?: SearchResult) => void;
  syncConfig?: {
    transcriptStartTime: string;
    videoStartTime: string;
  };
  currentVideoTime?: number;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  initialQuery?: string;
}

const CallSearch: React.FC<CallSearchProps> = ({
  transcriptContent,
  chatContent,
  agendaData,
  summaryData: _summaryData, // Keep for future use
  tldrData,
  onResultClick,
  syncConfig,
  currentVideoTime: _currentVideoTime = 0, // Keep for future use
  isOpen,
  setIsOpen,
  initialQuery = '',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'transcript' | 'chat' | 'agenda' | 'action'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showContext, setShowContext] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Handle Escape key to close search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
        setSelectedIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setIsOpen]);

  // Focus input when opened and set initial query
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      if (initialQuery) {
        setQuery(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  // Helper functions for timestamp conversion
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
    return hours * 3600 + minutes * 60 + seconds;
  };

  const secondsToTimestamp = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAdjustedVideoTime = (timestamp: string): number => {
    const transcriptSeconds = timestampToSeconds(timestamp.split('.')[0]);
    if (syncConfig?.transcriptStartTime && syncConfig?.videoStartTime) {
      const offset = timestampToSeconds(syncConfig.transcriptStartTime) - timestampToSeconds(syncConfig.videoStartTime);
      return transcriptSeconds - offset;
    }
    return transcriptSeconds;
  };

  // Parse content sources
  const parseTranscript = (text: string) => {
    const lines = text.split('\n');
    const entries: Array<{ timestamp: string; speaker: string; text: string }> = [];
    let currentEntry: Partial<{ timestamp: string; speaker: string; text: string }> = {};

    for (const line of lines) {
      if (line === 'WEBVTT' || line === '' || /^\d+$/.test(line)) continue;

      if (line.includes('-->')) {
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) currentEntry.timestamp = timeMatch[1];
        continue;
      }

      if (line && currentEntry.timestamp) {
        const cleanLine = line.replace(/\r$/, '').trim();
        const speakerMatch = cleanLine.match(/^([^:]+):\s*(.*)$/);
        if (speakerMatch && speakerMatch[1].trim() && speakerMatch[2].trim()) {
          currentEntry.speaker = speakerMatch[1].trim();
          currentEntry.text = speakerMatch[2].trim();
        } else {
          currentEntry.speaker = '';
          currentEntry.text = cleanLine;
        }

        if (currentEntry.timestamp && currentEntry.text) {
          entries.push({
            timestamp: currentEntry.timestamp,
            speaker: currentEntry.speaker || 'Speaker',
            text: currentEntry.text
          });
          currentEntry = {};
        }
      }
    }
    return entries;
  };

  const parseChat = (text: string) => {
    const rawLines = text.split('\n');
    const messages: Array<{ timestamp: string; speaker: string; message: string }> = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].replace(/\r$/, ''); // Remove carriage return only
      const match = line.match(/^(\d{2}:\d{2}:\d{2})\t(.+?)\t(.*)$/);

      if (match) {
        const [_, timestamp, speaker, message] = match;

        // Skip reaction messages
        if (message.startsWith('Reacted to') || message.startsWith('Heeft gereageerd op')) {
          continue;
        }

        let finalMessage = message.trim();

        // Handle "Replying to" messages - the actual content is often on the next non-empty line
        if (message.startsWith('Replying to') || message.startsWith('Antwoord verzenden naar')) {
          // Look for the actual message content on following lines
          let j = i + 1;
          const replyContent: string[] = [];

          // Skip empty lines and collect non-timestamped content
          while (j < rawLines.length) {
            const nextLine = rawLines[j].trim();

            // If we hit another timestamped message, stop
            if (/^\d{2}:\d{2}:\d{2}\t/.test(nextLine)) {
              break;
            }

            // If it's a non-empty line, it's probably reply content
            if (nextLine) {
              replyContent.push(nextLine);
            }

            j++;
          }

          // If we found reply content, use it; otherwise keep the original
          if (replyContent.length > 0) {
            finalMessage = replyContent.join(' ');
          }
        }

        // Only add if we have actual content
        if (finalMessage) {
          messages.push({
            timestamp,
            speaker: speaker.trim(),
            message: finalMessage
          });
        }
      }
    }

    return messages;
  };

  // Smart search with fuzzy matching and scoring
  const searchContent = useCallback((searchQuery: string): SearchResult[] => {
    if (!searchQuery.trim()) return [];

    const results: SearchResult[] = [];
    const queryLower = searchQuery.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);


    // Search transcript
    if (transcriptContent && (selectedFilter === 'all' || selectedFilter === 'transcript')) {
      const allEntries = parseTranscript(transcriptContent);
      // Filter out entries before transcriptStartTime if sync config exists
      const entries = allEntries.filter(entry => {
        if (syncConfig?.transcriptStartTime) {
          const entrySeconds = timestampToSeconds(entry.timestamp.split('.')[0]);
          const startSeconds = timestampToSeconds(syncConfig.transcriptStartTime);
          return entrySeconds >= startSeconds;
        }
        return true;
      });

      entries.forEach((entry, index) => {
        const textLower = entry.text.toLowerCase();
        const speakerLower = entry.speaker.toLowerCase();

        // Calculate match score
        let score = 0;
        let hasMatch = false;

        // Exact phrase match gets highest score
        if (textLower.includes(queryLower)) {
          score += 10;
          hasMatch = true;
        }

        // All words present gets high score
        const allWordsPresent = queryWords.every(word => textLower.includes(word) || speakerLower.includes(word));
        if (allWordsPresent) {
          score += 5;
          hasMatch = true;
        }

        // Individual word matches
        queryWords.forEach(word => {
          if (textLower.includes(word)) score += 2;
          if (speakerLower.includes(word)) score += 3; // Bonus for speaker match
        });

        if (hasMatch || score > 0) {
          // Get context from previous entry only
          const prevEntry = index > 0 ? entries[index - 1] : null;
          const context = prevEntry ? `${prevEntry.speaker}: ${prevEntry.text}` : undefined;

          results.push({
            type: 'transcript',
            timestamp: entry.timestamp,
            speaker: entry.speaker,
            text: entry.text,
            context: context,
            matchScore: score,
            originalIndex: index,
          });
        }
      });
    }

    // Search chat
    if (chatContent && (selectedFilter === 'all' || selectedFilter === 'chat')) {
      const allMessages = parseChat(chatContent);
      // Filter out messages before transcriptStartTime if sync config exists (same as ChatLog component)
      const messages = allMessages.filter(msg => {
        if (syncConfig?.transcriptStartTime) {
          const msgSeconds = timestampToSeconds(msg.timestamp);
          const startSeconds = timestampToSeconds(syncConfig.transcriptStartTime);
          return msgSeconds >= startSeconds;
        }
        return true;
      });

      messages.forEach((msg, index) => {
        const textLower = msg.message.toLowerCase();
        const speakerLower = msg.speaker.toLowerCase();

        let score = 0;
        let hasMatch = false;

        if (textLower.includes(queryLower)) {
          score += 10;
          hasMatch = true;
        }

        const allWordsPresent = queryWords.every(word => textLower.includes(word) || speakerLower.includes(word));
        if (allWordsPresent) {
          score += 5;
          hasMatch = true;
        }

        queryWords.forEach(word => {
          if (textLower.includes(word)) score += 2;
          if (speakerLower.includes(word)) score += 3;
        });

        if (hasMatch || score > 0) {
          results.push({
            type: 'chat',
            timestamp: msg.timestamp,
            speaker: msg.speaker,
            text: msg.message,
            matchScore: score,
            originalIndex: index,
          });
        }
      });
    }

    // Search agenda topics - prioritize tldrData if available
    if (tldrData && (selectedFilter === 'all' || selectedFilter === 'agenda')) {
      // Search highlights from tldr
      const allHighlights = Object.values(tldrData.highlights).flat() as any[];
      allHighlights.forEach((item: any, index: number) => {
        const highlightLower = item.highlight.toLowerCase();

        let score = 0;
        let hasMatch = false;

        if (highlightLower.includes(queryLower)) {
          score += 10;
          hasMatch = true;
        }

        const allWordsPresent = queryWords.every(word => highlightLower.includes(word));
        if (allWordsPresent) {
          score += 5;
          hasMatch = true;
        }

        queryWords.forEach(word => {
          if (highlightLower.includes(word)) score += 2;
        });

        if (hasMatch || score > 0) {
          results.push({
            type: 'agenda',
            timestamp: item.timestamp,
            text: item.highlight,
            matchScore: score,
            originalIndex: index,
          });
        }
      });
    } else if (agendaData && (selectedFilter === 'all' || selectedFilter === 'agenda')) {
      const allItems = agendaData.agenda.flatMap((section: any) => section.items);
      allItems.forEach((item: any, index: number) => {
        const titleLower = item.title.toLowerCase();
        const summaryLower = item.summary.toLowerCase();

        let score = 0;
        let hasMatch = false;

        if (titleLower.includes(queryLower) || summaryLower.includes(queryLower)) {
          score += 10;
          hasMatch = true;
        }

        const allWordsPresent = queryWords.every(word =>
          titleLower.includes(word) || summaryLower.includes(word)
        );
        if (allWordsPresent) {
          score += 5;
          hasMatch = true;
        }

        queryWords.forEach(word => {
          if (titleLower.includes(word)) score += 3;
          if (summaryLower.includes(word)) score += 2;
        });

        if (hasMatch || score > 0) {
          results.push({
            type: 'agenda',
            timestamp: item.start_timestamp,
            text: item.title,
            context: item.summary,
            matchScore: score + (item.decision ? 2 : 0), // Bonus for decisions
            originalIndex: index,
          });
        }
      });
    }

    // Search action items - prioritize tldrData if available
    if (tldrData && (selectedFilter === 'all' || selectedFilter === 'action')) {
      if (tldrData.action_items) {
        tldrData.action_items.forEach((action: any, index: number) => {
          const actionLower = action.action.toLowerCase();
          const ownerLower = (action.owner || '').toLowerCase();

          let score = 0;
          let hasMatch = false;

          if (actionLower.includes(queryLower) || ownerLower.includes(queryLower)) {
            score += 10;
            hasMatch = true;
          }

          const allWordsPresent = queryWords.every(word =>
            actionLower.includes(word) || ownerLower.includes(word)
          );
          if (allWordsPresent) {
            score += 5;
            hasMatch = true;
          }

          queryWords.forEach(word => {
            if (actionLower.includes(word)) score += 2;
            if (ownerLower.includes(word)) score += 3;
          });

          if (hasMatch || score > 0) {
            results.push({
              type: 'action',
              timestamp: action.timestamp,
              speaker: action.owner,
              text: action.action,
              matchScore: score + 5, // Bonus for action items
              originalIndex: index,
            });
          }
        });
      }
    } else if (agendaData && (selectedFilter === 'all' || selectedFilter === 'action')) {
      const allItems = agendaData.agenda.flatMap((section: any) => section.items);
      allItems.forEach((item: any) => {
        if (item.action_items) {
          item.action_items.forEach((action: any, index: number) => {
            const whatLower = action.what.toLowerCase();
            const whoLower = (action.who || '').toLowerCase();

            let score = 0;
            let hasMatch = false;

            if (whatLower.includes(queryLower) || whoLower.includes(queryLower)) {
              score += 10;
              hasMatch = true;
            }

            const allWordsPresent = queryWords.every(word =>
              whatLower.includes(word) || whoLower.includes(word)
            );
            if (allWordsPresent) {
              score += 5;
              hasMatch = true;
            }

            queryWords.forEach(word => {
              if (whatLower.includes(word)) score += 2;
              if (whoLower.includes(word)) score += 3;
            });

            if (hasMatch || score > 0) {
              results.push({
                type: 'action',
                timestamp: action.timestamp || item.start_timestamp,
                speaker: action.who,
                text: action.what,
                context: `From: ${item.title}`,
                matchScore: score + 5, // Bonus for action items
                originalIndex: index,
              });
            }
          });
        }
      });
    }

    // Sort by relevance (matchScore) and then by timestamp
    results.sort((a, b) => {
      if (Math.abs(a.matchScore - b.matchScore) > 1) {
        return b.matchScore - a.matchScore;
      }
      return timestampToSeconds(a.timestamp) - timestampToSeconds(b.timestamp);
    });

    return results;
  }, [transcriptContent, chatContent, agendaData, tldrData, selectedFilter, syncConfig]);

  const searchResults = useMemo(() => searchContent(query), [searchContent, query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults[selectedIndex]) {
      handleResultClick(searchResults[selectedIndex].timestamp, searchResults[selectedIndex]);
    }
  };

  // Scroll selected result into view
  useEffect(() => {
    if (resultsContainerRef.current && searchResults.length > 0) {
      const selectedElement = resultsContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex, searchResults]);

  const handleResultClick = (timestamp: string, searchResult?: SearchResult) => {
    if (onResultClick) {
      onResultClick(timestamp, searchResult);
      setIsOpen(false);
      setQuery('');
      setSelectedIndex(0);
    }
  };

  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcript':
        return '📝';
      case 'chat':
        return '💬';
      case 'agenda':
        return '📋';
      case 'action':
        return '✅';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'transcript':
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50';
      case 'chat':
        return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50';
      case 'agenda':
        return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50';
      case 'action':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50';
      default:
        return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50';
    }
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;

    const queryWords = query.trim().split(/\s+/).filter(w => w.length > 0);
    if (queryWords.length === 0) return text;

    // Create a pattern that matches any of the query words
    const pattern = queryWords
      .map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|');

    const parts = text.split(new RegExp(`(${pattern})`, 'gi'));

    return (
      <>
        {parts.map((part, i) => {
          const isMatch = queryWords.some(word =>
            part.toLowerCase() === word.toLowerCase()
          );
          return isMatch ? (
            <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/80 text-slate-800 dark:text-slate-900 font-medium">{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          );
        })}
      </>
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-4 sm:pt-20 px-2 sm:px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Search Modal */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-800 rounded-xl sm:rounded-xl rounded-t-xl shadow-2xl overflow-hidden animate-[slideDown_0.2s_ease-out] max-h-[90vh] sm:max-h-none">
        {/* Search Header */}
        <div className="border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3 p-3 sm:p-4">
            <svg className="w-5 h-5 sm:w-5 sm:h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search transcript, chat, agenda..."
              className="flex-1 bg-transparent text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none text-base sm:text-base text-lg min-h-[44px] sm:min-h-0"
            />
            <button
              onClick={() => { setIsOpen(false); setQuery(''); }}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 -m-2 touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 px-3 sm:px-4 pb-3 overflow-x-auto">
            <div className="flex items-center gap-2 flex-nowrap">
              {(['all', 'transcript', 'chat', 'agenda', 'action'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`px-3 py-2 rounded-full text-xs sm:text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] touch-manipulation ${
                    selectedFilter === filter
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </button>
              ))}
            </div>
            <div className="ml-auto flex-shrink-0">
              <button
                onClick={() => setShowContext(!showContext)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 p-2 -m-2 touch-manipulation whitespace-nowrap"
              >
                {showContext ? 'Hide' : 'Show'} context
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        <div
          ref={resultsContainerRef}
          className="max-h-96 sm:max-h-96 max-h-[60vh] overflow-y-auto"
        >
          {query && searchResults.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm">No results found for "{query}"</p>
              <p className="text-xs mt-2">Try different keywords or filters</p>
            </div>
          ) : query ? (
            <div className="py-2">
              {searchResults.map((result, index) => (
                <button
                  key={index}
                  onClick={() => handleResultClick(result.timestamp, result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left px-3 sm:px-4 py-4 sm:py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors touch-manipulation ${
                    index === selectedIndex ? 'bg-slate-50 dark:bg-slate-700/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Badge */}
                    <span className={`inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg text-sm flex-shrink-0 ${getTypeColor(result.type)}`}>
                      {getTypeIcon(result.type)}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">
                          {syncConfig ? secondsToTimestamp(getAdjustedVideoTime(result.timestamp)) : result.timestamp.split('.')[0]}
                        </span>
                        {result.speaker && (
                          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
                            {result.speaker}
                          </span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 capitalize flex-shrink-0">
                          {result.type}
                        </span>
                      </div>
                      <p className="text-sm sm:text-sm text-base text-slate-900 dark:text-slate-100 line-clamp-3 sm:line-clamp-2 leading-relaxed">
                        {highlightMatch(result.text, query)}
                      </p>
                      {showContext && result.context && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 sm:line-clamp-1">
                          {highlightMatch(result.context, query)}
                        </div>
                      )}
                    </div>

                    {/* Navigate hint - hide on mobile */}
                    <div className="hidden sm:flex items-center w-8 justify-center">
                      {index === selectedIndex && (
                        <kbd className="px-1.5 py-0.5 text-xs font-semibold text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400 border border-slate-200 dark:border-slate-600 rounded">
                          ↵
                        </kbd>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <p className="text-sm mb-3">Start typing to search across:</p>
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-blue-500">📝</span> Transcript
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-purple-500">💬</span> Chat messages
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-amber-500">📋</span> Agenda topics
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-500">✅</span> Action items
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {query && searchResults.length > 0 && (
          <div className="border-t border-slate-200 dark:border-slate-700 px-3 sm:px-4 py-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-2 sm:gap-4">
              <span>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</span>
              <div className="hidden sm:flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs">↵</kbd>
                  Jump to
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallSearch;