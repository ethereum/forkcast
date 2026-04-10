import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import YouTube, { YouTubeProps } from 'react-youtube';
import ChatLog from './ChatLog';
import TldrSummary from './TldrSummary';
import CallSearch from './CallSearch';
import { protocolCalls, callTypeNames, isOneOffCall, type CallType } from '../../data/calls';
import { fetchUpcomingCalls } from '../../utils/github';
import { useMetaTags } from '../../hooks/useMetaTags';
import { eipsData } from '../../data/eips';
import { EIP, ForkRelationship, KeyDecision } from '../../types/eip';
import { isSearchHotkey, getSearchShortcutLabel } from '../search/searchShortcuts';

// Mapping of breakout call types to their associated EIP IDs
const BREAKOUT_EIP_MAP: Record<string, number> = {
  epbs: 7732,
  bal: 7928,
  focil: 7805,
};

interface TldrData {
  meeting: string;
  highlights: { [category: string]: { timestamp: string; highlight: string }[] };
  action_items: { timestamp: string; action: string; owner: string }[];
  decisions: { timestamp: string; decision: string }[];
  targets: { timestamp: string; target: string }[];
}

interface CallData {
  type: string;
  date: string;
  number: string;
  chatContent?: string;
  transcriptContent?: string;
  videoUrl?: string;
  tldrData?: TldrData;
  keyDecisions?: KeyDecision[];
}

interface CallConfig {
  videoUrl?: string;
  issue?: number;
  sync?: {
    transcriptStartTime: string | null;
    videoStartTime: string | null;
    description?: string;
  };
}

interface UpcomingCallState {
  upcoming: true;
  date: string;
  youtubeUrl: string;
  githubUrl: string;
  issueNumber: number;
}

const DESKTOP_WORKSPACE_HEIGHT = 'clamp(40rem, calc(100vh - 7rem), 72rem)';
const DESKTOP_SIDEBAR_PANE_HEIGHT = `calc((${DESKTOP_WORKSPACE_HEIGHT} - 1rem) / 2)`;
const TALL_SCREEN_QUERY = '(min-height: 1000px) and (min-width: 1200px) and (max-width: 1600px)';

const LAYOUT_DEFAULT = {
  header: 'max-w-[1800px] mx-auto px-4 sm:px-6 xl:px-8 2xl:px-10 py-2',
  content: 'max-w-[1800px] mx-auto px-4 sm:px-6 xl:px-8 2xl:px-10 py-4',
  grid: 'grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.95fr)] lg:items-start',
  videoSection: 'lg:row-span-2',
  summarySection: 'lg:col-span-2 lg:row-start-3',
  transcriptSection: 'lg:col-start-2 lg:row-start-1',
  chatSection: 'lg:col-start-2 lg:row-start-2',
};

const LAYOUT_EXPANDED = {
  header: 'max-w-7xl mx-auto px-4 sm:px-6 py-2',
  content: 'max-w-7xl mx-auto px-6 py-4',
  grid: 'grid grid-cols-1 gap-4 lg:grid-cols-2',
  videoSection: 'lg:col-span-2',
  summarySection: 'lg:col-span-2',
  transcriptSection: '',
  chatSection: '',
};

