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
/**
 * Check whether a string contains a markdown table (header + separator + rows).
 */
export const containsMarkdownTable = (text: string): boolean =>
  /\|.+\|\s*[\r\n]+\|[-| :]+\|/.test(text);

/**
 * Parse a string that may contain a markdown table into React nodes.
 * Text before/after the table is returned as plain strings; the table itself
 * becomes a <table> element.
 */
export const parseMarkdownTable = (
  text: string,
): React.ReactNode[] => {
  // Split into lines and locate the table region (header, separator, body rows).
  const lines = text.split('\n');
  let tableStart = -1;
  let tableEnd = -1;

  for (let i = 0; i < lines.length - 1; i++) {
    // A separator row looks like |---|---|...| (with optional colons for alignment)
    if (/^\|[-| :]+\|$/.test(lines[i].trim()) && tableStart === -1) {
      // The header is the line before the separator
      tableStart = i - 1;
    }
    if (tableStart !== -1 && /^\|.+\|$/.test(lines[i].trim())) {
      tableEnd = i;
    }
  }
  // Check the last line too
  if (tableStart !== -1 && /^\|.+\|$/.test(lines[lines.length - 1].trim())) {
    tableEnd = lines.length - 1;
  }

  if (tableStart < 0 || tableEnd < 0) return [text];

  const result: React.ReactNode[] = [];

  // Text before the table
  const before = lines.slice(0, tableStart).join('\n').trim();
  if (before) result.push(before);

  // Parse table rows
  const parseRow = (line: string) =>
    line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

  const headers = parseRow(lines[tableStart]);
  // separator is at tableStart + 1, body rows start at tableStart + 2
  const bodyLines = lines.slice(tableStart + 2, tableEnd + 1).filter((l) => /^\|.+\|$/.test(l.trim()));

  result.push(
    <table key="md-table" className="w-full text-xs mt-2 border-collapse">
      <thead>
        <tr>
          {headers.map((h, i) => (
            <th key={i} className="text-left px-2 py-1 border-b border-blue-200 dark:border-blue-700 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {bodyLines.map((line, ri) => (
          <tr key={ri}>
            {parseRow(line).map((cell, ci) => (
              <td key={ci} className="px-2 py-1 border-b border-blue-100 dark:border-blue-800 font-mono">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>,
  );

  // Text after the table
  const after = lines.slice(tableEnd + 1).join('\n').trim();
  if (after) result.push(after);

  return result;
};

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