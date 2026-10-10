import React, { useId, useLayoutEffect, useRef } from 'react';

interface ModalProps {
  onClose: () => void;
  /** Classes for the full-viewport layer that positions the backdrop and panel. */
  className?: string;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  children: React.ReactNode;
}

// Strip the UA <dialog> box so it acts as a transparent full-viewport layer.
const DIALOG_RESET =
  'm-0 h-full w-full max-h-none max-w-none border-0 bg-transparent p-0 text-inherit overflow-visible backdrop:bg-transparent';

/**
 * Native modal `<dialog>`: `showModal()` traps focus, closes on Escape and makes
 * the page behind it inert. Callers draw their own backdrop and panel inside.
 * Render it only while open; focus returns to the opener on unmount.
 */
export const Modal: React.FC<ModalProps> = ({ onClose, className = '', children, ...aria }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      dialog.close();
      previouslyFocused?.focus?.();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={`${DIALOG_RESET} ${className}`}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // The browser can still force-close (e.g. a repeated Escape); keep state in sync.
      onClose={() => {
        if (!dialogRef.current?.open) onClose();
      }}
      {...aria}
    >
      {children}
    </dialog>
  );
};

interface SheetModalProps {
  title: string;
  onClose: () => void;
  /** Sits left of the close button, e.g. a reset action. */
  headerAction?: React.ReactNode;
  footer: React.ReactNode;
  /** Panel width from md up. */
  maxWidthClassName?: string;
  children: React.ReactNode;
}

/** Bottom sheet on mobile, centered dialog from md up. Body scrolls; header and footer don't. */
export const SheetModal: React.FC<SheetModalProps> = ({
  title,
  onClose,
  headerAction,
  footer,
  maxWidthClassName = 'md:max-w-2xl',
  children,
}) => {
  const titleId = useId();

  return (
    <Modal onClose={onClose} aria-labelledby={titleId} className="fixed inset-0 z-50 animate-fadeIn">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      {/* From md up this layer covers the backdrop, so it takes outside clicks too. */}
      <div
        className="md:absolute md:inset-0 md:flex md:items-center md:justify-center absolute bottom-0 left-0 right-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className={`bg-white dark:bg-slate-800 md:rounded-2xl rounded-t-2xl ${maxWidthClassName} md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-fade-scale md:shadow-2xl`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h2 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {title}
            </h2>
            <div className="flex items-center gap-3">
              {headerAction}
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6">{children}</div>

          <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            {footer}
          </div>
        </div>
      </div>
    </Modal>
  );
};
