import React from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  children,
  className = "",
}) => {
  return (
    <div className={`bg-white rounded-2xl border border-[#E2E0D8] shadow-[0_2px_12px_-3px_rgba(31,42,36,0.06)] p-6 transition-all duration-200 hover:border-[#D5D2C8] ${className}`}>
      {(title || action) && (
        <div className="flex justify-between items-start mb-4 gap-4">
          <div>
            {title && <h3 className="text-base font-bold text-[#1F2A24] tracking-tight">{title}</h3>}
            {subtitle && <p className="text-xs text-[#6B7570] mt-0.5">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
