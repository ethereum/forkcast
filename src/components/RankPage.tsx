import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EIP } from "../types/eip";
import {
  isHeadliner,
  getLaymanTitle,
  getProposalPrefix,
  getHeadlinerLayer,
} from "../utils/eip";
import { useAnalytics } from "../hooks/useAnalytics";
import eipsData from "../data/eips.json";
import ThemeToggle from "./ui/ThemeToggle";

interface TierItem {
  id: string;
  eip: EIP;
  tier: string | null;
}

interface Tier {
  id: string;
  name: string;
  color: string;
  bandColor: string;
  rowBgColor: string;
}

const TIERS: Tier[] = [
  {
    id: "S",
    name: "S",
    color: "text-slate-900",
    bandColor: "bg-[#f87171]",
    rowBgColor: "bg-red-100",
  },
  {
    id: "A",
    name: "A",
    color: "text-slate-900",
    bandColor: "bg-amber-300",
    rowBgColor: "bg-amber-100",
  },
  {
    id: "B",
    name: "B",
    color: "text-slate-900",
    bandColor: "bg-yellow-200",
    rowBgColor: "bg-yellow-50",
  },
  {
    id: "C",
    name: "C",
    color: "text-slate-900",
    bandColor: "bg-green-300",
    rowBgColor: "bg-green-100",
  },
  {
    id: "D",
    name: "D",
    color: "text-slate-900",
    bandColor: "bg-sky-300",
    rowBgColor: "bg-sky-100",
  },
];

