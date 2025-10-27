import React, { useState } from "react";
import { Tooltip } from "./Tooltip";

interface CopyLinkButtonProps {
  sectionId: string;
  title: string;
  size?: "sm" | "md";
}

export const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({
  sectionId,
  title,
  size = "md",
}) => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyLinkToClipboard = (sectionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${sectionId}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopiedSection(sectionId);
        // Clear the copied state after 2 seconds
        setTimeout(() => {
          setCopiedSection(null);
        }, 2000);
      })
      .catch(() => {
        // Fallback for browsers that don't support clipboard API
        console.log("Failed to copy link");
      });
  };

  const isCopied = copiedSection === sectionId;
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";

  return (
    <div className="relative">
      <Tooltip text={isCopied ? "Copied!" : title}>
        <button
          onClick={() => copyLinkToClipboard(sectionId)}
          className={`transition-colors cursor-pointer ${
            isCopied
              ? "text-emerald-600"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          {isCopied ? (
            <svg
              className={iconSize}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className={iconSize}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              />
            </svg>
          )}
        </button>
      </Tooltip>
    </div>
  );
};
