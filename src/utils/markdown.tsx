import React from 'react';

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Parse markdown links and convert to React components
 * Converts [text](url) format to clickable links
 */
export const parseMarkdownLinks = (text: string): React.ReactNode[] => {
  if (!text) return [];

  // Regex to match markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    const [fullMatch, linkText, url] = match;
    const matchIndex = match.index;

    // Add text before the link
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }

    // Only render as link if URL scheme is safe
    if (isSafeUrl(url)) {
      parts.push(
        <a
          key={`link-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-1 underline-offset-2 transition-colors hover:opacity-70"
        >
          {linkText}
        </a>
      );
    } else {
      parts.push(linkText);
    }

    lastIndex = matchIndex + fullMatch.length;
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

/**
 * Parse **bold** markdown syntax into <strong> elements.
 * Processes each string node from a React node array, preserving non-string nodes.
 */
export const parseMarkdownBold = (
  nodes: React.ReactNode[],
): React.ReactNode[] => {
  const boldRegex = /\*\*(.+?)\*\*/g;
  const result: React.ReactNode[] = [];

  nodes.forEach((node, nodeIdx) => {
    if (typeof node !== 'string') {
      result.push(node);
      return;
    }

    let lastIndex = 0;
    let match;
    while ((match = boldRegex.exec(node)) !== null) {
      if (match.index > lastIndex) {
        result.push(node.slice(lastIndex, match.index));
      }
      result.push(
        <strong key={`bold-${nodeIdx}-${match.index}`}>{match[1]}</strong>,
      );
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < node.length) {
      result.push(node.slice(lastIndex));
    }
  });

  return result;
};