const RankPage: React.FC = () => {
  const navigate = useNavigate();
  const { trackLinkClick, trackEvent } = useAnalytics();
  const [items, setItems] = useState<TierItem[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedMobileItem, setSelectedMobileItem] = useState<string | null>(
    null
  );
  const isTouchDevice =
    typeof window !== "undefined" &&
    ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  // Initialize with Glamsterdam headliner EIPs
  useEffect(() => {
    const glamsterdamHeadliners = eipsData
      .filter((eip) => eip.forkRelationships.some((fork) => fork.forkName.toLowerCase() === "glamsterdam" && fork.status === "Proposed"))
      .filter((eip) => !isHeadliner(eip, "glamsterdam"))
      .map((eip) => ({
        id: `eip-${eip.id}`,
        eip,
        tier: null,
      }));
    setItems(glamsterdamHeadliners);
  }, []);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    setIsDragging(true);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const [dragOverTier, setDragOverTier] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent, tierId: string) => {
    e.preventDefault();
    if (draggedItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === draggedItem ? { ...item, tier: tierId } : item
        )
      );
    }
    setDragOverTier(null);
    setDraggedItem(null);
    setIsDragging(false);
  };

  // Mobile tap-to-assign handlers
  const handleMobileItemClick = (itemId: string) => {
    if (isTouchDevice) {
      if (selectedMobileItem === itemId) {
        // Deselect if tapping the same item
        setSelectedMobileItem(null);
      } else {
        // Select the new item
        setSelectedMobileItem(itemId);
      }
    }
  };

  const handleTierClick = (tierId: string) => {
    if (isTouchDevice && selectedMobileItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === selectedMobileItem ? { ...item, tier: tierId } : item
        )
      );
      setSelectedMobileItem(null);
    }
  };

  const handleRemoveFromTier = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, tier: null } : item))
    );
  };

  const getItemsInTier = (tierId: string) => {
    return items.filter((item) => item.tier === tierId);
  };

  const getUnassignedItems = () => {
    return items.filter((item) => item.tier === null);
  };

  const handleSave = () => {
    // Generate and download the tier image
    generateTierImage();
  };

  const generateTierImage = () => {
    const rankedItems = items.filter((item) => item.tier !== null);
    if (rankedItems.length === 0) {
      alert("Please rank at least one proposal before generating an image.");
      return;
    }

    const scale = 2;

    // Track the image download event
    trackEvent("Tier Maker Download Image", {
      rankedCount: rankedItems.length,
    });

    // Canvas dimensions
    const canvasWidth = 540 * scale;
    const cardHeight = 36 * scale;
    const cardGap = 6 * scale;
    const canvasHeight =
      60 * scale +
      TIERS.reduce((acc, tier) => {
        const count = getItemsInTier(tier.id).length;
        return acc + Math.max(1, count) * (cardHeight + cardGap);
      }, 0);

    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // App theme background
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bandWidth = 50 * scale;
    // Tier band and row background color config
    const bandColors: { [key: string]: string } = {
      S: "#f87171", // red-350ish
      A: "#fbbf24", // amber-300
      B: "#fde68a", // yellow-200
      C: "#7af2a8", // green-300
      D: "#73d4ff", // sky-300
    };
    const rowColors: { [key: string]: string } = {
      S: "#fee2e2", // red-100
      A: "#fef9c3", // yellow-100
      B: "#fefce8", // yellow-50
      C: "#d1fae5", // green-100
      D: "#e0f2fe", // sky-100
    };
    const blockPadX = 4 * scale;
    const blockRadius = 12 * scale;
    const leftPad = bandWidth + 8 * scale;
    const cardWidth = canvasWidth - leftPad - 4 * scale;

    // Draw tiers and cards
    let y = 6 * scale;
    TIERS.forEach((tier) => {
      const itemsInTier = getItemsInTier(tier.id);
      const tierHeight =
        Math.max(1, itemsInTier.length) * (cardHeight + cardGap);
      // Draw background block for the tier
      ctx.save();
      ctx.beginPath();
      ctx.rect(blockPadX, y, canvasWidth - blockPadX, tierHeight);
      ctx.closePath();
      ctx.fillStyle = rowColors[tier.id] || "#f1f5f9";
      ctx.fill();
      ctx.restore();

      // Draw vertical band
      ctx.fillStyle = bandColors[tier.id] || "#e5e7eb";
      ctx.fillRect(0, y, bandWidth, tierHeight);

      // Draw tier letter centered in band
      ctx.save();
      ctx.fillStyle = "#18181b";
      ctx.font = `${
        24 * scale
      }px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(tier.id, bandWidth / 2, y + tierHeight / 2);
      ctx.restore();

      // Draw EIP cards
      if (itemsInTier.length > 0) {
        itemsInTier.forEach((item, idx) => {
          drawCard(
            ctx,
            leftPad,
            y + idx * (cardHeight + cardGap) + cardGap / 2,
            cardWidth,
            cardHeight,
            blockRadius,
            item.eip,
            scale
          );
        });
      }
      y += tierHeight;
    });

    // Add footer: two lines
    const footerY1 = canvas.height - 36 * scale;
    const footerY2 = canvas.height - 18 * scale;
    ctx.save();

    const today = new Date();
    const dateStamp = today.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    // Line 1: very light
    ctx.font = `${
      13 * scale
    }px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textBaseline = "middle";

    // Title in the center with date
    const titleText = "Glamsterdam EIP Rankings";
    const titleFont = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const dateFont = `${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    ctx.font = titleFont;
    const titleWidth = ctx.measureText(titleText).width;
    ctx.font = dateFont;
    const dateWidth = ctx.measureText(` • ${dateStamp}`).width;
    const titleTotalWidth = titleWidth + dateWidth;

    let titleStartX = canvas.width / 2 - titleTotalWidth / 2;

    // Draw title
    ctx.font = titleFont;
    ctx.textAlign = "left";
    ctx.fillStyle = "#f1f5f9"; // very light
    ctx.fillText(titleText, titleStartX, footerY1);

    // Draw date
    ctx.font = dateFont;
    ctx.fillStyle = "#f1f5f9";
    ctx.fillText(` • ${dateStamp}`, titleStartX + titleWidth, footerY1);

    // Line 2: 'Make your own at forkcast.org/rank'
    const prefix = "Make your own at ";
    const logo = "forkcast";
    const suffix = ".org/rank";
    ctx.font = `${
      13 * scale
    }px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const prefixWidth = ctx.measureText(prefix).width;
    const logoWidth = ctx.measureText(logo).width;
    const suffixWidth = ctx.measureText(suffix).width;
    const totalWidth = prefixWidth + logoWidth + suffixWidth;
    let startX = canvas.width / 2 - totalWidth / 2;
    // Draw prefix
    ctx.fillStyle = "#94a3b8"; // darker gray
    ctx.textAlign = "left";
    ctx.fillText(prefix, startX, footerY2);
    // Draw logo
    ctx.fillStyle = "#94a3b8"; // same gray
    ctx.fillText(logo, startX + prefixWidth, footerY2);
    // Draw suffix
    ctx.fillStyle = "#94a3b8"; // same gray
    ctx.fillText(suffix, startX + prefixWidth + logoWidth, footerY2);
    ctx.restore();

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "glamsterdam-eip-rankings.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    });
  };

  // Helper to draw a card (EIP or empty)
  function drawCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    eip: EIP | null,
    scale: number
  ) {
    // Card background
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgba(0,0,0,0.10)";
    ctx.shadowBlur = 3 * scale;
    ctx.shadowOffsetY = 1 * scale;
    ctx.fill();
    ctx.restore();
    // Card border
    ctx.save();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    if (!eip) return;
    // Vertically center content
    const centerY = y + h / 2;
    // Compact padding
    const padLeft = 8 * scale;
    let cursorX = x + padLeft;
    // EIP number
    ctx.save();
    ctx.font = `bold ${
      13 * scale
    }px "SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace`;
    ctx.fillStyle = "#64748b";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(`EIP-${eip.id}`, cursorX, centerY);
    cursorX += ctx.measureText(`EIP-${eip.id}`).width + 6 * scale;
    ctx.restore();
    // Layer badge
    const layer = getHeadlinerLayer(eip, "glamsterdam");
    if (layer) {
      ctx.save();
      ctx.font = `bold ${
        11 * scale
      }px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      // Badge background
      const badgeW = 28 * scale;
      const badgeH = 18 * scale;
      if (layer === "EL") {
        ctx.fillStyle = "#e0e7ff"; // bg-indigo-100
        ctx.fillRect(cursorX, centerY - badgeH / 2, badgeW, badgeH);
        ctx.fillStyle = "#4338ca"; // text-indigo-700
      } else {
        ctx.fillStyle = "#ccfbf1"; // bg-teal-100
        ctx.fillRect(cursorX, centerY - badgeH / 2, badgeW, badgeH);
        ctx.fillStyle = "#0f766e"; // text-teal-700
      }
      // Center text in badge
      const textWidth = ctx.measureText(layer).width;
      ctx.fillText(layer, cursorX + (badgeW - textWidth) / 2, centerY);
      ctx.restore();
      cursorX += badgeW + 8 * scale;
    } else {
      cursorX += 8 * scale;
    }
    // Title
    ctx.save();
    ctx.font = `bold ${
      15 * scale
    }px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = "#18181b";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    let title = getLaymanTitle(eip);
    const maxWidth = w - (cursorX - x) - 8 * scale;
    while (ctx.measureText(title).width > maxWidth) {
      title = title.slice(0, -1);
    }
    if (title.length < getLaymanTitle(eip).length)
      title = title.slice(0, -3) + "...";
    ctx.fillText(title, cursorX, centerY);
    ctx.restore();
  }

  const handleReset = () => {
    setItems((prev) => prev.map((item) => ({ ...item, tier: null })));
  };

  const handleExternalLinkClick = (linkType: string, url: string) => {
    trackLinkClick(linkType, url);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 dark:bg-slate-800 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center h-auto py-3 sm:flex-row sm:justify-center sm:items-center sm:h-16 sm:py-0 relative">
            <button
              onClick={() => navigate("/upgrade/glamsterdam")}
              className="mb-2 sm:mb-0 sm:absolute sm:left-0 sm:top-1/2 sm:-translate-y-1/2 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 transition-colors"
            >
              ← Back to Glamsterdam
            </button>
            <h1 className="font-semibold text-slate-900 dark:text-slate-100 text-center truncate max-w-full overflow-hidden text-base sm:text-xl">
              Glamsterdam EIP Tier Maker
            </h1>
            <div className="sm:absolute sm:right-0 sm:top-1/2 sm:-translate-y-1/2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Tiers */}
          <div>
            {/* Instructions */}
            <div className="mb-4 p-4 bg-white rounded-lg border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-2">
                What is this?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Users, node operators, app developers, core developers, and any other stakeholders
                are invited to voice their support for their preferred EIPs in the Glamsterdam fork.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Drag and drop (desktop) or tap-to-assign (mobile) the EIP proposals
                into tiers. S-tier represents your highest priority proposals,
                while D-tier represents your lowest priority. The list of proposals
                is long; rank as many or as few as you like.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Download the image to share your rankings and start a conversation.{" "}
                <a
                  href="https://forkcast.org/upgrade/glamsterdam"
                  className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
                >
                  Learn more about Glamsterdam
                </a>
                .
              </p>
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-100 p-3 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex-shrink-0 pt-0.5">
                  <svg
                    className="h-4 w-4 text-slate-500 dark:text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.852l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  The deadline for proposal submissions is October 30th, 2025.
                </p>
              </div>
            </div>
            <div className="rounded-lg bg-white shadow border border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex flex-col overflow-hidden p-0">
              {/* Meme-style header */}
              <div className="bg-slate-800 px-4 py-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Your Rankings</h3>
                <span className="text-sm font-mono text-slate-400">
                  forkcast.org/rank
                </span>
              </div>
              {/* Tier rows, flush, no spacing */}
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`flex items-stretch w-full overflow-hidden transition-shadow duration-150
                  ${
                    isDragging
                      ? "ring-2 ring-purple-200 ring-inset cursor-grabbing"
                      : "cursor-pointer"
                  }
                  ${
                    isTouchDevice && selectedMobileItem
                      ? "ring-2 ring-purple-400 ring-inset"
                      : ""
                  }
                `}
                  style={{ minHeight: 48 }}
                  onDragOver={handleDragOver}
                  onDragEnter={() => setDragOverTier(tier.id)}
                  onDragLeave={(e) => {
                    // Only clear if leaving the tier row, not just moving over a child
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverTier(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, tier.id)}
                  onClick={() => handleTierClick(tier.id)}
                >
                  {/* Tier band - fixed width */}
                  <div
                    className={`flex items-center justify-center w-12 flex-shrink-0 ${tier.bandColor}`}
                  >
                    <span className={`text-2xl ${tier.color}`}>
                      {tier.name}
                    </span>
                  </div>
                  {/* Items column with horizontal scroll */}
                  <div
                    className={`flex-1 flex items-center px-0 border-l border-slate-200 dark:border-slate-600 overflow-hidden ${
                      dragOverTier === tier.id
                        ? "bg-[repeating-linear-gradient(45deg,#f3f4f6_0_8px,transparent_8px_16px)] dark:bg-[repeating-linear-gradient(45deg,#374151_0_8px,transparent_8px_16px)]"
                        : tier.rowBgColor
                    }`}
                  >
                    <div className="w-full flex flex-col gap-1 p-1 overflow-x-auto">
                      {getItemsInTier(tier.id).length === 0 ? (
                        <div className="h-5 flex items-center justify-center">
                          {isTouchDevice && selectedMobileItem && (
                            <span className="text-xs text-purple-600 font-medium">
                              Tap to assign here
                            </span>
                          )}
                        </div>
                      ) : (
                        getItemsInTier(tier.id).map((item) => (
                          <div
                            key={item.id}
                            draggable={!isTouchDevice}
                            onDragStart={
                              !isTouchDevice
                                ? (e) => handleDragStart(e, item.id)
                                : undefined
                            }
                            onDragEnd={!isTouchDevice ? handleDragEnd : undefined}
                            className="flex items-center justify-between p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded shadow-sm min-w-max"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex-shrink-0">
                                {getProposalPrefix(item.eip)}-{item.eip.id}
                              </span>
                              {getHeadlinerLayer(item.eip, "glamsterdam") && (
                                <span
                                  className={`px-1 py-0.5 text-xs font-medium rounded flex-shrink-0 ${
                                    getHeadlinerLayer(
                                      item.eip,
                                      "glamsterdam"
                                    ) === "EL"
                                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                                      : "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300"
                                  }`}
                                >
                                  {getHeadlinerLayer(item.eip, "glamsterdam")}
                                </span>
                              )}
                              <span className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                                {getLaymanTitle(item.eip)}
                              </span>
                            </div>
                            <button
                              onClick={() => handleRemoveFromTier(item.id)}
                              className="ml-1 p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
                            >
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {/* Footer */}
              <div className="bg-slate-800 px-4 py-3">
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors rounded"
                  >
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                  >
                    Download Image
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Unassigned Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                EIPs Proposed for Inclusion (PFI)
              </h3>
              {items.filter((item) => item.tier !== null).length > 0 && (
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                  Ready to generate image
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              {getUnassignedItems().map((item) => (
                <div
                  key={item.id}
                  draggable={!isTouchDevice}
                  onDragStart={
                    !isTouchDevice
                      ? (e) => handleDragStart(e, item.id)
                      : undefined
                  }
                  onDragEnd={!isTouchDevice ? handleDragEnd : undefined}
                  onTouchStart={
                    isTouchDevice
                      ? () => setSelectedMobileItem(item.id)
                      : undefined
                  }
                  onTouchEnd={
                    isTouchDevice
                      ? () => {
                          setItems((prev) =>
                            prev.map((item) =>
                              item.id === selectedMobileItem
                                ? { ...item, tier: dragOverTier || null }
                                : item
                            )
                          );
                          setSelectedMobileItem(null);
                        }
                      : undefined
                  }
                  onClick={
                    isTouchDevice
                      ? () => handleMobileItemClick(item.id)
                      : undefined
                  }
                  className={`p-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg cursor-move hover:shadow-md transition-all touch-manipulation ${
                    draggedItem === item.id ? "opacity-50" : ""
                  } ${
                    selectedMobileItem === item.id
                      ? "ring-2 ring-purple-400 bg-purple-50 dark:bg-purple-900/20"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {getProposalPrefix(item.eip)}-{item.eip.id}
                    </span>
                    {getHeadlinerLayer(item.eip, "glamsterdam") && (
                      <span
                        className={`px-1 py-0.5 text-xs font-medium rounded ${
                          getHeadlinerLayer(item.eip, "glamsterdam") === "EL"
                            ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                            : "bg-teal-100 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300"
                        }`}
                      >
                        {getHeadlinerLayer(item.eip, "glamsterdam")}
                      </span>
                    )}
                    <span className="font-medium text-xs text-slate-900 dark:text-slate-100 truncate">
                      {getLaymanTitle(item.eip)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Experiment Disclaimer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="text-center space-y-3">
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            This is an experimental tool for expressing preferences. Rankings
            are not stored or displayed by Forkcast and do not represent an
            official vote of any kind. To learn more about Ethereum governance
            visit{" "}
            <a
              target="_blank"
              href="https://ethereum.org/governance"
              className="text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 underline decoration-1 underline-offset-2"
            >
              ethereum.org
            </a>
            .
          </p>
          <div className="text-xs text-slate-400 dark:text-slate-500">
            <span className="italic">Have feedback? Contact </span>
            <a
              href="mailto:nixo@ethereum.org"
              onClick={() =>
                handleExternalLinkClick(
                  "email_contact",
                  "mailto:nixo@ethereum.org"
                )
              }
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-1 underline-offset-2"
            >
              nixo
            </a>
            <span className="italic"> or </span>
            <a
              href="https://x.com/wolovim"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                handleExternalLinkClick(
                  "twitter_contact",
                  "https://x.com/wolovim"
                )
              }
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 underline decoration-1 underline-offset-2"
            >
              @wolovim
            </a>
            <span className="italic">.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RankPage;
