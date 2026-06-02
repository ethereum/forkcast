import React, { useState } from 'react';
import {
  getReplyBody,
  getReplyQuotedText,
  isReplyMessage,
  parseChatTranscript,
  type ChatMessage,
} from '../../domain/chat/zoomChat';

interface ChatLogProps {
  content: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  syncConfig?: {
    transcriptStartTime: string | null;
    videoStartTime: string | null;
    description?: string;
  } | null;
  selectedSearchResult?: {timestamp: string, text: string, type: string} | null;
  onTimestampClick?: (timestamp: string) => void;
  allowTimestampNavigation?: boolean;
}

const ChatLog: React.FC<ChatLogProps> = ({
  content,
  syncConfig,
  selectedSearchResult,
  onTimestampClick,
  allowTimestampNavigation = true,
}) => {
  const [copiedTimestamp, setCopiedTimestamp] = useState<string | null>(null);

  // --- Copy link to a specific chat message ---
  const copyMessageLink = (timestamp: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Don't trigger video seek
    const url = new URL(window.location.href);
    const breakout = url.searchParams.get('breakout');
    url.search = '';
    if (breakout) {
      url.searchParams.set('breakout', breakout);
    }
    url.searchParams.set('chat', timestamp);
    url.hash = '';

    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopiedTimestamp(timestamp);
      setTimeout(() => setCopiedTimestamp(null), 2000);
    });
  };

  // --- Handle clicking on chat entries (but not links) ---
  const handleChatEntryClick = (event: React.MouseEvent, timestamp: string) => {
    // Don't trigger video jump if clicking on a link
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'a' || target.closest('a')) {
      return;
    }

    if (allowTimestampNavigation && onTimestampClick && timestamp !== '00:00:00') {
      onTimestampClick(timestamp);
    }
  };

  // --- Helper function to render text with links ---
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // --- Timestamp conversion helpers ---
  const timestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(':');
    if (parts.length !== 3) return 0;
    const [hours, minutes, seconds] = parts.map(p => parseFloat(p));
    return hours * 3600 + minutes * 60 + seconds;
  };

  const secondsToTimestamp = (totalSeconds: number): string => {
    const sign = totalSeconds < 0 ? '-' : '';
    const absSeconds = Math.abs(totalSeconds);
    const hours = Math.floor(absSeconds / 3600);
    const minutes = Math.floor((absSeconds % 3600) / 60);
    const seconds = Math.floor(absSeconds % 60);

    return `${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getAdjustedVideoTime = (chatTimestamp: string): number => {
    if (!syncConfig?.transcriptStartTime || !syncConfig?.videoStartTime) return 0;
    const chatSeconds = timestampToSeconds(chatTimestamp);
    const syncOffsetSeconds = timestampToSeconds(syncConfig.transcriptStartTime) - timestampToSeconds(syncConfig.videoStartTime);
    return chatSeconds - syncOffsetSeconds;
  };

  // --- Threading and rendering logic (from TranscriptModal) ---
  const { messages: allMessages, reactions } = parseChatTranscript(content);

  // Filter out messages before transcriptStartTime if sync config exists
  const messages = allMessages.filter(msg => {
    if (syncConfig?.transcriptStartTime) {
      const msgSeconds = timestampToSeconds(msg.timestamp);
      const startSeconds = timestampToSeconds(syncConfig.transcriptStartTime);
      return msgSeconds >= startSeconds;
    }
    return true;
  });

  const parentMessages: ChatMessage[] = [];
  const replyMessages: ChatMessage[] = [];
  messages.forEach((msg) => {
    if (isReplyMessage(msg.message)) {
      replyMessages.push(msg);
    } else {
      parentMessages.push(msg);
    }
  });
  // Create virtual parent messages from quoted text in replies
  const virtualParents = new Map<string, ChatMessage>();
  const matchedReplies = new Set<ChatMessage>();
  replyMessages.forEach((reply) => {
    const quotedText = getReplyQuotedText(reply.message);

    if (quotedText) {
      // Handle abbreviated quotes (ending with "...")
      const isAbbreviated = quotedText.endsWith('...');
      const searchText = isAbbreviated ? quotedText.slice(0, -3).trim() : quotedText;

      const realParent = parentMessages.find(parent => {
        const parentLower = parent.message.toLowerCase();
        const searchLower = searchText.toLowerCase();
        // For abbreviated quotes, check if parent starts with the search text
        // For full quotes, check if parent contains the search text
        return isAbbreviated ? parentLower.startsWith(searchLower) : parentLower.includes(searchLower);
      });

      if (!realParent && !virtualParents.has(quotedText)) {
        virtualParents.set(quotedText, {
          timestamp: '00:00:00',
          speaker: 'Unknown',
          message: quotedText
        });
      }
    }
  });
  const allParents = [...parentMessages, ...Array.from(virtualParents.values())];
  const threads: { parent: ChatMessage; replies: ChatMessage[] }[] = [];
  allParents.forEach((parent) => {
    const replies: ChatMessage[] = [];
    replyMessages.forEach((reply) => {
      if (matchedReplies.has(reply)) return;
      const quotedText = getReplyQuotedText(reply.message);

      if (quotedText) {
        // Handle abbreviated quotes (ending with "...")
        const isAbbreviated = quotedText.endsWith('...');
        const searchText = isAbbreviated ? quotedText.slice(0, -3).trim() : quotedText;

        const parentLower = parent.message.toLowerCase();
        const searchLower = searchText.toLowerCase();

        // For abbreviated quotes, check if parent starts with the search text
        // For full quotes, check if parent contains the search text
        const isMatch = isAbbreviated ? parentLower.startsWith(searchLower) : parentLower.includes(searchLower);

        if (isMatch) {
          replies.push(reply);
          matchedReplies.add(reply);
        }
      }
    });
    if (replies.length > 0) {
      threads.push({ parent, replies });
    }
  });
  // Map for quick lookup
  const parentToReplies = new Map<string, ChatMessage[]>();
  threads.forEach(thread => {
    const key = `${thread.parent.timestamp}|${thread.parent.speaker}|${thread.parent.message}`;
    parentToReplies.set(key, thread.replies);
  });
  const allReplyMessages = new Set<ChatMessage>();
  threads.forEach(thread => {
    thread.replies.forEach(reply => allReplyMessages.add(reply));
  });
  const standaloneMessages = messages.filter(msg => !allReplyMessages.has(msg))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // --- Render ---
  return (
    <div className="space-y-2">
      {standaloneMessages.map((message, index) => {
        const key = `${message.timestamp}|${message.speaker}|${message.message}`;
        const replies = parentToReplies.get(key);
        const isParentWithReplies = replies && replies.length > 0;
        const isSelectedSearch = selectedSearchResult?.timestamp === message.timestamp && selectedSearchResult?.type === 'chat';
        const isTimestampClickable = allowTimestampNavigation && message.timestamp !== '00:00:00';
        return (
          <div key={index} className="space-y-1">
            {/* Message */}
            <div
              data-chat-timestamp={message.timestamp}
              onClick={(e) => handleChatEntryClick(e, message.timestamp)}
              className={`group hover:bg-slate-50 dark:hover:bg-slate-700/30 py-1 px-2 -mx-2 rounded transition-colors ${isTimestampClickable ? 'cursor-pointer' : ''}
                ${isSelectedSearch ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-500 rounded-r-md' : ''}
              `}
            >
              <div className="flex gap-3 text-sm">
                {message.timestamp !== '00:00:00' ? (
                  <button
                    onClick={(e) => copyMessageLink(message.timestamp, e)}
                    className={`text-xs flex-shrink-0 font-mono mt-0.5 transition-colors ${
                      copiedTimestamp === message.timestamp
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : isSelectedSearch
                          ? 'text-yellow-600 dark:text-yellow-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                          : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                    }`}
                    style={{ minWidth: '64px' }}
                  >
                    <span className="group-hover:hidden">
                      {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                        ? secondsToTimestamp(getAdjustedVideoTime(message.timestamp))
                        : message.timestamp}
                    </span>
                    <span className="hidden group-hover:inline text-[10px] hover:underline cursor-pointer">
                      {copiedTimestamp === message.timestamp ? 'Copied!' : 'Copy link'}
                    </span>
                  </button>
                ) : (
                  <span className={`text-xs flex-shrink-0 font-mono mt-0.5 ${isSelectedSearch ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-500 dark:text-slate-400'}`} style={{ minWidth: '64px' }}>
                    --:--:--
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <span className={`font-medium mr-2 ${isSelectedSearch ? 'text-yellow-900 dark:text-yellow-100' : 'text-slate-700 dark:text-slate-300'}`}>
                    {message.speaker === 'Unknown' ? 'Context' : message.speaker}:
                  </span>
                  <span className={`break-words ${
                    message.speaker === 'Unknown' 
                      ? (isSelectedSearch ? 'text-yellow-600 dark:text-yellow-400 italic' : 'text-slate-500 dark:text-slate-400 italic')
                      : (isSelectedSearch ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400')
                  }`}>
                    {message.message.split(/\r\n|\r|\n/).map((line, index) => (
                      <React.Fragment key={index}>
                        {index > 0 && <br />}
                        {renderTextWithLinks(line)}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              </div>
            </div>
            {/* Emoji Reactions */}
            {(() => {
              // Find reactions that match this message (normalized comparison)
              const messageReactions = Array.from(reactions.entries())
                .filter(([reactionText]) => {
                  // Both the reaction text and the message text should be compared without ellipsis
                  const normalizedMessage = message.message.replace(/\.\.\.$/, '').trim();
                  if (reactionText.endsWith('...')) {
                    return normalizedMessage.startsWith(reactionText.slice(0, -3).trim());
                  }
                  return reactionText === message.message;
                })
                .flatMap(([, reactionList]) => reactionList);

              // Group reactions by emoji
              const groupedReactions = messageReactions.reduce((acc, reaction) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = [];
                }
                acc[reaction.emoji].push(reaction.speaker);
                return acc;
              }, {} as Record<string, string[]>);

              return Object.keys(groupedReactions).length > 0 ? (
                <div className="flex gap-1 ml-20 text-xs mt-1">
                  {Object.entries(groupedReactions).map(([emoji, speakers], index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-xs border border-slate-200 dark:border-slate-600"
                      title={speakers.join(', ')}
                    >
                      <span>{emoji}</span>
                      {speakers.length > 1 && (
                        <span className="text-slate-500 dark:text-slate-400 font-medium">
                          {speakers.length}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              ) : null;
            })()}
            {/* Reply Messages */}
            {isParentWithReplies && replies!.map((reply, replyIndex) => {
              const actualMessage = getReplyBody(reply.message) ?? reply.message;
              const isSelectedReply = selectedSearchResult?.timestamp === reply.timestamp && selectedSearchResult?.type === 'chat';

              // Find reactions for the reply's actual message content
              const replyMessageReactions = Array.from(reactions.entries())
                .filter(([reactionText]) => {
                  // Match against the actual message content, not the full "Replying to..." text
                  const normalizedMessage = actualMessage.replace(/\.\.\.$/, '').trim();
                  if (reactionText.endsWith('...')) {
                    return normalizedMessage.startsWith(reactionText.slice(0, -3).trim());
                  }
                  return reactionText === actualMessage;
                })
                .flatMap(([, reactionList]) => reactionList);

              // Group reactions by emoji for replies
              const groupedReplyReactions = replyMessageReactions.reduce((acc, reaction) => {
                if (!acc[reaction.emoji]) {
                  acc[reaction.emoji] = [];
                }
                acc[reaction.emoji].push(reaction.speaker);
                return acc;
              }, {} as Record<string, string[]>);

              return (
                <div key={replyIndex} className="space-y-1">
                  <div
                    data-chat-timestamp={reply.timestamp}
                    onClick={(e) => handleChatEntryClick(e, reply.timestamp)}
                    className={`group ml-20 mt-1 pl-4 border-l-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded transition-colors ${isSelectedReply ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-slate-200 dark:border-slate-600'}`}
                  >
                    <div className="flex gap-3 text-sm">
                      <button
                        onClick={(e) => copyMessageLink(reply.timestamp, e)}
                        className={`text-xs flex-shrink-0 font-mono mt-0.5 transition-colors ${
                          copiedTimestamp === reply.timestamp
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isSelectedReply
                              ? 'text-yellow-600 dark:text-yellow-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                              : 'text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                        }`}
                        style={{ minWidth: '64px' }}
                      >
                        <span className="group-hover:hidden">
                          {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                            ? secondsToTimestamp(getAdjustedVideoTime(reply.timestamp))
                            : reply.timestamp}
                        </span>
                        <span className="hidden group-hover:inline text-[10px] hover:underline cursor-pointer">
                          {copiedTimestamp === reply.timestamp ? 'Copied!' : 'Copy link'}
                        </span>
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`font-medium mr-2 ${isSelectedReply ? 'text-yellow-900 dark:text-yellow-100' : 'text-slate-700 dark:text-slate-300'}`}>
                          {reply.speaker}:
                        </span>
                        <span className={`break-words ${isSelectedReply ? 'text-slate-900 dark:text-slate-100' : 'text-slate-600 dark:text-slate-400'}`}>
                          {actualMessage.split(/\r\n|\r|\n/).map((line, index) => (
                            <React.Fragment key={index}>
                              {index > 0 && <br />}
                              {renderTextWithLinks(line)}
                            </React.Fragment>
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Emoji Reactions for Replies */}
                  {Object.keys(groupedReplyReactions).length > 0 && (
                    <div className="flex gap-1 ml-20 pl-4 text-xs mt-1">
                      {Object.entries(groupedReplyReactions).map(([emoji, speakers], index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full text-xs border border-slate-200 dark:border-slate-600"
                          title={speakers.join(', ')}
                        >
                          <span>{emoji}</span>
                          {speakers.length > 1 && (
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                              {speakers.length}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default ChatLog;
