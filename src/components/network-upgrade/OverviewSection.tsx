import React from "react";
import { EIP } from "../../types";
import { getInclusionStage } from "../../utils";
import { CopyLinkButton } from "../ui/CopyLinkButton";

interface OverviewSectionProps {
  eips: EIP[];
  forkName: string;
  onStageClick: (stageId: string) => void;
}

export const OverviewSection: React.FC<OverviewSectionProps> = ({
  eips,
  forkName,
  onStageClick,
}) => {
  const stageStats = [
    {
      stage: "Proposed for Inclusion",
      count: eips.filter((eip) => {
        return getInclusionStage(eip, forkName) === "Proposed for Inclusion";
      }).length,
      color: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
    },
    {
      stage: "Considered for Inclusion",
      count: eips.filter(
        (eip) => getInclusionStage(eip, forkName) === "Considered for Inclusion"
      ).length,
      color:
        "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
    },
    {
      stage: "Scheduled for Inclusion",
      count: eips.filter(
        (eip) => getInclusionStage(eip, forkName) === "Scheduled for Inclusion"
      ).length,
      color:
        "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300",
    },
    // {
    //   stage: 'Included',
    //   count: eips.filter(eip => getInclusionStage(eip, forkName) === 'Included').length,
    //   color: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300'
    // },
    {
      stage: "Declined for Inclusion",
      count: eips.filter(
        (eip) => getInclusionStage(eip, forkName) === "Declined for Inclusion"
      ).length,
      color: "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300",
    },
  ];

  return (
    <div
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-6"
      id="overview"
      data-section
    >
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          Upgrade Overview
        </h2>
        <div className="flex items-center relative top-0.5">
          <CopyLinkButton
            sectionId="overview"
            title="Copy link to overview"
            size="sm"
          />
        </div>
      </div>

      {/* Special note for Glamsterdam's competitive headliner process */}
      {forkName.toLowerCase() === "glamsterdam" && (
        <>
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-emerald-900 dark:text-emerald-100 text-sm mb-1">
                  Headliner Selection Complete
                </h4>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
                  The Glamsterdam headliner selection process has concluded.{" "}
                  <strong>
                    <button
                      onClick={() => onStageClick("eip-7732")}
                      className="bg-transparent border-none p-0 m-0 font-inherit text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-1 underline-offset-2 transition-colors cursor-pointer"
                    >
                      EIP-7732 (ePBS)
                    </button>
                  </strong>{" "}
                  and{" "}
                  <strong>
                    <button
                      onClick={() => onStageClick("eip-7928")}
                      className="bg-transparent border-none p-0 m-0 font-inherit text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-1 underline-offset-2 transition-colors cursor-pointer"
                    >
                      EIP-7928 (Block-level Access Lists)
                    </button>
                  </strong>{" "}
                  moved to <strong>Scheduled </strong> status.{" "}
                  <strong>
                    <button
                      onClick={() => onStageClick("eip-7805")}
                      className="bg-transparent border-none p-0 m-0 font-inherit text-emerald-900 dark:text-emerald-100 hover:text-emerald-700 dark:hover:text-emerald-300 underline decoration-1 underline-offset-2 transition-colors cursor-pointer"
                    >
                      EIP-7805 (FOCIL)
                    </button>
                  </strong>{" "}
                  has also moved to <strong>Considered</strong> status.
                  Non-headliner EIPs can now be proposed.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {forkName.toLowerCase() === "pectra" && (
        <>
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-emerald-900 dark:text-emerald-100 text-sm mb-1">
                  Pectra is activated!
                </h4>
                <p className="text-emerald-800 dark:text-emerald-200 text-xs leading-relaxed">
                  The Pectra upgrade went live mainnet on May 7 2025, at epoch
                  364032. EIPs listed below are now active on Ethereum.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Special note for Fusaka testnet rollout */}
      {forkName.toLowerCase() === "fusaka" && (
        <>
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-amber-900 dark:text-amber-100 text-sm mb-1">
                  Important: Blob Transaction Format Change
                </h4>
                <p className="text-amber-800 dark:text-amber-200 text-xs leading-relaxed">
                  <strong>EIP-7594 (PeerDAS)</strong> changes the proof format
                  from blob proofs to cell proofs. Blob transaction originators
                  (L2s, etc.) must update their software to create{" "}
                  <strong>Cell Proofs</strong> instead of blob proofs. This
                  change may break applications that send blob transactions.{" "}
                  <a
                    href="https://blog.ethereum.org/2025/10/15/fusaka-blob-update"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-900 dark:text-amber-100 hover:text-amber-700 dark:hover:text-amber-300 underline decoration-1 underline-offset-2 transition-colors font-medium"
                  >
                    Read the full details and migration guide
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>

          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-1">
                  Testnet Rollout Announced
                </h4>
                <p className="text-blue-800 dark:text-blue-200 text-xs leading-relaxed">
                  Fusaka testnet deployments begin October 1st with Holešky,
                  followed by Sepolia (Oct 14) and Hoodi (Oct 28).{" "}
                  <a
                    href="https://blog.ethereum.org/2025/09/26/fusaka-testnet-announcement"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-900 dark:text-blue-100 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-1 underline-offset-2 transition-colors font-medium"
                  >
                    Read the full announcement
                  </a>{" "}
                  for technical details and client release information.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stageStats.map(({ stage, count, color }) => {
          const stageId = stage.toLowerCase().replace(/\s+/g, "-");
          const hasEips = count > 0;

          return (
            <button
              key={stage}
              onClick={() => hasEips && onStageClick(stageId)}
              disabled={!hasEips}
              className={`text-center p-4 rounded transition-all duration-200 ${
                hasEips
                  ? "bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 hover:shadow-sm cursor-pointer"
                  : "bg-slate-50 dark:bg-slate-700 opacity-50 cursor-not-allowed"
              }`}
            >
              <div className="text-2xl font-light text-slate-900 dark:text-slate-100 mb-1">
                {count}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                EIP{count !== 1 ? "s" : ""}
              </div>
              <div
                className={`text-xs font-medium px-2 py-1 rounded inline-block ${color}`}
              >
                {stage}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
