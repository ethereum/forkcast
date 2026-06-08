import { describe, expect, it } from 'vitest';

import {
  getReplyBody,
  getReplyQuotedText,
  isReplyMessage,
  parseChatTranscript,
} from './zoomChat';

describe('parseChatTranscript', () => {
  it('normalizes localized Zoom reply headers to one reply shape', () => {
    const { messages } = parseChatTranscript([
      '00:01:00\tAlice:\tTo address the PQ topic',
      '00:02:00\tRenaud-ZKNOX:\tRépondre à "To address the PQ topic"',
      'I agree with that framing',
    ].join('\n'));

    expect(messages).toEqual([
      {
        timestamp: '00:01:00',
        speaker: 'Alice',
        message: 'To address the PQ topic',
      },
      {
        timestamp: '00:02:00',
        speaker: 'Renaud-ZKNOX',
        message: 'Replying to "To address the PQ topic" → I agree with that framing',
      },
    ]);
    expect(isReplyMessage(messages[1].message)).toBe(true);
    expect(getReplyQuotedText(messages[1].message)).toBe('To address the PQ topic');
    expect(getReplyBody(messages[1].message)).toBe('I agree with that framing');
  });

  it('collects localized Zoom reactions instead of rendering them as messages', () => {
    const { messages, reactions } = parseChatTranscript([
      '00:01:00\tAlice:\tYes, a full EOA solves that',
      '00:02:00\tRenaud-ZKNOX:\tA réagi à "Yes, a full EOA so..." avec 👍',
    ].join('\n'));

    expect(messages).toEqual([
      {
        timestamp: '00:01:00',
        speaker: 'Alice',
        message: 'Yes, a full EOA solves that',
      },
    ]);
    expect(reactions.get('Yes, a full EOA solves that')).toEqual([
      { speaker: 'Renaud-ZKNOX', emoji: '👍' },
    ]);
  });

  it('keeps existing English and Dutch Zoom system message handling', () => {
    const { messages, reactions } = parseChatTranscript([
      '00:01:00\tAlice:\tTarget message',
      '00:02:00\tBob:\tReacted to "Target message" with ❤️',
      '00:03:00\tChris:\tHeeft gereageerd op "Target message" met 👍',
      '00:04:00\tDana:\tAntwoord verzenden naar "Target message"',
      'Reply body',
    ].join('\n'));

    expect(messages).toEqual([
      {
        timestamp: '00:01:00',
        speaker: 'Alice',
        message: 'Target message',
      },
      {
        timestamp: '00:04:00',
        speaker: 'Dana',
        message: 'Replying to "Target message" → Reply body',
      },
    ]);
    expect(reactions.get('Target message')).toEqual([
      { speaker: 'Bob', emoji: '❤️' },
      { speaker: 'Chris', emoji: '👍' },
    ]);
  });

  it('accepts raw Zoom chat export lines with From speaker markers', () => {
    const { messages, reactions } = parseChatTranscript([
      '10:46:15\t From terence : Is it by root or by roots?',
      '10:46:45\t From terence : Replying to "Is it by root or by ..."',
      '',
      'By root would be very slow',
      '10:49:47\t From Justin Traglia : Reacted to "isn\'t that what Manu..." with 🤷',
    ].join('\n'));

    expect(messages).toEqual([
      {
        timestamp: '10:46:15',
        speaker: 'terence',
        message: 'Is it by root or by roots?',
      },
      {
        timestamp: '10:46:45',
        speaker: 'terence',
        message: 'Replying to "Is it by root or by ..." → By root would be very slow',
      },
    ]);
    expect(reactions.get("isn't that what Manu...")).toEqual([
      { speaker: 'Justin Traglia', emoji: '🤷' },
    ]);
  });
});
