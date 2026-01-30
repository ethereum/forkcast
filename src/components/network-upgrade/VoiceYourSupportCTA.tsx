import React from 'react';
import { Link } from 'react-router-dom';

interface VoiceYourSupportCTAProps {
  forkName: string;
}

/**
 * Call-to-action banner encouraging users to create and share their EIP tier list rankings.
 * Currently unused - preserved for future use when community input is needed again.
 */
export const VoiceYourSupportCTA: React.FC<VoiceYourSupportCTAProps> = ({ forkName }) => {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-700 rounded">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <svg className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <div>
            <h4 className="font-medium text-purple-900 dark:text-purple-100 text-sm mb-1">Voice Your Support</h4>
            <p className="text-purple-800 dark:text-purple-200 text-xs leading-relaxed">
              PFI submissions are closed. Create and share your {forkName} EIP tier list to voice your preferences and join the community discussion.
            </p>
          </div>
        </div>
        <Link
          to="/rank"
          className="flex-shrink-0 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center gap-2"
        >
          Create Your Ranking
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
};
