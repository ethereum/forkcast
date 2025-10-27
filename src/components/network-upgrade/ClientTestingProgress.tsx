import React from "react";
import { PokebalResponse } from "../../types/pokebal";
import { Tooltip } from "../ui";

interface ClientTestingProgressProps {
  data: PokebalResponse;
}

export const ClientTestingProgress: React.FC<ClientTestingProgressProps> = ({
  data,
}) => {
  // Sort clients alphabetically by name
  const sortedClients = [...data.clients].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  const CircularProgress = ({
    percentage,
    client,
    result,
  }: {
    percentage: number;
    client: string;
    result: any;
  }) => {
    const size = 64;
    const strokeWidth = 6;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const getGradientId = () => {
      if (percentage === 100) return "emerald-gradient";
      if (percentage > 0) return "blue-gradient";
      return "slate-gradient";
    };

    return (
      <Tooltip
        text={
          result && result.passed !== undefined && result.total !== undefined
            ? `${result.passed} of ${result.total} tests passing`
            : `Test data unavailable`
        }
      >
        <div className="flex flex-col items-center gap-1 cursor-help">
          <svg width={size} height={size} className="transform -rotate-90">
            <defs>
              {/* Green gradient (100%) */}
              <linearGradient
                id="emerald-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
              {/* Blue gradient (1-99%) */}
              <linearGradient
                id="blue-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              {/* Gray gradient (0%) */}
              <linearGradient
                id="slate-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
            </defs>
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-slate-200 dark:text-slate-600"
            />
            {/* Progress circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={`url(#${getGradientId()})`}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {/* Center text */}
            <text
              x={size / 2}
              y={size / 2 + 5}
              textAnchor="middle"
              className="text-xs font-semibold fill-slate-700 dark:fill-slate-300"
              transform={`rotate(90, ${size / 2}, ${size / 2})`}
            >
              {percentage.toFixed(0)}%
            </text>
          </svg>
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {client}
          </span>
        </div>
      </Tooltip>
    );
  };

  return (
    <div className="mt-4 border-t border-slate-200 dark:border-slate-600 pt-4">
      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 uppercase tracking-wide">
        Client Implementation Progress
      </h4>

      <div className="bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 justify-between px-4">
          {sortedClients.map((client, index) => {
            const result = client.result;
            const passed = result?.passed ?? 0;
            const total = result?.total ?? 0;

            // Calculate percentage
            const percentage =
              result?.percentage ?? (total > 0 ? (passed / total) * 100 : 0);

            return (
              <CircularProgress
                key={client.name || index}
                percentage={percentage}
                client={client.name}
                result={result}
              />
            );
          })}
        </div>

        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 flex items-center justify-between">
          {data.lastUpdated && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last updated: {new Date(data.lastUpdated).toLocaleDateString()}
            </p>
          )}
          <a
            href="https://pokebal.raxhvl.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors ml-auto"
          >
            View on Pokebal
            <svg
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
};
