export function getSearchShortcutLabel() {
  if (typeof navigator === 'undefined') {
    return 'Ctrl+K';
  }

  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl+K';
}

export function useSearchShortcutLabel() {
  return getSearchShortcutLabel();
}

export function isSearchHotkey(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k';
}
