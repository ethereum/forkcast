import React, { useState } from "react";

interface TranscriptProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

interface VTTEntry {
  timestamp: string;
  speaker: string;
  text: string;
}

const Transcript: React.FC<TranscriptProps> = ({
  isOpen,
  onClose,
  content,
}) => {
  const [vttTranscript] = useState<string>(content);

  const parseVTTTranscript = (text: string): VTTEntry[] => {
    const lines = text.split("\n");
    const entries: VTTEntry[] = [];
    let currentEntry: Partial<VTTEntry> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip WEBVTT header and empty lines
      if (line === "WEBVTT" || line === "" || /^\d+$/.test(line)) {
        continue;
      }

      // Parse timestamp line
      if (line.includes("-->")) {
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
          currentEntry.speaker = "Unknown";
          currentEntry.text = line;
        }

        if (
          currentEntry.timestamp &&
          currentEntry.speaker &&
          currentEntry.text
        ) {
          entries.push(currentEntry as VTTEntry);
          currentEntry = {};
        }
      }
    }

    return entries;
  };

  const formatTimestamp = (timestamp: string): string => {
    // Convert "00:04:05.754" to "00:04:05"
    return timestamp.split(".")[0];
  };

  const renderVTTTranscript = () => {
    const entries = parseVTTTranscript(vttTranscript);
    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {entries.map((entry, index) => (
          <div key={index} className="flex gap-2 text-sm">
            <span className="text-slate-500 text-xs w-16 flex-shrink-0">
              {formatTimestamp(entry.timestamp)}
            </span>
            <span className="font-medium text-slate-700 min-w-0">
              {entry.speaker}:
            </span>
            <span className="text-slate-600 flex-1">{entry.text}</span>
          </div>
        ))}
      </div>
    );
  };

  const hasVTT = !!vttTranscript;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            Meeting Transcript
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden p-6">
          {hasVTT ? (
            <div>
              <div className="mb-4">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Transcript
                </span>
              </div>
              {renderVTTTranscript()}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">
              Transcript not available for this meeting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transcript;
