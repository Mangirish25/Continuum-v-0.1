import React from 'react';
import { RiskLevel } from '../../types';

interface RiskBadgeProps {
  level: RiskLevel;
  label?: string;
  className?: string;
  showDot?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({
  level,
  label,
  className = '',
  showDot = true,
}) => {
  const getStyles = () => {
    switch (level) {
      case 'critical':
        return {
          container: 'bg-[#FEF2F2] border-[#FCA5A5] text-[#DC2626]',
          dot: 'bg-[#DC2626]',
          defaultLabel: 'Critical Risk',
        };
      case 'high':
        return {
          container: 'bg-[#FFF7ED] border-[#FDBA74] text-[#EA580C]',
          dot: 'bg-[#EA580C]',
          defaultLabel: 'High Risk',
        };
      case 'medium':
        return {
          container: 'bg-[#FFFBEB] border-[#FCD34D] text-[#D97706]',
          dot: 'bg-[#D97706]',
          defaultLabel: 'Medium Risk',
        };
      case 'low':
      default:
        return {
          container: 'bg-[#ECFDF5] border-[#6EE7B7] text-[#059669]',
          dot: 'bg-[#059669]',
          defaultLabel: 'Low Risk',
        };
    }
  };

  const style = getStyles();

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono tracking-wide rounded border ${style.container} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
      <span className="tabular-nums">{label || style.defaultLabel}</span>
    </span>
  );
};
