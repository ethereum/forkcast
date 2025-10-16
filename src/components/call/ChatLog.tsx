import React from 'react';

interface ChatMessage {
  timestamp: string;
  speaker: string;
  message: string;
}

interface ChatLogProps {
  content: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  syncConfig?: {
    transcriptStartTime: string;
    videoStartTime: string;
    description?: string;
  } | null;
  selectedSearchResult?: {timestamp: string, text: string, type: string} | null;
  onTimestampClick?: (timestamp: string) => void;
}

const ChatLog: React.FC<ChatLogProps> = ({ content, syncConfig, selectedSearchResult, onTimestampClick }) => {
  // --- Handle clicking on chat entries (but not links) ---
  const handleChatEntryClick = (event: React.MouseEvent, timestamp: string) => {
    // Don't trigger video jump if clicking on a link
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'a' || target.closest('a')) {
      return;
    }

    if (onTimestampClick && timestamp !== '00:00:00') {
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
    if (!syncConfig) return 0;
    const chatSeconds = timestampToSeconds(chatTimestamp);
    const syncOffsetSeconds = timestampToSeconds(syncConfig.transcriptStartTime) - timestampToSeconds(syncConfig.videoStartTime);
    return chatSeconds - syncOffsetSeconds;
  };

  const parseChatTranscript = (text: string): { messages: ChatMessage[]; reactions: Map<string, { speaker: string; emoji: string }[]> } => {
    // Pre-process lines to merge multi-line messages
    const rawLines = text.split('\n');
    const processedLines: string[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];

      // If this line has a timestamp, it's a new message
      if (/^\d{2}:\d{2}:\d{2}\t/.test(line)) {
        processedLines.push(line);
      } else if (line.trim()) {
        // This line doesn't have a timestamp, so it's a continuation
        // Find the last line with content to merge with
        let targetIndex = processedLines.length - 1;
        while (targetIndex >= 0 && !processedLines[targetIndex].trim()) {
          targetIndex--;
        }

        if (targetIndex >= 0) {
          const lastNonEmptyLine = processedLines[targetIndex];
          // Don't merge if the last line is a "Replying to" header - treat the next line as the reply content
          // Handle both English and Dutch formats
          if (/:\tReplying to/.test(lastNonEmptyLine) || /:\tAntwoord verzenden naar/.test(lastNonEmptyLine)) {
            // This is the actual reply content, merge it with the "Replying to" line
            // Normalize Dutch format to English
            let normalizedLine = lastNonEmptyLine;
            if (/:\tAntwoord verzenden naar/.test(lastNonEmptyLine)) {
              normalizedLine = lastNonEmptyLine.replace(':\tAntwoord verzenden naar', ':\tReplying to');
            }
            processedLines[targetIndex] = `${normalizedLine.trimEnd()} → ${line.trim()}`;
          } else {
            // Regular multi-line content, use newline to preserve formatting
            processedLines[targetIndex] = `${processedLines[targetIndex].trimEnd()}\n${line.trim()}`;
          }
        } else {
          // No previous message found, add as new line
          processedLines.push(line);
        }
      } else {
        // Empty line - preserve it for now
        processedLines.push(line);
      }
    }

    const lines = processedLines.filter(line => line.trim());
    const messages: ChatMessage[] = [];
    const reactions = new Map<string, { speaker:string; emoji: string }[]>();
    let lastMessageForReaction: ChatMessage | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trimEnd();
      const match = line.match(/^(\d{2}:\d{2}:\d{2})\t(.+?):\t([\s\S]*)$/);
      if (match) {
        const timestamp = match[1];
        const speaker = match[2].trim();
        const message = match[3].trim();

        // Handle "add emoji" shorthand
        const addReactionMatch = message.match(/^add\s(.+)$/);
        if (addReactionMatch && lastMessageForReaction) {
          const emoji = addReactionMatch[1].trim();
          const targetMessage = lastMessageForReaction.message;

          if (!reactions.has(targetMessage)) {
            reactions.set(targetMessage, []);
          }
          reactions.get(targetMessage)!.push({ speaker, emoji });
          continue;
        }

        // Parse reactions for later display
        if (message.startsWith('Reacted to') || message.startsWith('Heeft gereageerd op')) {
          // Handle multiple formats:
          // English:
          // 1. Reacted to "message" with emoji
          // 2. Reacted to message with "emoji"
          // 3. Reacted to "message" with "emoji"
          // Dutch:
          // 4. Heeft gereageerd op "message" met emoji
          // Also handle curly quotes - be more specific to avoid multiple matches
          const reactionPatterns = [
            /Reacted to [""]([^""]+)[""] with [""](.+?)[""]/,  // Both quoted (English)
            /Reacted to [""]([^""]+)[""] with ([^""\s]+)$/,  // Quoted message, unquoted emoji (English)
            /Reacted to ([^""]+?) with [""](.+?)[""]/,  // Unquoted message, quoted emoji (English)
            /Heeft gereageerd op [""]([^""]+)[""] met (.+)$/,  // Dutch format
          ];

          let matched = false;
          for (const pattern of reactionPatterns) {
            const reactionMatch = message.match(pattern);
            if (reactionMatch) {
              // Normalize the target message - handle ellipsis for truncated messages
              let targetMessage = reactionMatch[1].replace(/[""]/g, '').trim();
              const emoji = reactionMatch[2].replace(/[""]/g, '').trim();

              // Attempt to find the full message text if the reaction is on a truncated message
              const isTruncated = targetMessage.endsWith('...');
              if (isTruncated) {
                const searchText = targetMessage.slice(0, -3).trim();
                const parentMessage = messages.find(m => m.message.startsWith(searchText));
                if (parentMessage) {
                  targetMessage = parentMessage.message;
                }
              }

              if (!reactions.has(targetMessage)) {
                reactions.set(targetMessage, []);
              }
              reactions.get(targetMessage)!.push({ speaker, emoji });
              matched = true;
              break;
            }
          }

          if (matched) continue;
        }
        // Handle "Replying to" messages (English and Dutch)
        if (message.startsWith('Replying to') || message.startsWith('Antwoord verzenden naar')) {
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            // Check if next line is NOT a new timestamped message
            if (!nextLine.match(/^\d{2}:\d{2}:\d{2}\t/)) {
              const actualMessage = nextLine.trim();
              if (actualMessage) {
                // Convert Dutch format to English format for consistency
                let normalizedMessage = message;
                if (message.startsWith('Antwoord verzenden naar')) {
                  normalizedMessage = message.replace('Antwoord verzenden naar', 'Replying to');
                }
                messages.push({
                  timestamp,
                  speaker,
                  message: `${normalizedMessage} → ${actualMessage}`
                });
                i++; // Skip the next line since we've consumed it
                continue;
              }
            }
          }
        }
        // Regular messages
        if (message) {
          const chatMessage = {
            timestamp,
            speaker,
            message
          };
          messages.push(chatMessage);
          lastMessageForReaction = chatMessage;
        }
      }
    }
    return { messages, reactions };
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
    if (msg.message.startsWith('Replying to') || msg.message.startsWith('Antwoord verzenden naar')) {
      replyMessages.push(msg);
    } else {
      parentMessages.push(msg);
    }
  });
  // Create virtual parent messages from quoted text in replies
  const virtualParents = new Map<string, ChatMessage>();
  const matchedReplies = new Set<ChatMessage>();
  replyMessages.forEach((reply) => {
    // Handle quotes in the replied-to text by looking for the pattern more flexibly
    // Support both English and Dutch formats
    const englishMatch = reply.message.match(/^Replying to "(.+?)"(?:\s|$)/);
    const dutchMatch = reply.message.match(/^Antwoord verzenden naar "(.+?)"(?:\s|$)/);
    const match = englishMatch || dutchMatch;

    if (match) {
      const quotedText = match[1];
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
      // Handle quotes in the replied-to text by looking for the pattern more flexibly
      // Support both English and Dutch formats
      const englishMatch = reply.message.match(/^Replying to "(.+?)"(?:\s|$)/);
      const dutchMatch = reply.message.match(/^Antwoord verzenden naar "(.+?)"(?:\s|$)/);
      const match = englishMatch || dutchMatch;

      if (match) {
        const quotedText = match[1];
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
        return (
          <div key={index} className="space-y-1">
            {/* Message */}
            <div
              data-chat-timestamp={message.timestamp}
              onClick={(e) => handleChatEntryClick(e, message.timestamp)}
              className={`group hover:bg-slate-50 dark:hover:bg-slate-700/30 py-1 px-2 -mx-2 rounded transition-colors cursor-pointer
                ${isSelectedSearch ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-2 border-yellow-500 rounded-r-md' : ''}
              `}
            >
              <div className="flex gap-3 text-sm">
                <span className={`text-xs flex-shrink-0 font-mono mt-0.5 ${isSelectedSearch ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-500 dark:text-slate-400'}`} style={{ minWidth: '64px' }}>
                  {message.timestamp === '00:00:00'
                    ? '--:--:--'
                    : syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                      ? secondsToTimestamp(getAdjustedVideoTime(message.timestamp))
                      : message.timestamp
                  }
                </span>
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
                .filter(([reactionText, _]) => {
                  // Both the reaction text and the message text should be compared without ellipsis
                  const normalizedMessage = message.message.replace(/\.\.\.$/, '').trim();
                  if (reactionText.endsWith('...')) {
                    return normalizedMessage.startsWith(reactionText.slice(0, -3).trim());
                  }
                  return reactionText === message.message;
                })
                .flatMap(([_, reactionList]) => reactionList);

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
              // Extract just the actual message content after "Replying to..." or "Antwoord verzenden naar..."
              // The message format is: "Replying to "quoted" → actual message" or "Antwoord verzenden naar "quoted" → actual message"
              // Handle quotes in the replied-to text by using a more flexible pattern
              const englishReplyMatch = reply.message.match(/^Replying to "(.+?)"\s*→\s*(.+)$/);
              const dutchReplyMatch = reply.message.match(/^Antwoord verzenden naar "(.+?)"\s*→\s*(.+)$/);
              const replyMatch = englishReplyMatch || dutchReplyMatch;
              const actualMessage = replyMatch ? replyMatch[2] : reply.message;
              const isSelectedReply = selectedSearchResult?.timestamp === reply.timestamp && selectedSearchResult?.type === 'chat';
              return (
                <div
                  key={replyIndex}
                  data-chat-timestamp={reply.timestamp}
                  onClick={(e) => handleChatEntryClick(e, reply.timestamp)}
                  className={`ml-20 mt-1 pl-4 border-l-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded transition-colors ${isSelectedReply ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' : 'border-slate-200 dark:border-slate-600'}`}
                >
                  <div className="flex gap-3 text-sm">
                    <span className={`text-xs flex-shrink-0 font-mono mt-0.5 ${isSelectedReply ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-500 dark:text-slate-400'}`} style={{ minWidth: '64px' }}>
                      {syncConfig?.transcriptStartTime && syncConfig?.videoStartTime
                        ? secondsToTimestamp(getAdjustedVideoTime(reply.timestamp))
                        : reply.timestamp
                      }
                    </span>
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
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default ChatLog;