const CallPage: React.FC = () => {
  const { '*': callPath } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect issue-number URLs (e.g., /calls/1954) to the canonical path
  const normalizedPath = callPath?.replace(/\/+$/, '');
  useEffect(() => {
    if (normalizedPath && !normalizedPath.includes('/') && /^\d+$/.test(normalizedPath)) {
      const issueNum = parseInt(normalizedPath);
      const byIssue = protocolCalls.find(c => c.issue === issueNum);
      if (byIssue) {
        navigate(`/calls/${byIssue.path}`, { replace: true });
      }
    }
  }, [normalizedPath, navigate]);

  const [callData, setCallData] = useState<CallData | null>(null);
  const [callConfig, setCallConfig] = useState<CallConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpcoming, setIsUpcoming] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const [isUserScrollingTranscript, setIsUserScrollingTranscript] = useState(false);
  const transcriptScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const isProgrammaticScrollRef = useRef(false);
  const lastHighlightedTimestampRef = useRef<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- YouTube player API type is not exported
  const [player, setPlayer] = useState<any>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<{timestamp: string, text: string, type: string} | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [isLargeScreen, setIsLargeScreen] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches
  );
  const [isTallScreen, setIsTallScreen] = useState(
    () => window.matchMedia(TALL_SCREEN_QUERY).matches
  );

  const searchShortcut = getSearchShortcutLabel();
  const isDesktopExpanded = isLargeScreen && isVideoExpanded;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 1024px)');
    const tallQuery = window.matchMedia(TALL_SCREEN_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      setIsLargeScreen(event.matches);
    };
    const handleTallChange = (event: MediaQueryListEvent) => {
      setIsTallScreen(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    tallQuery.addEventListener('change', handleTallChange);
    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      tallQuery.removeEventListener('change', handleTallChange);
    };
  }, []);

  // Variable to track initial search query from URL
  const [initialSearchQuery, setInitialSearchQuery] = useState('');
  // Track if we've already navigated to avoid duplicate seeks
  const hasNavigatedToSearchResult = useRef(false);

  // Set meta tags for social previews
  const matchingCall = useMemo(() => {
    if (!callData) return null;
    return protocolCalls.find(c => c.type === callData.type.toLowerCase() && c.number === callData.number) ?? null;
  }, [callData]);
  const callName = callData
    ? (matchingCall?.name || `${callTypeNames[callData.type.toLowerCase() as CallType] || callData.type}${isOneOffCall(callData.type.toLowerCase()) ? '' : ` #${callData.number}`}`)
    : 'Call';
  useMetaTags({
    title: `${callName} | Forkcast`,
    description: `Notes and recording for ${callName}`,
  });

  // Compute previous and next calls within the same series
  const { prevCall, nextCall } = useMemo(() => {
    if (!callData) return { prevCall: null, nextCall: null };

    // Get all calls of the same type (series), sorted by number
    // Note: callData.type may be uppercase, protocolCalls uses lowercase
    const callType = callData.type.toLowerCase();
    const seriesCalls = protocolCalls
      .filter(call => call.type === callType)
      .sort((a, b) => parseInt(a.number) - parseInt(b.number));

    const currentIndex = seriesCalls.findIndex(call => call.number === callData.number);

    // If call not found in protocolCalls (e.g., upcoming call), don't show navigation
    if (currentIndex === -1) {
      return { prevCall: null, nextCall: null };
    }

    return {
      prevCall: currentIndex > 0 ? seriesCalls[currentIndex - 1] : null,
      nextCall: currentIndex < seriesCalls.length - 1 ? seriesCalls[currentIndex + 1] : null,
    };
  }, [callData]);

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

    // Handle direct chat link (format: ?chat=00:05:28)
    const chatTimestamp = searchParams.get('chat');
    if (chatTimestamp) {
      setSelectedSearchResult({
        timestamp: chatTimestamp,
        text: '',
        type: 'chat'
      });
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

  // Keyboard shortcut to open search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSearchHotkey(e)) {
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
  const getAdjustedVideoTime = useCallback((transcriptTimestamp: string): number => {
    const transcriptSeconds = timestampToSeconds(formatTimestamp(transcriptTimestamp));

    // Calculate offset from current config state
    if (callConfig?.sync?.transcriptStartTime && callConfig?.sync?.videoStartTime) {
      const offset = timestampToSeconds(callConfig.sync.transcriptStartTime) - timestampToSeconds(callConfig.sync.videoStartTime);
      return transcriptSeconds - offset;
    }

    // Fallback to pre-calculated offset if config not available
    return transcriptSeconds - syncOffsetSeconds;
  }, [callConfig, syncOffsetSeconds]);

  useEffect(() => {
    const loadCallData = async () => {
      if (!callPath) {
        setLoading(false);
        return;
      }

      // Issue-number URLs are handled by the redirect effect
      if (normalizedPath && !normalizedPath.includes('/') && /^\d+$/.test(normalizedPath)) return;

      try {
        // Parse the call path (e.g., "acdc/154")
        const [type, number] = callPath.split('/');

        // Map from simplified URL to artifact folder path
        // We need to find the matching call from our data to get the date
        const matchingCall = protocolCalls.find(
          call => call.type === type && call.number === number
        );

        if (!matchingCall) {
          // Check if this is an upcoming call from route state
          const locationState = location.state as UpcomingCallState | null;
          if (locationState?.upcoming) {
            // Set minimal call data with YouTube URL for upcoming call
            setCallData({
              type: type?.toUpperCase() || '',
              date: locationState.date,
              number: number || '',
              videoUrl: locationState.youtubeUrl
              // No chatContent, transcriptContent, summaryData, etc.
            });
            setCallConfig({
              videoUrl: locationState.youtubeUrl,
              issue: locationState.issueNumber
            });
            setIsUpcoming(true);
            setLoading(false);
            return;
          }

          // Direct navigation — try fetching upcoming calls from GitHub
          try {
            const upcomingCalls = await fetchUpcomingCalls();
            const upcomingMatch = upcomingCalls.find(
              call => call.type === type && call.number === number
            );
            if (upcomingMatch) {
              setCallData({
                type: type?.toUpperCase() || '',
                date: upcomingMatch.date,
                number: number || '',
                videoUrl: upcomingMatch.youtubeUrl
              });
              setCallConfig({
                videoUrl: upcomingMatch.youtubeUrl,
                issue: upcomingMatch.issueNumber
              });
              setIsUpcoming(true);
              setLoading(false);
              return;
            }
          } catch {
            // Fall through to "not found"
          }

          console.error('Call not found:', callPath);
          setLoading(false);
          return;
        }

        // Construct the artifact path with date_number format
        const artifactPath = `${type}/${matchingCall.date}_${number}`;
        const date = matchingCall.date;

        // Load chat logs
        // Note: We validate content doesn't start with HTML because SPA dev servers
        // may return 200 with index.html for missing files
        let chatContent: string | undefined;
        const chatResponse = await fetch(`/artifacts/${artifactPath}/chat.txt`);
        if (chatResponse.ok) {
          const content = await chatResponse.text();
          if (content.trim() && !content.trimStart().startsWith('<!')) {
            chatContent = content;
          }
        }

        // Load transcript (prefer corrected version if available)
        // Note: We validate content starts with "WEBVTT" because SPA dev servers
        // may return 200 with index.html for missing files
        let transcriptContent: string | undefined;
        const correctedResponse = await fetch(`/artifacts/${artifactPath}/transcript_corrected.vtt`);
        if (correctedResponse.ok) {
          const content = await correctedResponse.text();
          if (content.trimStart().startsWith('WEBVTT')) {
            transcriptContent = content;
          }
        }
        if (!transcriptContent) {
          const transcriptResponse = await fetch(`/artifacts/${artifactPath}/transcript.vtt`);
          if (transcriptResponse.ok) {
            const content = await transcriptResponse.text();
            if (content.trimStart().startsWith('WEBVTT')) {
              transcriptContent = content;
            }
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

        // Load key decisions if they exist
        let keyDecisions: KeyDecision[] | undefined;
        const keyDecisionsResponse = await fetch(`/artifacts/${artifactPath}/key_decisions.json`);
        if (keyDecisionsResponse.ok) {
          try {
            const kdData = await keyDecisionsResponse.json();
            keyDecisions = kdData?.key_decisions;
          } catch (e) {
            console.warn('Failed to parse key_decisions.json:', e);
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
          tldrData,
          keyDecisions
        });

      } catch (error) {
        console.error('Failed to load call data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCallData();
  }, [callPath, normalizedPath, location.state]);

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
  }, [player, callConfig, getAdjustedVideoTime]);

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

    // Smooth scroll within container only
    container.scrollTo({
      top: finalScrollTop,
      behavior: 'smooth'
    });
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
  }, [currentVideoTime, isPlaying, callConfig, isUserScrollingTranscript, isDesktopExpanded]);

  useEffect(() => {
    lastHighlightedTimestampRef.current = null;
  }, [isDesktopExpanded]);

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
        return; // Exit early if URL hash was handled
      }
    }

    // If no URL hash, start video at videoStartTime to skip intro filler
    if (callConfig?.sync?.videoStartTime) {
      const startTime = timestampToSeconds(callConfig.sync.videoStartTime);
      if (startTime > 0) {
        setTimeout(() => {
          event.target.seekTo(startTime);
          setCurrentVideoTime(startTime);
        }, 100);
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

  const handleTranscriptClick = (timestamp: string, searchResult?: { text: string; type: string }) => {
    if (player) {
      const adjustedTime = getAdjustedVideoTime(timestamp);
      player.seekTo(adjustedTime);

      // Update currentVideoTime immediately to ensure highlighting updates
      setCurrentVideoTime(adjustedTime);

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

      // Update URL with timestamp for sharing
      const newHash = `#t=${Math.floor(adjustedTime)}`;
      window.history.replaceState(null, '', newHash);
    }
  };

  // Check if a transcript entry should be highlighted based on current video time
  const isCurrentEntry = (entryTimestamp: string, index: number, entries: { timestamp: string }[]): boolean => {
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
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-slate-600 dark:text-slate-400">Loading call data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!callData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
        {/* Header spacer - GlobalNav handles navigation */}

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-12 shadow-sm text-center">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <svg className="w-10 h-10 text-slate-400 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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







  const oneOff = isOneOffCall(callData.type.toLowerCase());

  const getCallTypeLabel = () => {
    if (matchingCall?.name) return matchingCall.name;
    const type = callData.type.toLowerCase() as CallType;
    return callTypeNames[type] || callData.type;
  };

  // Get associated EIP info for breakout calls
  const getBreakoutEipInfo = (): { eip: EIP; latestFork: ForkRelationship | null } | null => {
    const callType = callData.type.toLowerCase();
    const eipId = BREAKOUT_EIP_MAP[callType];
    if (!eipId) return null;

    const eip = eipsData.find(e => e.id === eipId);
    if (!eip) return null;

    // Get the latest fork relationship (last in array, typically the most current upgrade)
    const latestFork = eip.forkRelationships.length > 0
      ? eip.forkRelationships[eip.forkRelationships.length - 1]
      : null;

    return { eip, latestFork };
  };

  const breakoutEipInfo = getBreakoutEipInfo();

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

  const isExpandedVideo = isDesktopExpanded && Boolean(callData.videoUrl);
  const isWorkspaceView = !isExpandedVideo && isLargeScreen && Boolean(callData.videoUrl);
  const showSummaryInColumn = isWorkspaceView && isTallScreen && Boolean(callData.tldrData);
  const layout = isExpandedVideo ? LAYOUT_EXPANDED : LAYOUT_DEFAULT;

  const renderSummaryHeader = () => callData.tldrData && (
    <div className="flex items-center gap-2">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
        Summary
      </h2>
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {Object.values(callData.tldrData.highlights).flat().length} highlights{callData.keyDecisions?.length ? ` • ${callData.keyDecisions.length} decisions` : ''} • {callData.tldrData.action_items?.length || 0} action items
      </span>
      <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 px-2 py-0.5 rounded-full font-normal border border-slate-200 dark:border-slate-600">
        Experimental
      </span>
    </div>
  );

  const renderSummaryContent = () => callData.tldrData && (
    <div className="p-6">
      <TldrSummary
        data={callData.tldrData}
        keyDecisions={callData.keyDecisions}
        onTimestampClick={handleTranscriptClick}
        syncConfig={callConfig?.sync}
        currentVideoTime={currentVideoTime}
        selectedSearchResult={selectedSearchResult}
      />
    </div>
  );

  const renderVideoSection = () => (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${isWorkspaceView ? 'flex h-full flex-col' : ''}`}
      style={isWorkspaceView ? { height: showSummaryInColumn ? DESKTOP_SIDEBAR_PANE_HEIGHT : DESKTOP_WORKSPACE_HEIGHT } : undefined}
    >
      <div className={isWorkspaceView ? 'flex min-h-0 flex-1 flex-col' : 'flex flex-col gap-4'}>
        {/* Video Player */}
        <div className={isWorkspaceView ? 'min-h-0 flex-1' : ''}>
          <div className={`relative overflow-hidden rounded-lg ${isWorkspaceView ? 'h-full min-h-0' : 'aspect-video'}`}>
            <YouTube
              videoId={extractYouTubeId(callData.videoUrl!)}
              className="absolute inset-0 h-full w-full"
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
        <div className={isWorkspaceView ? 'border-t border-slate-200 pt-3 dark:border-slate-700' : 'border-t border-slate-200 pt-3 dark:border-slate-700'}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {getCallTypeLabel()}{oneOff ? '' : ` #${callData.number}`}
            </h2>
            <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 dark:text-slate-400">📅</span>
              <span className="text-slate-700 dark:text-slate-200 font-medium">{callData.date}</span>
            </div>
            {callConfig?.issue && (
              <>
                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
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
              </>
            )}
            {breakoutEipInfo && (
              <>
                <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 dark:text-slate-400">📋</span>
                  <span className="text-slate-600 dark:text-slate-300">EIP:</span>
                  <Link
                    to={`/eips/${breakoutEipInfo.eip.id}`}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium underline decoration-1 underline-offset-2"
                  >
                    {breakoutEipInfo.eip.id}
                  </Link>
                  {!isWorkspaceView && breakoutEipInfo.latestFork && (
                    <span className="text-slate-500 dark:text-slate-400">
                      ({breakoutEipInfo.latestFork.statusHistory[breakoutEipInfo.latestFork.statusHistory.length - 1]?.status} for {breakoutEipInfo.latestFork.forkName}{breakoutEipInfo.latestFork.isHeadliner ? ', Headliner' : ''})
                    </span>
                  )}
                </div>
              </>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setIsVideoExpanded(current => !current)}
              className="hidden lg:inline-flex items-center gap-1.5 flex-shrink-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-normal text-slate-500 dark:text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-300 cursor-pointer"
            >
              {isExpandedVideo ? (
                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
                  {/* Arrows pointing inward — hooks at inner points */}
                  <path d="M4 4l5 5M9 5.5v3.5H5.5" />
                  <path d="M20 4l-5 5M15 5.5v3.5h3.5" />
                  <path d="M4 20l5-5M9 18.5v-3.5H5.5" />
                  <path d="M20 20l-5-5M15 18.5v-3.5h3.5" />
                </svg>
              ) : (
                <svg className="h-4.5 w-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round">
                  {/* Arrows pointing outward — hooks at corners */}
                  <path d="M9 9L4 4M4 8V4h4" />
                  <path d="M15 9l5-5M20 8V4h-4" />
                  <path d="M9 15l-5 5M4 16v4h4" />
                  <path d="M15 15l5 5M20 16v4h-4" />
                </svg>
              )}
              {isExpandedVideo ? 'Exit Theater' : 'Theater Mode'}
            </button>
          </div>
          {isExpandedVideo && (prevCall || nextCall) && (
            <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center gap-2">
              {prevCall ? (
                <Link
                  to={`/calls/${prevCall.path}`}
                  className="group flex-1 flex flex-col items-start gap-0.5 p-2 -m-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {callTypeNames[prevCall.type as CallType] || prevCall.type} #{prevCall.number}
                  </span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
              {nextCall ? (
                <Link
                  to={`/calls/${nextCall.path}`}
                  className="group flex-1 flex flex-col items-end gap-0.5 p-2 -m-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    Next
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {callTypeNames[nextCall.type as CallType] || nextCall.type} #{nextCall.number}
                  </span>
                </Link>
              ) : (
                <span className="flex-1" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderTranscriptCard = () => (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${isWorkspaceView ? 'flex min-h-0 flex-col' : ''}`}
      style={isWorkspaceView ? { height: DESKTOP_SIDEBAR_PANE_HEIGHT } : undefined}
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Transcript</h2>
      {callData.transcriptContent?.trim() ? (
        <div
          ref={transcriptRef}
          className={`space-y-1 overflow-y-auto pr-2 ${isWorkspaceView ? 'min-h-0 flex-1' : 'max-h-[400px]'}`}
        >
          {parseVTTTranscript(callData.transcriptContent)
            .filter(entry => {
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
      ) : isUpcoming ? (
        <div className={`flex flex-col items-center justify-center text-center ${isWorkspaceView ? 'flex-1' : 'py-12'}`}>
          <svg className="w-10 h-10 text-amber-400 dark:text-amber-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Transcript pending</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">The transcript will be available after the call</p>
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center text-center ${isWorkspaceView ? 'flex-1' : 'py-12'}`}>
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-slate-400">No transcript available</p>
        </div>
      )}
    </div>
  );

  const renderChatCard = () => (
    <div
      className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${isWorkspaceView ? 'flex min-h-0 flex-col' : ''}`}
      style={isWorkspaceView ? { height: DESKTOP_SIDEBAR_PANE_HEIGHT } : undefined}
    >
      <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Chat Logs</h2>
      {callData.chatContent ? (
        <div ref={chatLogRef} className={`overflow-y-auto pr-2 ${isWorkspaceView ? 'min-h-0 flex-1' : 'max-h-[400px]'}`}>
          <ChatLog content={callData.chatContent} syncConfig={callConfig?.sync} selectedSearchResult={selectedSearchResult} onTimestampClick={handleTranscriptClick} />
        </div>
      ) : isUpcoming ? (
        <div className={`flex flex-col items-center justify-center text-center ${isWorkspaceView ? 'flex-1' : 'py-12'}`}>
          <svg className="w-10 h-10 text-amber-400 dark:text-amber-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Chat logs pending</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Chat logs will be available after the call</p>
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center text-center ${isWorkspaceView ? 'flex-1' : 'py-12'}`}>
          <svg className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-slate-400">No chat logs available</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Compact Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-12 z-10">
        <div className={layout.header}>
          {/* Mobile Layout */}
          <div className="sm:hidden flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {getCallTypeLabel()}{oneOff ? '' : ` #${callData.number}`}
              </span>
            </div>
            <Link
              to="/calls"
              className="text-xs text-slate-600 dark:text-slate-400"
            >
              ← Back
            </Link>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {getCallTypeLabel()}{oneOff ? '' : ` #${callData.number}`}
              </h1>
              <span className="text-sm text-slate-500 dark:text-slate-400">• {callData.date}</span>
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
        tldrData={callData.tldrData}
        onResultClick={handleTranscriptClick}
        syncConfig={callConfig?.sync}
        isOpen={isSearchOpen}
        setIsOpen={setIsSearchOpen}
        initialQuery={initialSearchQuery}
      />

      {/* Content */}
      <div className={layout.content}>
        <div className={layout.grid}>
          {callData.videoUrl && (
            <div className={`min-w-0 ${showSummaryInColumn ? 'lg:col-start-1 lg:row-start-1' : layout.videoSection}`}>
              {renderVideoSection()}
            </div>
          )}

          {showSummaryInColumn && callData.tldrData && (
            <div
              className="lg:col-start-1 lg:row-start-2"
              style={{ height: DESKTOP_SIDEBAR_PANE_HEIGHT }}
            >
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="px-4 py-3 flex-shrink-0">
                  {renderSummaryHeader()}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 min-h-0 flex-1 overflow-y-auto">
                  {renderSummaryContent()}
                </div>
              </div>
            </div>
          )}

          {!showSummaryInColumn && callData.tldrData && (
            <div className={layout.summarySection}>
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <button
                  onClick={() => setSummaryExpanded(!summaryExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors rounded-t-lg cursor-pointer"
                >
                  {renderSummaryHeader()}
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
                    {renderSummaryContent()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={`min-w-0 ${layout.transcriptSection}`}>
            {renderTranscriptCard()}
          </div>

          <div className={`min-w-0 ${layout.chatSection}`}>
            {renderChatCard()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallPage;
