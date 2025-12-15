import React, { useState } from 'react';
import { parseLocalDate, parseShortDate } from './forkDateCalculator';

export interface EditableDateCellProps {
  fork: string;
  phaseId: string;
  itemName: string;
  calculatedDate: string;
  isCompleted: boolean;
  isEditable: boolean;
  lockedDates: Record<string, string>;
  onLock: (fork: string, phaseId: string, itemName: string, date: string) => void;
  onUnlock: (fork: string, phaseId: string, itemName: string) => void;
  gapText?: string;
  gapIsNegative?: boolean;
  gapIsWarning?: boolean;
  isSourceLocked?: boolean;
}

const EditableDateCell: React.FC<EditableDateCellProps> = ({
  fork,
  phaseId,
  itemName,
  calculatedDate,
  isCompleted,
  isEditable,
  lockedDates,
  onLock,
  onUnlock,
  gapText,
  gapIsNegative,
  gapIsWarning,
  isSourceLocked,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  const dateKey = `${fork}:${phaseId}:${itemName}`;
  const isLocked = dateKey in lockedDates;
  const displayDate = lockedDates[dateKey] ?? calculatedDate;

  // Check if date is overdue (past today and not completed)
  const isOverdue = !isCompleted && displayDate && (() => {
    const parsed = parseShortDate(displayDate);
    if (!parsed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed < today;
  })();

  // Convert "MMM DD, YYYY" to "YYYY-MM-DD" for input
  const toInputFormat = (dateStr: string): string => {
    const parsed = parseShortDate(dateStr);
    if (!parsed) return '';
    return parsed.toISOString().split('T')[0];
  };

  // Convert "YYYY-MM-DD" to "MMM DD, YYYY" for display
  const toDisplayFormat = (isoDate: string): string => {
    const date = parseLocalDate(isoDate);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleStartEdit = () => {
    if (!isEditable || isCompleted) return;
    setEditValue(toInputFormat(displayDate));
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editValue) {
      onLock(fork, phaseId, itemName, toDisplayFormat(editValue));
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) {
      onUnlock(fork, phaseId, itemName);
    } else {
      onLock(fork, phaseId, itemName, displayDate);
    }
  };

  // Fixed widths for consistent alignment across all cells
  // Date: "Dec 31, 2026" = ~12 chars, w-23 (92px)
  // Gap: "+30d" or "(+30d)" = ~6 chars, w-11 (44px)
  // Icon: single emoji, w-5 (20px)
  const dateWidth = 'w-23';
  const gapWidth = 'w-11';
  const iconWidth = 'w-5';

  // Not editable (Fusaka or N/A)
  if (!isEditable) {
    if (!calculatedDate) {
      return <span className="text-slate-400 dark:text-slate-500 text-sm italic">N/A</span>;
    }
    return (
      <div className="flex items-center gap-1">
        {isCompleted && (
          <div className="inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
            ✓
          </div>
        )}
        <div className={`text-slate-700 dark:text-slate-300 text-sm ${dateWidth}`}>
          {displayDate}
        </div>
        <span className={`text-xs ${gapWidth} text-right ${gapIsNegative ? 'text-red-600 dark:text-red-400 font-semibold' : gapIsWarning ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
          {gapText || ''}
        </span>
        <span className={iconWidth}></span>
      </div>
    );
  }

  // Completed milestone (not editable)
  if (isCompleted) {
    return (
      <div className="flex items-center gap-1">
        <div className="inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
          ✓
        </div>
        <div className={`text-slate-700 dark:text-slate-300 text-sm ${dateWidth}`}>
          {displayDate}
        </div>
        <span className={`text-xs ${gapWidth} text-right ${gapIsNegative ? 'text-red-600 dark:text-red-400 font-semibold' : gapIsWarning ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
          {gapText || ''}
        </span>
        <span className={iconWidth}></span>
      </div>
    );
  }

  // Source-locked date (from upgrade meta, not user-editable)
  if (isSourceLocked) {
    return (
      <div className="flex items-center gap-1 group">
        <div className={`inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
          {isOverdue ? '!' : '○'}
        </div>
        <div className={`text-sm ${dateWidth} ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}>
          {displayDate}
        </div>
        <span className={`text-xs ${gapWidth} text-right ${gapIsNegative ? 'text-red-600 dark:text-red-400 font-semibold' : gapIsWarning ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
          {gapText || ''}
        </span>
        <span className={`${iconWidth} text-xs text-purple-500 text-center`} title="Date from meta thread">
          🔒
        </span>
      </div>
    );
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <div className="w-4"></div>
        <input
          type="date"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          autoFocus
          className={`px-1 py-0.5 text-sm border border-purple-400 dark:border-purple-500 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500 ${dateWidth}`}
        />
        <span className={gapWidth}></span>
        <span className={iconWidth}></span>
      </div>
    );
  }

  // Display mode (editable)
  return (
    <div className="flex items-center gap-1 group">
      <div className={`inline-flex items-center justify-center w-4 py-0.5 rounded text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
        {isOverdue ? '!' : '○'}
      </div>
      <div
        className={`text-sm ${dateWidth} cursor-pointer ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold hover:text-red-700 dark:hover:text-red-300' : 'text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400'}`}
        onClick={handleStartEdit}
        title={isOverdue ? 'Overdue - click to edit' : 'Click to edit'}
      >
        {displayDate}
      </div>
      <span className={`text-xs ${gapWidth} text-right ${gapIsNegative ? 'text-red-600 dark:text-red-400 font-semibold' : gapIsWarning ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
        {gapText || ''}
      </span>
      <button
        onClick={handleToggleLock}
        className={`${iconWidth} text-xs text-center transition-opacity ${isLocked ? 'text-amber-500' : 'opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        title={isLocked ? 'Unlock (recalculate from mainnet date)' : 'Lock this date'}
      >
        {isLocked ? '🔒' : '🔓'}
      </button>
    </div>
  );
};

export default EditableDateCell;
