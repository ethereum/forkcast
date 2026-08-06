import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const Drawer: React.FC<DrawerProps> = ({ isOpen, onClose, title, children }) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  // Stay mounted after `isOpen` flips false so the panel can animate out.
  const [isMounted, setIsMounted] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setIsMounted(true);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    // Restore focus to whatever opened the drawer once it closes.
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;

      // Trap focus inside the panel.
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !panelRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isMounted) return null;

  // Unmount only once the exit animation finishes. Animation events bubble, so
  // ignore any originating from drawer content.
  const handleAnimationEnd = (e: React.AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (!isOpen) setIsMounted(false);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/40 dark:bg-black/60 ${
          isOpen ? 'animate-backdrop-in' : 'animate-backdrop-out'
        }`}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="EIP details"
        onAnimationEnd={handleAnimationEnd}
        className={`relative w-full max-w-[680px] bg-white dark:bg-slate-900 shadow-2xl dark:shadow-purple-900/20 border-l border-transparent dark:border-slate-700 flex flex-col overflow-hidden ${
          isOpen ? 'animate-slide-in-right' : 'animate-slide-out-right'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {title}
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
};
