import React from "react";

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

    // Add the link component
    parts.push(
      <a
        key={`link-${matchIndex}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-purple-600 hover:text-purple-800 underline decoration-1 underline-offset-2 transition-colors"
      >
        {linkText}
      </a>
    );

    lastIndex = matchIndex + fullMatch.length;
  }

  // Add remaining text after the last link
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};
