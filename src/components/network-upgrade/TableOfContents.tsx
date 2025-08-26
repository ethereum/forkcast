import React from 'react';

interface TOCItem {
  id: string;
  label: string;
  type: 'section' | 'eip';
  count: number | null;
}

interface TableOfContentsProps {
  items: TOCItem[];
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({
  items,
  activeSection,
  onSectionClick
}) => {
  return (
    <div className="hidden lg:block w-64 flex-shrink-0">
      <div className="sticky top-6 overflow-y-auto max-h-[calc(100vh-3rem)]">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 uppercase tracking-wide">Contents</h3>
        <nav className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSectionClick(item.id)}
              className={`w-full text-left rounded transition-colors ${
                item.type === 'section'
                  ? `px-3 py-2 text-sm ${
                      activeSection === item.id
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 font-medium'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`
                  : `px-6 py-1.5 text-xs ${
                      activeSection === item.id
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/10 dark:text-purple-300 font-medium'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                    }`
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={item.type === 'eip' ? 'truncate' : ''}>{item.label}</span>
                {item.count && (
                  <span className="text-xs text-slate-400 dark:text-slate-500 flex-shrink-0 ml-2">{item.count}</span>
                )}
              </div>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
};