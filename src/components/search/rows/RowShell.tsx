import type { ReactNode } from 'react';
import { SearchKeycap } from '../SearchUi';

interface RowShellProps {
  href: string;
  index: number;
  active: boolean;
  /** Ignored while the user is driving with the keyboard. */
  onHover: (index: number) => void;
  onSelect: (href: string) => void;
  children: ReactNode;
}

/**
 * A real anchor so middle-click and "copy link" work, with navigation routed
 * through `useNavigate` on plain clicks (the modal's `onSelect`).
 */
export default function RowShell({ href, index, active, onHover, onSelect, children }: RowShellProps) {
  return (
    <a
      id={`global-search-row-${index}`}
      data-row-index={index}
      role="option"
      aria-selected={active}
      href={href}
      onMouseMove={() => onHover(index)}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        onSelect(href);
      }}
      className={`block w-full px-3 py-3 text-left transition-colors touch-manipulation sm:px-4 ${
        active ? 'bg-slate-50 dark:bg-slate-700/30' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">{children}</div>
        <div className="hidden w-8 flex-shrink-0 items-center justify-center sm:flex">
          {active && <SearchKeycap>↵</SearchKeycap>}
        </div>
      </div>
    </a>
  );
}
