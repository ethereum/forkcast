/* eslint-disable react-refresh/only-export-components -- link helpers + component intentionally share one module */
import React from 'react';
import { toHref } from '../navigation';

const LINK_CLASS =
  'text-blue-600 dark:text-blue-400 hover:underline';

/**
 * Plain-click handler for EIP links: open the page's drawer while leaving
 * modifier/middle-clicks to the anchor itself. `stopPropagation` keeps the
 * click from also firing the row's timestamp seek.
 */
export const handleEipLinkClick =
  (eipId: number, onOpenEip?: (eipId: number) => void) =>
  (event: React.MouseEvent): void => {
    if (!onOpenEip) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    onOpenEip(eipId);
  };

// Digits are an EIP reference when standalone, or preceded by a whole word
// "eip" glued, spaced, or dash-joined to the number (EIP7975, eip-7975,
// EIP 7975, any case) — the prefix is part of the link. Short runs (under
// 4 digits) are almost always counts, dates, or devnet numbers, so they
// stay plain.
const EIP_NUMBER_RE = /(?:(?<!\w)eip[ -]?|\b)(\d{4,})\b/gi;

export interface EipRef {
  id: number;
  /** Matched text, including any "eip" prefix; used as the link label. */
  label: string;
}

export type EipSegment = string | EipRef;

/**
 * Split text into segments: plain strings, plus one EipRef per digit run
 * the caller allows (the call's `eip_mentions.json` set). Other runs stay
 * in the text.
 */
export const splitEipNumbers = (text: string, allowedIds: Set<number>): EipSegment[] => {
  const segments: EipSegment[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = EIP_NUMBER_RE.exec(text)) !== null) {
    const id = Number(match[1]);
    if (!allowedIds.has(id)) continue;
    if (match.index > last) segments.push(text.slice(last, match.index));
    segments.push({ id, label: match[0] });
    last = match.index + match[0].length;
  }
  segments.push(text.slice(last));
  return segments;
};

const URL_RE = /(https?:\/\/[^\s]+)/g;

/**
 * Inline text with URLs and allowed EIP numbers rendered as links.
 * URLs open in a new tab; EIP links optionally open the call page drawer.
 */
export const TextWithLinks: React.FC<{
  text: string;
  allowedIds: Set<number>;
  onOpenEip?: (eipId: number) => void;
}> = ({ text, allowedIds, onOpenEip }) => (
  <>
    {text.split(URL_RE).map((part, index) =>
      // A part re-matches URL_RE only if it is one of the URLs split()
      // captured, not the plain text between them.
      part.match(URL_RE) ? (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {part}
        </a>
      ) : (
        <React.Fragment key={index}>
          {splitEipNumbers(part, allowedIds).map((segment, j) =>
            typeof segment === 'string' ? (
              <React.Fragment key={j}>{segment}</React.Fragment>
            ) : (
              <a
                key={j}
                href={toHref(`/eips/${segment.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleEipLinkClick(segment.id, onOpenEip)}
                className={LINK_CLASS}
              >
                {segment.label}
              </a>
            ),
          )}
        </React.Fragment>
      ),
    )}
  </>
);
