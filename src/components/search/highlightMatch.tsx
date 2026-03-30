export function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text;

  const queryWords = query.trim().split(/\s+/).filter((w) => w.length > 0);
  if (queryWords.length === 0) return text;

  const pattern = queryWords
    .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');

  const parts = text.split(new RegExp(`(${pattern})`, 'gi'));

  return (
    <>
      {parts.map((part, i) => {
        const isMatch = queryWords.some((word) => part.toLowerCase() === word.toLowerCase());
        return isMatch ? (
          <mark
            key={i}
            className="bg-yellow-200 dark:bg-yellow-500/80 text-slate-800 dark:text-slate-900 font-medium"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}
