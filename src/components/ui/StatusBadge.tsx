import React from "react";

interface StatusBadgeProps {
  status: string;
  type?: "inclusion-stage" | "upgrade-status" | "phase-status";
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = "inclusion-stage",
  className = "",
}) => {
  const getColorClasses = () => {
    switch (type) {
      case "inclusion-stage":
        switch (status) {
          case "Proposed for Inclusion":
            return "bg-slate-100 text-slate-700";
          case "Considered for Inclusion":
            return "bg-slate-200 text-slate-700";
          case "Scheduled for Inclusion":
            return "bg-yellow-50 text-yellow-700";
          case "Declined for Inclusion":
            return "bg-red-50 text-red-700";
          case "Included":
            return "bg-emerald-50 text-emerald-800";
          default:
            return "bg-slate-100 text-slate-600";
        }
      case "upgrade-status":
        switch (status) {
          case "Active":
            return "bg-emerald-100 text-emerald-800";
          case "Upcoming":
            return "bg-blue-100 text-blue-800";
          case "Planning":
            return "bg-purple-100 text-purple-800";
          case "Research":
            return "bg-orange-100 text-orange-800";
          default:
            return "bg-slate-200 text-slate-700";
        }
      case "phase-status":
        switch (status) {
          case "completed":
            return "bg-emerald-100 text-emerald-800 border-emerald-200";
          case "current":
            return "bg-purple-100 text-purple-800 border-purple-200";
          case "upcoming":
            return "bg-slate-100 text-slate-600 border-slate-200";
          default:
            return "bg-slate-100 text-slate-600 border-slate-200";
        }
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded ${getColorClasses()} ${className}`}
    >
      {status}
    </span>
  );
};
