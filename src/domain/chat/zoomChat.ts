export interface ChatMessage {
  timestamp: string;
  speaker: string;
  message: string;
}

export interface ChatReaction {
  speaker: string;
  emoji: string;
}

export interface ParsedChatTranscript {
  messages: ChatMessage[];
  reactions: Map<string, ChatReaction[]>;
}

const CANONICAL_REPLY_PREFIX = 'Replying to';

const ZOOM_REPLY_PREFIXES = [
  CANONICAL_REPLY_PREFIX,
  'Antwoord verzenden naar',
  'Répondre à',
] as const;

const ZOOM_REACTION_SYNTAXES = [
  { prefix: 'Reacted to', separator: 'with' },
  { prefix: 'Heeft gereageerd op', separator: 'met' },
  { prefix: 'A réagi à', separator: 'avec' },
] as const;

const CURLY_QUOTE_PATTERN = /[“”]/g;
const QUOTE = '["“”]';

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeQuotes = (value: string): string =>
  value.replace(CURLY_QUOTE_PATTERN, '"');

const normalizeReplyMessage = (message: string): string => {
  for (const prefix of ZOOM_REPLY_PREFIXES) {
    if (message.startsWith(prefix)) {
      return message.replace(prefix, CANONICAL_REPLY_PREFIX);
    }
  }

  return message;
};

const normalizeReplyHeaderLine = (line: string): string | null => {
  for (const prefix of ZOOM_REPLY_PREFIXES) {
    const marker = `:\t${prefix}`;
    if (line.includes(marker)) {
      return line.replace(marker, `:\t${CANONICAL_REPLY_PREFIX}`);
    }
  }

  return null;
};

const normalizeZoomExportLine = (line: string): string => {
  const match = line.match(/^(\d{2}:\d{2}:\d{2})\t\s*From\s+(.+?)\s:\s?([\s\S]*)$/);
  if (!match) return line;

  const [, timestamp, speaker, message] = match;
  return `${timestamp}\t${speaker.trim()}:\t${message}`;
};

export const isReplyMessage = (message: string): boolean =>
  message.startsWith(CANONICAL_REPLY_PREFIX);

export const getReplyQuotedText = (message: string): string | null => {
  const match = message.match(/^Replying to "(.+?)"(?:\s|$)/);
  return match?.[1] ?? null;
};

export const getReplyBody = (message: string): string | null => {
  const match = message.match(/^Replying to "(.+?)"\s*→\s*(.+)$/);
  return match?.[2] ?? null;
};

const parseReactionMessage = (
  message: string,
): { targetMessage: string; emoji: string } | null => {
  for (const syntax of ZOOM_REACTION_SYNTAXES) {
    const prefix = escapeRegExp(syntax.prefix);
    const separator = escapeRegExp(syntax.separator);
    const patterns = [
      new RegExp(`^${prefix} ${QUOTE}(.+?)${QUOTE} ${separator} ${QUOTE}(.+?)${QUOTE}$`, 's'),
      new RegExp(`^${prefix} ${QUOTE}(.+?)${QUOTE} ${separator} (.+)$`, 's'),
      new RegExp(`^${prefix} (.+?) ${separator} ${QUOTE}(.+?)${QUOTE}$`, 's'),
      new RegExp(`^${prefix} (.+?) ${separator} (.+)$`, 's'),
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return {
          targetMessage: normalizeQuotes(match[1]).replace(/\n/g, ' ').trim(),
          emoji: normalizeQuotes(match[2]).replace(/"/g, '').trim(),
        };
      }
    }
  }

  return null;
};

const resolveReactionTarget = (
  targetMessage: string,
  messages: ChatMessage[],
): string => {
  if (targetMessage.endsWith('...')) {
    const searchText = targetMessage.slice(0, -3).trim();
    const parentMessage = messages.find(m =>
      m.message.replace(/\n/g, ' ').startsWith(searchText),
    );
    return parentMessage?.message ?? targetMessage;
  }

  const parentMessage = messages.find(m =>
    m.message.replace(/\n/g, ' ').trim() === targetMessage,
  );
  return parentMessage?.message ?? targetMessage;
};

export const parseChatTranscript = (text: string): ParsedChatTranscript => {
  const rawLines = text.split('\n');
  const processedLines: string[] = [];

  for (const line of rawLines) {
    const normalizedLine = normalizeZoomExportLine(line);

    if (/^\d{2}:\d{2}:\d{2}\t/.test(normalizedLine)) {
      processedLines.push(normalizedLine);
    } else if (line.trim()) {
      let targetIndex = processedLines.length - 1;
      while (targetIndex >= 0 && !processedLines[targetIndex].trim()) {
        targetIndex--;
      }

      if (targetIndex >= 0) {
        const lastNonEmptyLine = processedLines[targetIndex];
        const normalizedReplyHeaderLine = normalizeReplyHeaderLine(lastNonEmptyLine);

        if (normalizedReplyHeaderLine) {
          processedLines[targetIndex] = `${normalizedReplyHeaderLine.trimEnd()} → ${line.trim()}`;
        } else {
          processedLines[targetIndex] = `${processedLines[targetIndex].trimEnd()}\n${line.trim()}`;
        }
      } else {
        processedLines.push(line);
      }
    } else {
      processedLines.push(line);
    }
  }

  const lines = processedLines.filter(line => line.trim());
  const messages: ChatMessage[] = [];
  const reactions = new Map<string, ChatReaction[]>();
  let lastMessageForReaction: ChatMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimEnd();
    const match = line.match(/^(\d{2}:\d{2}:\d{2})\t(.+?):\t([\s\S]*)$/);
    if (!match) continue;

    const timestamp = match[1];
    const speaker = match[2].trim();
    const message = normalizeReplyMessage(match[3].trim());

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

    const reaction = parseReactionMessage(message);
    if (reaction) {
      const targetMessage = resolveReactionTarget(reaction.targetMessage, messages);

      if (!reactions.has(targetMessage)) {
        reactions.set(targetMessage, []);
      }
      reactions.get(targetMessage)!.push({ speaker, emoji: reaction.emoji });
      continue;
    }

    if (isReplyMessage(message) && i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      if (!nextLine.match(/^\d{2}:\d{2}:\d{2}\t/)) {
        const actualMessage = nextLine.trim();
        if (actualMessage) {
          messages.push({
            timestamp,
            speaker,
            message: `${message} → ${actualMessage}`,
          });
          i++;
          continue;
        }
      }
    }

    if (message) {
      const chatMessage = {
        timestamp,
        speaker,
        message,
      };
      messages.push(chatMessage);
      lastMessageForReaction = chatMessage;
    }
  }

  return { messages, reactions };
};
