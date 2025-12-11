import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import ChatLog from './ChatLog';
import Summary from './Summary';
import AgendaSummary from './AgendaSummary';
import TldrSummary from './TldrSummary';
import CallSearch from './CallSearch';
import ThemeToggle from '../ui/ThemeToggle';

interface CallData {
  type: string;
  date: string;
  number: string;
  chatContent?: string;
  transcriptContent?: string;
  videoUrl?: string;
  summaryData?: any;
  agendaData?: any;
  tldrData?: any;
}

interface CallConfig {
  videoUrl?: string;
  issue?: number;
  sync?: {
    transcriptStartTime: string;
    videoStartTime: string;
    description?: string;
  };
}

const CallPage: React.FC = () => {
  const { '*': callPath } = useParams();
  const location = useLocation();
  const [callData, setCallData] = useState<CallData | null>(null);
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [isUserScrollingTranscript, setIsUserScrollingTranscript] = useState(false);
  const [isChatSynced, setIsChatSynced] = useState(true);
  const transcriptScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isProgrammaticScrollRef = useRef(false);
  const isProgrammaticChatScrollRef = useRef(false);
  const lastHighlightedTimestampRef = useRef<string | null>(null);
  const lastHighlightedChatTimestampRef = useRef<string | null>(null);
  const previousVideoTimeRef = useRef<number>(0);
  const [player, setPlayer] = useState<any>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<{timestamp: string, text: string, type: string} | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Detect OS for keyboard shortcut display
  const isMac = typeof navigator !== 'undefined' ?
    (navigator.userAgent.indexOf('Mac') !== -1 || navigator.userAgent.indexOf('iPhone') !== -1 || navigator.userAgent.indexOf('iPad') !== -1) :
    false;
  const searchShortcut = isMac ? '⌘F' : 'Ctrl+F';

  // Variable to track initial search query from URL
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  // Track if we've already navigated to avoid duplicate seeks
  const hasNavigatedToSearchResult = useRef(false);

  // Handle search parameters from URL for direct navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const searchQuery = searchParams.get('search');
    const timestamp = searchParams.get('timestamp');
    const type = searchParams.get('type');
    const text = searchParams.get('text');

    if (searchQuery && timestamp && type && text) {
      // Store the search query for initialization (but don't open search modal)
      setInitialSearchQuery(searchQuery);

      // Set up highlighting - use the actual result text, not the search query
      setSelectedSearchResult({
        timestamp,
        text: decodeURIComponent(text),
        type
      });

      // Auto-expand summary for agenda/action items
      if (type === 'agenda' || type === 'action') {
        setSummaryExpanded(true);
      }

      // We'll handle the video seek and scroll after everything is loaded
      // This will be done in a separate effect once the player and callConfig are ready
    }
  }, [location.search]);

  // Handle navigation to selected search result when player is ready
  useEffect(() => {
    if (selectedSearchResult && player && callConfig && callData && !hasNavigatedToSearchResult.current) {
      const { timestamp, type } = selectedSearchResult;

      // Mark that we've navigated to prevent duplicate seeks
      hasNavigatedToSearchResult.current = true;

      // Helper to convert timestamp for video seek
      const timestampToSecs = (ts: string): number => {
        const parts = ts.split(':');
        if (parts.length !== 3) return 0;
        const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
        return hours * 3600 + minutes * 60 + seconds;
      };

      // Calculate adjusted time for video
      const transcriptSeconds = timestampToSecs(timestamp.split('.')[0]);
      let adjustedTime = transcriptSeconds;

      if (callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime) {
        const offset = timestampToSecs(callConfig.sync.transcriptStartTime) -
                      timestampToSecs(callConfig.sync.videoStartTime);
        adjustedTime = transcriptSeconds - offset;
      }

      // Seek video to timestamp - check if player has seekTo method
      // Wait a bit for player to be fully ready
      setTimeout(() => {
        try {
          if (player && typeof player.seekTo === 'function' && callData.videoUrl) {
            player.seekTo(adjustedTime);
            setCurrentVideoTime(adjustedTime);
          }
        } catch (error) {
          console.warn('Error seeking video:', error);
        }
      }, 100);

      // Scroll to the entry after DOM is ready
      setTimeout(() => {
        if (type === 'transcript' && transcriptRef.current) {
          const targetEntry = transcriptRef.current.querySelector(`[data-timestamp="${timestamp}"]`) as HTMLElement;
          if (targetEntry) {
            const container = transcriptRef.current;
            const containerHeight = container.clientHeight;
            const containerRect = container.getBoundingClientRect();
            const entryRect = targetEntry.getBoundingClientRect();
            const entryOffsetFromContainerTop = entryRect.top - containerRect.top + container.scrollTop;
            const targetScrollTop = entryOffsetFromContainerTop - (containerHeight * 0.1);
            const maxScroll = Math.max(0, container.scrollHeight - containerHeight);
            const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

            container.scrollTo({
              top: finalScrollTop,
              behavior: 'smooth'
            });
          }
        } else if (type === 'chat' && chatLogRef.current) {
          // Wait a bit longer for chat to render since it's more complex
          setTimeout(() => {
            const targetEntry = chatLogRef.current?.querySelector(`[data-chat-timestamp="${timestamp}"]`) as HTMLElement;

            if (targetEntry && chatLogRef.current) {
              const container = chatLogRef.current;
              const containerHeight = container.clientHeight;
              const containerRect = container.getBoundingClientRect();
              const entryRect = targetEntry.getBoundingClientRect();
              const entryOffsetFromContainerTop = entryRect.top - containerRect.top + container.scrollTop;
              const targetScrollTop = entryOffsetFromContainerTop - (containerHeight * 0.1);
              const maxScroll = Math.max(0, container.scrollHeight - containerHeight);
              const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

              container.scrollTo({
                top: finalScrollTop,
                behavior: 'smooth'
              });
            }
          }, 500); // Extra delay for chat rendering
        }
      }, 500); // Wait for DOM to be ready
    }
  }, [selectedSearchResult, player, callConfig, callData]);

  // Keyboard shortcut to open search (Cmd/Ctrl + F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        if (player && isPlaying) {
          player.pauseVideo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [player, isPlaying]);

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
        return match[1];
      }
    }

    console.log('Could not extract YouTube ID, using:', url);
    return url; // Fallback to the original string
  };

  // Apply sync offset to convert transcript time to video time
  const getAdjustedVideoTime = (transcriptTimestamp: string): number => {
    const transcriptSeconds = timestampToSeconds(formatTimestamp(transcriptTimestamp));

    // Calculate offset from current config state
    if (callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime) {
      const offset = timestampToSeconds(callConfig.sync.transcriptStartTime) - timestampToSeconds(callConfig.sync.videoStartTime);
      return transcriptSeconds - offset;
    }

    // Fallback to pre-calculated offset if config not available
    return transcriptSeconds - syncOffsetSeconds;
  };

  useEffect(() => {
    const loadCallData = async () => {
      if (!callPath) {
        setLoading(false);
        return;
      }

      try {
        // Parse the call path (e.g., "acdc/154")
        const [type, number] = callPath.split('/');

        // Map from simplified URL to artifact folder path
        // We need to find the matching call from our data to get the date
        const callsModule = await import('../../data/calls');
        const matchingCall = callsModule.protocolCalls.find(
          call => call.type === type && call.number === number
        );

        if (!matchingCall) {
          console.error('Call not found:', callPath);
          setLoading(false);
          return;
        }

        // Construct the artifact path with date_number format
        const artifactPath = `${type}/${matchingCall.date}_${number}`;
        const date = matchingCall.date;

        // Load chat logs
        const chatResponse = await fetch(`/artifacts/${artifactPath}/chat.txt`);
        const chatContent = chatResponse.ok ? await chatResponse.text() : undefined;

        // Load transcript
        const transcriptResponse = await fetch(`/artifacts/${artifactPath}/transcript.vtt`);
        const transcriptContent = transcriptResponse.ok ? await transcriptResponse.text() : undefined;

        // Load summary if it exists
        const summaryResponse = await fetch(`/artifacts/${artifactPath}/summary.json`);
        let summaryData = undefined;
        if (summaryResponse.ok) {
          try {
            summaryData = await summaryResponse.json();
          } catch (e) {
            console.warn('Failed to parse summary.json:', e);
          }
        }

        // Load agenda if it exists
        const agendaResponse = await fetch(`/artifacts/${artifactPath}/agenda.json`);
        let agendaData = undefined;
        if (agendaResponse.ok) {
          try {
            agendaData = await agendaResponse.json();
          } catch (e) {
            console.warn('Failed to parse agenda.json:', e);
          }
        }

        // Load tldr if it exists
        const tldrResponse = await fetch(`/artifacts/${artifactPath}/tldr.json`);
        let tldrData = undefined;
        if (tldrResponse.ok) {
          try {
            tldrData = await tldrResponse.json();
          } catch (e) {
            console.warn('Failed to parse tldr.json:', e);
          }
        }

        // Load config file if it exists
        const configResponse = await fetch(`/artifacts/${artifactPath}/config.json`);
        let config: CallConfig | null = null;
        if (configResponse.ok) {
          try {
            config = await configResponse.json();
            setCallConfig(config);
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
          const videoResponse = await fetch(`/artifacts/${artifactPath}/video.txt`);
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
          videoUrl,
          summaryData,
          agendaData,
          tldrData
        });

      } catch (error) {
        console.error('Failed to load call data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCallData();
  }, [callPath]);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Listen for timestamp seek events from Summary component
  useEffect(() => {
    const handleSeekToTimestamp = (event: CustomEvent) => {
      const timestamp = event.detail.timestamp;
      if (player && timestamp) {
        const adjustedTime = getAdjustedVideoTime(timestamp);
        player.seekTo(adjustedTime);
        player.playVideo();

        // Update currentVideoTime immediately to ensure highlighting updates
        setCurrentVideoTime(adjustedTime);

        // Update URL with timestamp for sharing
        const newHash = `#t=${Math.floor(adjustedTime)}`;
        window.history.replaceState(null, '', newHash);
      }
    };

    window.addEventListener('seekToTimestamp', handleSeekToTimestamp as EventListener);

    return () => {
      window.removeEventListener('seekToTimestamp', handleSeekToTimestamp as EventListener);
    };
  }, [player, callConfig]);

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

  // Detect manual scrolling on transcript
  useEffect(() => {
    if (!transcriptRef.current) return;

    const handleTranscriptScroll = () => {
      // Ignore programmatic scrolls
      if (isProgrammaticScrollRef.current) {
        return;
      }

      setIsUserScrollingTranscript(true);

      // Clear any existing timeout
      if (transcriptScrollTimeoutRef.current) {
        clearTimeout(transcriptScrollTimeoutRef.current);
      }

      // Reset after user stops scrolling for 3 seconds
      transcriptScrollTimeoutRef.current = setTimeout(() => {
        setIsUserScrollingTranscript(false);
      }, 3000);
    };

    const container = transcriptRef.current;
    container.addEventListener('scroll', handleTranscriptScroll);

    return () => {
      container.removeEventListener('scroll', handleTranscriptScroll);
      if (transcriptScrollTimeoutRef.current) {
        clearTimeout(transcriptScrollTimeoutRef.current);
      }
    };
  }, [callData]);

  // Detect manual scrolling on chat log - breaks sync until user re-syncs
  useEffect(() => {
    if (!chatLogRef.current) return;

    const handleChatScroll = () => {
      // Ignore programmatic scrolls
      if (isProgrammaticChatScrollRef.current) {
        return;
      }

      // Break sync permanently until user clicks re-sync
      setIsChatSynced(false);
    };

    const container = chatLogRef.current;
    container.addEventListener('scroll', handleChatScroll);

    return () => {
      container.removeEventListener('scroll', handleChatScroll);
    };
  }, [callData]);

  // Handler to re-sync chat to video
  const handleResyncChat = () => {
    setIsChatSynced(true);
    // Reset the last highlighted timestamp to force immediate scroll
    lastHighlightedChatTimestampRef.current = null;
  };

  const scrollTranscriptToEntry = (entryElement: HTMLElement) => {
    if (!transcriptRef.current) return;

    const container = transcriptRef.current;
    const containerHeight = container.clientHeight;
    const containerRect = container.getBoundingClientRect();
    const entryRect = entryElement.getBoundingClientRect();

    // Calculate entry position relative to container's scroll area
    const entryOffsetFromContainerTop = entryRect.top - containerRect.top + container.scrollTop;

    // Position entry at 10% from top of viewport
    const targetScrollTop = entryOffsetFromContainerTop - (containerHeight * 0.1);

    // Ensure we don't scroll past boundaries
    const maxScroll = Math.max(0, container.scrollHeight - containerHeight);
    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

    // Mark as programmatic scroll
    isProgrammaticScrollRef.current = true;

    // Smooth scroll within container only
    container.scrollTo({
      top: finalScrollTop,
      behavior: 'smooth'
    });

    // Reset flag after scroll completes
    setTimeout(() => {
      isProgrammaticScrollRef.current = false;
    }, 500);
  };

  const scrollChatToEntry = (entryElement: HTMLElement) => {
    if (!chatLogRef.current) return;

    const container = chatLogRef.current;
    const containerHeight = container.clientHeight;
    const containerRect = container.getBoundingClientRect();
    const entryRect = entryElement.getBoundingClientRect();

    // Calculate entry position relative to container's scroll area
    const entryOffsetFromContainerTop = entryRect.top - containerRect.top + container.scrollTop;

    // Position entry at 10% from top of viewport
    const targetScrollTop = entryOffsetFromContainerTop - (containerHeight * 0.1);

    // Ensure we don't scroll past boundaries
    const maxScroll = Math.max(0, container.scrollHeight - containerHeight);
    const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScroll));

    // Mark as programmatic scroll
    isProgrammaticChatScrollRef.current = true;

    // Smooth scroll within container only
    container.scrollTo({
      top: finalScrollTop,
      behavior: 'smooth'
    });

    // Reset flag after scroll completes
    setTimeout(() => {
      isProgrammaticChatScrollRef.current = false;
    }, 500);
  };

  // Auto-scroll transcript to highlighted entry
  useEffect(() => {
    // Skip if user is manually scrolling, not playing, or no sync config
    if (isUserScrollingTranscript || !isPlaying || !transcriptRef.current || !callConfig?.sync?.transcriptStartTime || !callConfig?.sync?.videoStartTime) return;

    // Find all highlighted entries and pick the first one (there should only be one)
    const highlightedEntries = transcriptRef.current.querySelectorAll('.bg-blue-50, .dark\\:bg-blue-900\\/30');

    if (highlightedEntries.length > 0) {
      // Get the first highlighted entry
      const highlightedEntry = highlightedEntries[0];
      const container = transcriptRef.current;

      // Get the parent entry div (contains timestamp and text)
      const entryParent = highlightedEntry.closest('[data-timestamp]') as HTMLElement || highlightedEntry as HTMLElement;

      // Get the timestamp to check if it's a new highlight
      const currentTimestamp = entryParent.getAttribute('data-timestamp');

      // Only scroll if this is a different entry than last time
      if (currentTimestamp === lastHighlightedTimestampRef.current) {
        return;
      }
      lastHighlightedTimestampRef.current = currentTimestamp;

      // Get positions relative to the container, not the document
      const containerHeight = container.clientHeight;
      const containerRect = container.getBoundingClientRect();
      const entryRect = entryParent.getBoundingClientRect();

      // Calculate entry position relative to container's scroll area
      const entryOffsetFromContainerTop = entryRect.top - containerRect.top + container.scrollTop;
      const entryHeight = entryParent.offsetHeight;

      // Calculate where the entry currently is in the viewport
      const entryRelativeTop = entryOffsetFromContainerTop - container.scrollTop;
      const entryRelativeBottom = entryRelativeTop + entryHeight;

      // Check if the entry is visible in a good position (20% to 70% of viewport)
      const isInGoodPosition = entryRelativeTop >= (containerHeight * 0.2) &&
                               entryRelativeBottom <= (containerHeight * 0.7);

      if (!isInGoodPosition) {
        scrollTranscriptToEntry(entryParent);
      }
    }
  }, [currentVideoTime, isPlaying, callConfig, isUserScrollingTranscript]);

  // Auto-scroll chat log to current entry
  useEffect(() => {
    // Skip if chat is not synced, not playing, or no sync config
    if (!isChatSynced || !isPlaying || !chatLogRef.current || !callConfig?.sync?.transcriptStartTime || !callConfig?.sync?.videoStartTime) return;

    // Find the current chat entry by data attribute
    const currentEntry = chatLogRef.current.querySelector('[data-current-chat="true"]') as HTMLElement;

    if (currentEntry) {
      const container = chatLogRef.current;

      // Get the timestamp to check if it's a new entry
      const currentTimestamp = currentEntry.getAttribute('data-chat-timestamp');

      // Only scroll if this is a different entry than last time
      if (currentTimestamp === lastHighlightedChatTimestampRef.current) {
        return;
      }
      lastHighlightedChatTimestampRef.current = currentTimestamp;

      // Get positions relative to the container, not the document
      const containerHeight = container.clientHeight;
      const containerRect = container.getBoundingClientRect();
      const entryRect = currentEntry.getBoundingClientRect();

      // Calculate entry position relative to container's scroll area
      const entryOffsetFromContainerTop = entryRect.top - containerRect.top + container.scrollTop;
      const entryHeight = currentEntry.offsetHeight;

      // Calculate where the entry currently is in the viewport
      const entryRelativeTop = entryOffsetFromContainerTop - container.scrollTop;
      const entryRelativeBottom = entryRelativeTop + entryHeight;

      // Check if the entry is visible in a good position (20% to 70% of viewport)
      const isInGoodPosition = entryRelativeTop >= (containerHeight * 0.2) &&
                               entryRelativeBottom <= (containerHeight * 0.7);

      if (!isInGoodPosition) {
        scrollChatToEntry(currentEntry);
      }
    }
  }, [currentVideoTime, isPlaying, callConfig, isChatSynced]);

  // Detect video seek and re-sync chat (mirrors transcript behavior)
  useEffect(() => {
    const timeDiff = Math.abs(currentVideoTime - previousVideoTimeRef.current);
    
    if (timeDiff > 2 && previousVideoTimeRef.current > 0) {
      setIsChatSynced(true);
      lastHighlightedChatTimestampRef.current = null;
    }
    
    previousVideoTimeRef.current = currentVideoTime;
  }, [currentVideoTime]);

  // YouTube player handlers
  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    setPlayer(event.target);

    // Check for timestamp in URL hash (e.g., #t=123 or #00:02:03)
    const hash = window.location.hash;
    if (hash) {
      const timeMatch = hash.match(/#t=(\d+)|#(\d{2}:\d{2}:\d{2})/);
      if (timeMatch) {
        let seekTime = 0;
        if (timeMatch[1]) {
          // Format: #t=123 (seconds)
          seekTime = parseInt(timeMatch[1]);
        } else if (timeMatch[2]) {
          // Format: #00:02:03 (HH:MM:SS)
          seekTime = timestampToSeconds(timeMatch[2]);
        }

        if (seekTime > 0) {
          setTimeout(() => {
            event.target.seekTo(seekTime);
            event.target.playVideo();

            // Also update currentVideoTime to trigger transcript highlighting
            setCurrentVideoTime(seekTime);

            // Scroll transcript to the appropriate position after a delay
            setTimeout(() => {
              if (transcriptRef.current && callConfig?.sync) {
                // Find the transcript entry that matches this video time
                const entries = transcriptRef.current.querySelectorAll('[data-timestamp]');
                let targetEntry = null;

                for (const entry of entries) {
                  const timestamp = entry.getAttribute('data-timestamp');
                  if (timestamp) {
                    const entryVideoTime = getAdjustedVideoTime(timestamp);
                    if (entryVideoTime <= seekTime) {
                      targetEntry = entry;
                    } else {
                      break;
                    }
                  }
                }

                if (targetEntry) {
                  scrollTranscriptToEntry(targetEntry as HTMLElement);
                }
              }
            }, 1000);
          }, 500);
        }
      }
    }
  };

  const onPlayerStateChange: YouTubeProps['onStateChange'] = (event) => {
    setIsPlaying(event.data === 1); // 1 = playing
  };

  const handlePauseVideo = () => {
    if (player && isPlaying) {
      player.pauseVideo();
    }
  };

  const handleTranscriptClick = (timestamp: string, searchResult?: any) => {
    if (player) {
      const adjustedTime = getAdjustedVideoTime(timestamp);
      player.seekTo(adjustedTime);

      // Update currentVideoTime immediately to ensure highlighting updates
      setCurrentVideoTime(adjustedTime);

      // Re-sync chat when user explicitly seeks to a timestamp
      setIsChatSynced(true);
      lastHighlightedChatTimestampRef.current = null; // Force immediate scroll on next render

      // Store search result for highlighting if it came from search
      if (searchResult) {
        setSelectedSearchResult({
          timestamp: timestamp,
          text: searchResult.text,
          type: searchResult.type
        });

        // Auto-expand summary if agenda or action item is selected
        if (searchResult.type === 'agenda' || searchResult.type === 'action') {
          setSummaryExpanded(true);
        }
      } else {
        // Clear search highlighting when clicking directly on transcript or chat
        setSelectedSearchResult(null);
      }

      // Scroll to the corresponding entry based on search result type
      if (searchResult?.type === 'transcript' && transcriptRef.current) {
        const targetEntry = transcriptRef.current.querySelector(`[data-timestamp="${timestamp}"]`) as HTMLElement;
        if (targetEntry) {
          scrollTranscriptToEntry(targetEntry);
        }
      } else if (searchResult?.type === 'chat' && chatLogRef.current) {
        const targetEntry = chatLogRef.current.querySelector(`[data-chat-timestamp="${timestamp}"]`) as HTMLElement;
        if (targetEntry) {
          scrollChatToEntry(targetEntry);
        }
      }

      // Scroll chat to corresponding time (with a small delay for the data attribute to update)
      if (chatLogRef.current && callConfig?.sync) {
        setTimeout(() => {
          const currentChatEntry = chatLogRef.current?.querySelector('[data-current-chat="true"]') as HTMLElement;
          if (currentChatEntry) {
            scrollChatToEntry(currentChatEntry);
          }
        }, 100);
      }

      // Update URL with timestamp for sharing
      const newHash = `#t=${Math.floor(adjustedTime)}`;
      window.history.replaceState(null, '', newHash);
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2">
            <div className="flex items-center justify-between">
              <Link to="/" className="text-lg font-serif bg-gradient-to-r from-purple-600 via-blue-600 to-purple-800 bg-clip-text text-transparent hover:from-purple-700 hover:via-blue-700 hover:to-purple-900 transition-all duration-200 tracking-tight">
                Forkcast
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 shadow-sm text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Title and Message */}
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Call Not Found
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
              The requested call could not be found. It may not be available yet or the link might be incorrect.
            </p>

            {/* Actions */}
            <div className="flex items-center justify-center gap-3">
              <Link
                to="/calls"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Calls
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
              >
                Home
              </Link>
            </div>
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
              <button
                onClick={() => {
                  setIsSearchOpen(true);
                  handlePauseVideo();
                }}
                className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                aria-label="Search"
                title={`Search (${searchShortcut})`}
              >
                <svg className="w-5 h-5 text-slate-700 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Button - Fixed Bottom Right */}
      <button
        onClick={() => {
          setIsSearchOpen(true);
          handlePauseVideo();
        }}
        className="sm:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200"
        aria-label="Search"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Search Component */}
      <CallSearch
        transcriptContent={callData.transcriptContent}
        chatContent={callData.chatContent}
        agendaData={callData.agendaData}
        summaryData={callData.summaryData}
        tldrData={callData.tldrData}
        onResultClick={handleTranscriptClick}
        syncConfig={callConfig?.sync}
        currentVideoTime={currentVideoTime}
        isOpen={isSearchOpen}
        setIsOpen={setIsSearchOpen}
        initialQuery={initialSearchQuery}
      />

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
                    {callConfig?.issue && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 dark:text-slate-400">📌</span>
                        <span className="text-slate-600 dark:text-slate-300">Agenda:</span>
                        <a
                          href={`https://github.com/ethereum/pm/issues/${callConfig.issue}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium underline decoration-1 underline-offset-2"
                        >
                          #{callConfig.issue}
                        </a>
                      </div>
                    )}
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

        {/* Meeting Summary Section */}
        {(callData.tldrData || callData.agendaData || callData.summaryData) && (
          <div className="mb-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <button
                onClick={() => setSummaryExpanded(!summaryExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-t-lg cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Summary
                  </h2>
                  <div className="flex items-center gap-2">
                    {callData.tldrData ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {Object.values(callData.tldrData.highlights).flat().length} highlights • {callData.tldrData.action_items?.length || 0} action items
                      </span>
                    ) : callData.agendaData ? (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {callData.agendaData.agenda.flatMap((section: any) => section.items).length} topics • {callData.agendaData.agenda.flatMap((section: any) => section.items).reduce((sum: number, item: any) => sum + (item.action_items?.length || 0), 0)} action items
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {callData.summaryData.summary_details?.length || 0} topics • {callData.summaryData.next_steps?.length || 0} action items
                      </span>
                    )}
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full font-normal border border-slate-200 dark:border-slate-600">
                      Experimental
                    </span>
                  </div>
                </div>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${summaryExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {summaryExpanded && (
                <div className="border-t border-slate-200 dark:border-slate-700 transition-opacity duration-500 ease-out opacity-0 animate-[fadeIn_0.5s_ease-out_forwards]">
                  <div className="p-6">
                    {callData.tldrData ? (
                      <TldrSummary
                        data={callData.tldrData}
                        onTimestampClick={handleTranscriptClick}
                        syncConfig={callConfig?.sync}
                        currentVideoTime={currentVideoTime}
                        selectedSearchResult={selectedSearchResult}
                      />
                    ) : callData.agendaData ? (
                      <AgendaSummary
                        data={callData.agendaData}
                        onTimestampClick={handleTranscriptClick}
                        syncConfig={callConfig?.sync}
                        currentVideoTime={currentVideoTime}
                        selectedSearchResult={selectedSearchResult}
                      />
                    ) : (
                      <Summary data={callData.summaryData} />
                    )}
                  </div>
                </div>
              )}
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
                >
                  {parseVTTTranscript(callData.transcriptContent)
                    .filter(entry => {
                      // Hide entries before transcriptStartTime if sync config exists
                      if (callConfig?.sync?.transcriptStartTime) {
                        const entrySeconds = timestampToSeconds(entry.timestamp);
                        const startSeconds = timestampToSeconds(callConfig.sync.transcriptStartTime);
                        return entrySeconds >= startSeconds;
                      }
                      return true;
                    })
                    .map((entry, index, entries) => {
                    const isHighlighted = isCurrentEntry(entry.timestamp, index, entries);
                    const isSelectedSearch = selectedSearchResult?.timestamp === entry.timestamp && selectedSearchResult?.type === 'transcript';
                    return (
                      <div
                        key={index}
                        data-timestamp={entry.timestamp}
                        onClick={() => handleTranscriptClick(entry.timestamp)}
                        className={`flex gap-3 text-sm group hover:bg-slate-50 dark:hover:bg-slate-700/30 py-1 px-2 -mx-2 rounded transition-colors cursor-pointer border-l-2
                          ${isSelectedSearch ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 rounded-r-md' :
                            isHighlighted ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 rounded-r-md' :
                            'border-transparent'}
                        `}
                      >
                        <span className={`text-xs flex-shrink-0 font-mono mt-0.5
                          ${isSelectedSearch ? 'text-yellow-600 dark:text-yellow-400' :
                            isHighlighted ? 'text-blue-600 dark:text-blue-400' :
                            'text-slate-500 dark:text-slate-400'}
                        `} style={{ minWidth: '64px' }}>
                          {callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime
                            ? secondsToTimestamp(getAdjustedVideoTime(entry.timestamp))
                            : formatTimestamp(entry.timestamp)
                          }
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium mr-2
                            ${isSelectedSearch ? 'text-yellow-900 dark:text-yellow-100' :
                              isHighlighted ? 'text-blue-900 dark:text-blue-100' :
                              'text-slate-700 dark:text-slate-300'}
                          `}>
                            {entry.speaker}:
                          </span>
                          <span className={`break-words
                            ${isSelectedSearch ? 'text-slate-900 dark:text-slate-100' :
                              isHighlighted ? 'text-slate-900 dark:text-slate-100' :
                              'text-slate-600 dark:text-slate-400'}
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
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Chat Logs</h2>
                  {!isChatSynced && callConfig?.sync && (
                    <button
                      onClick={handleResyncChat}
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                      title="Sync chat to video"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync
                    </button>
                  )}
                </div>
                <div ref={chatLogRef} className="max-h-[400px] overflow-y-auto pr-2">
                  <ChatLog content={callData.chatContent} syncConfig={callConfig?.sync} selectedSearchResult={selectedSearchResult} onTimestampClick={handleTranscriptClick} currentVideoTime={currentVideoTime} isPlaying={isPlaying} />
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