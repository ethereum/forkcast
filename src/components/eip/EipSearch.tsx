import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { eipsData } from '../../data/eips';
import { getLaymanTitle, getProposalPrefix } from '../../utils';

export const EipSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const results = query.trim()
    ? eipsData
        .filter((eip) => {
          const searchLower = query.toLowerCase();
          const idMatch = eip.id.toString().includes(query);
          const titleMatch = getLaymanTitle(eip).toLowerCase().includes(searchLower);
          const descMatch = eip.description?.toLowerCase().includes(searchLower);
          return idMatch || titleMatch || descMatch;
        })
        .slice(0, 8)
    : [];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      navigate(`/eips/${results[selectedIndex].id}`);
      setQuery('');
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results.length]);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-lg px-3 py-2">
        <svg
          className="w-4 h-4 text-slate-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search EIPs..."
          className="bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none w-32 sm:w-40"
        />
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-64">
          {results.map((eip, index) => (
            <button
              key={eip.id}
              onClick={() => {
                navigate(`/eips/${eip.id}`);
                setQuery('');
                setIsOpen(false);
              }}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full text-left px-3 py-2 flex items-start gap-2 ${
                index === selectedIndex
                  ? 'bg-slate-100 dark:bg-slate-700'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <span className="text-xs font-mono text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                {getProposalPrefix(eip)}-{eip.id}
              </span>
              <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">
                {getLaymanTitle(eip)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {isOpen && query.trim() && results.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 z-50 min-w-64">
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            No EIPs found
          </p>
        </div>
      )}
    </div>
  );
};
