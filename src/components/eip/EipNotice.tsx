import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ForkRelationship } from '../../types';
import { parseMarkdownLinks } from '../../utils';

type EipNoticeData = NonNullable<ForkRelationship['notice']>;

interface EipNoticeProps {
  notice: EipNoticeData;
  className?: string;
  title?: ReactNode;
}

const NOTICE_CLASSES = {
  container: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-700/40',
  icon: 'text-amber-600 dark:text-amber-300',
  title: 'text-amber-900 dark:text-amber-100',
  text: 'text-amber-800 dark:text-amber-200',
  link: 'text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100',
};

function formatCallReference(call: string, timestamp?: number): { display: string; link: string } {
  const [prefix, number] = call.split('/');
  const paddedNumber = number.padStart(3, '0');
  const baseLink = `/calls/${prefix}/${paddedNumber}`;
  return {
    display: `${prefix.toUpperCase()} #${number}`,
    link: timestamp ? `${baseLink}#t=${timestamp}` : baseLink,
  };
}

export const EipNotice: React.FC<EipNoticeProps> = ({ notice, className = '', title }) => {
  const callReference = notice.call ? formatCallReference(notice.call, notice.timestamp) : null;

  return (
    <div className={`rounded border p-4 ${NOTICE_CLASSES.container} ${className}`}>
      <div className="flex items-start gap-3">
        <svg
          className={`mt-0.5 h-5 w-5 flex-shrink-0 ${NOTICE_CLASSES.icon}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
          />
        </svg>
        <div className="min-w-0">
          <p className={`text-xs font-medium leading-relaxed ${NOTICE_CLASSES.title}`}>{title ?? notice.title}</p>
          <p className={`mt-1 text-xs leading-relaxed ${NOTICE_CLASSES.text}`}>
            {parseMarkdownLinks(notice.text)}
          </p>
          {callReference && (
            <Link
              to={callReference.link}
              className={`mt-2 inline-flex items-center gap-1 text-xs font-medium underline decoration-1 underline-offset-2 transition-colors ${NOTICE_CLASSES.link}`}
            >
              Source: {callReference.display}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
