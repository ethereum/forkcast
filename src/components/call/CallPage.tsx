import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import ChatLog from './ChatLog';
import ThemeToggle from '../ui/ThemeToggle';

interface CallData {
  type: string;
  date: string;
  number: string;
  chatContent?: string;
  transcriptContent?: string;
  videoUrl?: string;
}

interface CallConfig {
  videoUrl?: string;
  sync?: {
    transcriptStartTime: string;
    videoStartTime: string;
    description?: string;
  };
}

const CallPage: React.FC = () => {
  const { '*': callPath } = useParams();
  const [callData, setCallData] = useState<CallData | null>(null);
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [player, setPlayer] = useState<any>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  // Convert timestamp string to seconds for comparison
  const timestampToSeconds = (timestamp: string | null | undefined): number => {
    if (!timestamp) return 0;
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
    return hours * 3600 + minutes * 60 + seconds;
  };

  // Calculate offset in seconds if config is available and has valid sync times
  const syncOffsetSeconds = callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime
    ? timestampToSeconds(callConfig.sync.transcriptStartTime) - timestampToSeconds(callConfig.sync.videoStartTime)
    : 0;

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string): string => {
    // Convert "00:04:05.754" to "00:04:05"
    return timestamp.split('.')[0];
  };

  // Convert seconds back to timestamp format
  const secondsToTimestamp = (totalSeconds: number): string => {
    const sign = totalSeconds < 0 ? '-' : '';
    const absSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = Math.floor(absSeconds % 60);

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const extractYouTubeId = (url: string): string => {
    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([^&\n?#]+)$/ // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        console.log('Extracted YouTube ID:', match[1]);
        return match[1];
      }
    }

    console.log('Could not extract YouTube ID, using:', url);
    return url; // Fallback to the original string
  };

  // Apply sync offset to convert transcript time to video time
  const getAdjustedVideoTime = (transcriptTimestamp: string): number => {
    const transcriptSeconds = timestampToSeconds(formatTimestamp(transcriptTimestamp));
    return transcriptSeconds - syncOffsetSeconds;
  };

  // Handle transcript scroll
  const handleTranscriptScroll = useCallback(() => {
    if (!transcriptRef.current || !chatLogRef.current || !callData?.chatContent || !callData?.transcriptContent) return;

    // Set flag to prevent feedback loop
    if (isUserScrolling) return;

    const transcriptContainer = transcriptRef.current;
    const transcriptEntries = transcriptContainer.querySelectorAll('[data-timestamp]');

    // Find the visible transcript entry
    let visibleTimestamp = 0;

    const containerTop = transcriptContainer.scrollTop;
    const containerHeight = transcriptContainer.clientHeight;
    const viewportMiddle = containerTop + containerHeight / 3; // Focus on upper third of viewport

    transcriptEntries.forEach((entry) => {
      const element = entry as HTMLElement;
      const elementTop = element.offsetTop;

      if (elementTop <= viewportMiddle && elementTop > containerTop) {
        const timestamp = element.getAttribute('data-timestamp');
        if (timestamp) {
          visibleTimestamp = timestampToSeconds(formatTimestamp(timestamp));
        }
      }
    });

    if (visibleTimestamp > 0) {
      // Find corresponding chat message
      const chatContainer = chatLogRef.current;
      const chatMessages = chatContainer.querySelectorAll('[data-chat-timestamp]');

      let closestMessage: HTMLElement | null = null;
      let closestDiff = Infinity;

      chatMessages.forEach((message) => {
        const element = message as HTMLElement;
        const chatTimestamp = element.getAttribute('data-chat-timestamp');
        if (chatTimestamp) {
          const chatSeconds = timestampToSeconds(chatTimestamp);
          const diff = Math.abs(chatSeconds - visibleTimestamp);

          if (diff < closestDiff) {
            closestDiff = diff;
            closestMessage = element;
          }
        }
      });

      if (closestMessage && 'scrollIntoView' in closestMessage) {
        // Scroll chat to show the closest message
        setIsUserScrolling(true);
        (closestMessage as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Reset flag after animation
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = setTimeout(() => {
          setIsUserScrolling(false);
        }, 1000);
      }
    }
  }, [callData, isUserScrolling]);

  useEffect(() => {
    const loadCallData = async () => {
      if (!callPath) {
        setLoading(false);
        return;
      }

      try {
        // Parse the call path (e.g., "acdc/2025-04-03_154")
        const [type, dateAndNumber] = callPath.split('/');
        const [date, number] = dateAndNumber?.split('_') || [];

        // Load chat logs
        const chatResponse = await fetch(`/artifacts/${callPath}/chat.txt`);
        const chatContent = chatResponse.ok ? await chatResponse.text() : undefined;

        // Load transcript
        const transcriptResponse = await fetch(`/artifacts/${callPath}/transcript.vtt`);
        const transcriptContent = transcriptResponse.ok ? await transcriptResponse.text() : undefined;

        // Load config file if it exists
        const configResponse = await fetch(`/artifacts/${callPath}/config.json`);
        let config: CallConfig | null = null;
        if (configResponse.ok) {
          try {
            config = await configResponse.json();
            setCallConfig(config);
            console.log('Loaded config:', config);
            if (config?.sync) {
              const offset = timestampToSeconds(config.sync.transcriptStartTime) - timestampToSeconds(config.sync.videoStartTime);
              console.log(`Sync offset: ${offset} seconds (transcript ${config.sync.transcriptStartTime} -> video ${config.sync.videoStartTime})`);
            }
          } catch (e) {
            console.warn('Failed to parse config.json:', e);
          }
        } else {
          console.log('No config.json found - highlighting disabled');
        }

        // Determine video URL: config > video.txt > fallback
        let videoUrl: string | undefined;
        if (config?.videoUrl) {
          videoUrl = config.videoUrl;
        } else {
          const videoResponse = await fetch(`/artifacts/${callPath}/video.txt`);
          videoUrl = videoResponse.ok ? (await videoResponse.text()).trim() : undefined;
        }

        // Fallback for testing if no URL found
        if (!videoUrl) {
          videoUrl = 'https://www.youtube.com/watch?v=wF0gWBHZdu8';
        }

        setCallData({
          type: type?.toUpperCase() || '',
          date: date || '',
          number: number || '',
          chatContent,
          transcriptContent,
          videoUrl
        });
      } catch (error) {
        console.error('Failed to load call data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCallData();
  }, [callPath]);

  // Clean up timeout and interval on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Poll for video time when playing
  useEffect(() => {
    if (isPlaying && player && callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime) {
      pollingIntervalRef.current = setInterval(() => {
        const time = player.getCurrentTime();
        setCurrentVideoTime(time);
      }, 100); // Poll every 100ms for smooth highlighting
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPlaying, player, callConfig]);

  // Auto-scroll transcript to highlighted entry
  useEffect(() => {
    if (!isPlaying || !transcriptRef.current || !callConfig?.sync?.transcriptStartTime || !callConfig?.sync?.videoStartTime) return;

    const highlightedEntry = transcriptRef.current.querySelector('.bg-blue-50, .dark\\:bg-blue-900\\/30');
    if (highlightedEntry) {
      const container = transcriptRef.current;
      const containerRect = container.getBoundingClientRect();
      const entryRect = highlightedEntry.getBoundingClientRect();

      // Only scroll if entry is not fully visible
      if (entryRect.top < containerRect.top || entryRect.bottom > containerRect.bottom) {
        highlightedEntry.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentVideoTime, isPlaying, callConfig]);

  // YouTube player handlers
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    setIsPlaying(event.data === 1); // 1 = playing
  };

  const handleTranscriptClick = (timestamp: string) => {
    if (player) {
      const adjustedTime = getAdjustedVideoTime(timestamp);
      console.log(`Clicking transcript ${timestamp} -> seeking to video time ${adjustedTime}s`);
      player.seekTo(adjustedTime);
      player.playVideo();
    }
  };

  // Check if a transcript entry should be highlighted based on current video time
  const isCurrentEntry = (entryTimestamp: string, index: number, entries: any[]): boolean => {
    if (!callConfig?.sync?.transcriptStartTime || !callConfig?.sync?.videoStartTime) return false;

    const entryVideoTime = getAdjustedVideoTime(entryTimestamp);
    const nextEntryVideoTime = index < entries.length - 1
      ? getAdjustedVideoTime(entries[index + 1].timestamp)
      : Infinity;

    const isHighlighted = currentVideoTime >= entryVideoTime && currentVideoTime < nextEntryVideoTime;

    // Debug logging for first few entries
    if (index < 3 && isHighlighted) {
      console.log(`Highlighting entry ${index}: transcript ${entryTimestamp} -> video ${entryVideoTime.toFixed(1)}s (current: ${currentVideoTime.toFixed(1)}s)`);
    }

    return isHighlighted;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-slate-600">Loading call data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">Call Not Found</h1>
            <p className="text-slate-600 mb-6">The requested call could not be found.</p>
            <Link
              to="/calls"
              className="inline-flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
            >
              ← Back to Calls
            </Link>
          </div>
        </div>
      </div>
    );
  }







  const getCallTypeLabel = () => {
    switch(callData.type.toLowerCase()) {
      case 'acdc': return 'All Core Devs Consensus';
      case 'acde': return 'All Core Devs Execution';
      case 'acdt': return 'All Core Devs Testing';
      default: return callData.type;
    }
  };

  const parseVTTTranscript = (text: string) => {
    const lines = text.split('\n');
    const entries: Array<{ timestamp: string; speaker: string; text: string }> = [];
    let currentEntry: Partial<{ timestamp: string; speaker: string; text: string }> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === 'WEBVTT' || line === '' || /^\d+$/.test(line)) {
        continue;
      }

      // Parse timestamp line
      if (line.includes('-->')) {
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}\.\d{3})/);
        if (timeMatch) {
          currentEntry.timestamp = timeMatch[1];
        }
        continue;
      }

      // Parse text content (speaker and text are on the same line)
      if (line && currentEntry.timestamp) {
        // Look for speaker pattern like "Speaker: text" or "Speaker | Team: text"
        const speakerMatch = line.match(/^([^:]+):\s*(.*)$/);
        if (speakerMatch) {
          currentEntry.speaker = speakerMatch[1].trim();
          currentEntry.text = speakerMatch[2].trim();
        } else {
          // If no colon pattern, treat the whole line as text
          currentEntry.speaker = 'Unknown';
          currentEntry.text = line;
        }

        if (currentEntry.timestamp && currentEntry.speaker && currentEntry.text) {
          entries.push(currentEntry as { timestamp: string; speaker: string; text: string });
          currentEntry = {};
        }
      }
    }

    return entries;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Compact Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2">
          {/* Mobile Layout */}
          <div className="sm:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/" className="text-base font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent">
                Forkcast
              </Link>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {callData.type.toUpperCase()} #{callData.number}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/calls"
                className="text-xs text-slate-600 dark:text-slate-400"
              >
                ← Back
              </Link>
              <ThemeToggle />
            </div>
          </div>
          
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/" className="text-lg font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
                Forkcast
              </Link>
              <div className="text-slate-300 dark:text-slate-600">|</div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {getCallTypeLabel()} #{callData.number}
                </h1>
                <span className="text-sm text-slate-500 dark:text-slate-400">• {callData.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/calls"
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                ← All Calls
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Video Section */}
        {callData.videoUrl && (
          <div className="mb-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Video Player */}
                <div>
                  <div className="relative" style={{ paddingBottom: '56.25%' }}>
                    <YouTube
                      videoId={extractYouTubeId(callData.videoUrl)}
                      className="absolute top-0 left-0 w-full h-full"
                      iframeClassName="w-full h-full rounded-lg"
                      onReady={onPlayerReady}
                      onStateChange={onPlayerStateChange}
                      opts={{
                        width: '100%',
                        height: '100%',
                        playerVars: {
                          autoplay: 0,
                          modestbranding: 1,
                          rel: 0
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Video Metadata */}
                <div className="flex flex-col justify-center">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
                    {getCallTypeLabel()} #{callData.number}
                  </h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">📅</span>
                      <span className="text-slate-600 dark:text-slate-300">Date:</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{callData.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">🎬</span>
                      <span className="text-slate-600 dark:text-slate-300">Series:</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">{getCallTypeLabel()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">🔢</span>
                      <span className="text-slate-600 dark:text-slate-300">Meeting:</span>
                      <span className="text-slate-700 dark:text-slate-200 font-medium">#{callData.number}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <a
                      href={callData.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Open in YouTube
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript and Chat Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Transcript */}
          <div>
            {callData.transcriptContent && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Transcript</h2>
                <div
                  ref={transcriptRef}
                  className="space-y-1 max-h-[400px] overflow-y-auto pr-2"
                  onScroll={handleTranscriptScroll}
                >
                  {parseVTTTranscript(callData.transcriptContent).map((entry, index, entries) => {
                    const isHighlighted = isCurrentEntry(entry.timestamp, index, entries);
                    return (
                      <div
                        key={index}
                        data-timestamp={entry.timestamp}
                        onClick={() => handleTranscriptClick(entry.timestamp)}
                        className={`flex gap-2 text-sm group hover:bg-slate-50 dark:hover:bg-slate-700/30 py-1 px-2 -mx-2 rounded transition-colors cursor-pointer
                          ${isHighlighted ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 rounded-r-md' : ''}
                        `}
                      >
                        <span className={`text-xs w-16 flex-shrink-0 font-mono mt-0.5
                          ${isHighlighted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}
                        `}>
                          {callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime
                            ? secondsToTimestamp(getAdjustedVideoTime(entry.timestamp))
                            : formatTimestamp(entry.timestamp)
                          }
                        </span>
                        <div className="flex-1">
                          <span className={`font-medium text-sm
                            ${isHighlighted ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-300'}
                          `}>
                            {entry.speaker}:
                          </span>
                          <span className={`text-sm ml-1
                            ${isHighlighted ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}
                          `}>{entry.text}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chat Logs */}
          <div>
            {callData.chatContent && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Chat Logs</h2>
                <div ref={chatLogRef} className="max-h-[400px] overflow-y-auto pr-2">
                  <ChatLog content={callData.chatContent} syncConfig={callConfig?.sync} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallPage;