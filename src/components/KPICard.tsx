import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  bgColor?: string;
  borderColor?: string;
  id?: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  bgColor = "bg-[#1A2636]",
  borderColor = "border-[#2D3748]",
  id
}) => {
  return (
    <div 
      className={`rounded-xl p-4 border border-y border-r ${borderColor} border-l-4 ${bgColor} shadow-lg relative overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
      style={{ borderLeftColor: iconColor }}
      id={id}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xs text-[#94A3B8] font-semibold uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold font-mono text-[#F1F5F9] tracking-tight">{value}</h3>
          {subtitle && (
            <p className="text-[11px] text-[#94A3B8] mt-2 flex items-center gap-1">
              {subtitle}
            </p>
          )}
        </div>
        <div className="p-2 rounded-lg text-opacity-100" style={{ backgroundColor: `${iconColor}15` }}>
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
};
