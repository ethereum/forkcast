export type SearchResultType = 'transcript' | 'chat' | 'agenda' | 'action';

export function getSearchTypeIcon(type: SearchResultType): string {
  switch (type) {
    case 'transcript': return '📝';
    case 'chat': return '💬';
    case 'agenda': return '📋';
    case 'action': return '✅';
    default: return '📄';
  }
}

export function getSearchTypeColor(type: SearchResultType): string {
  switch (type) {
    case 'transcript': return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50';
    case 'chat': return 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50';
    case 'agenda': return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50';
    case 'action': return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50';
    default: return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/50';
  }
}

export function getSearchShortcutLabel() {
  if (typeof navigator === 'undefined') {
    return 'Ctrl+K';
  }

  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl+K';
}


export function isSearchHotkey(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}
