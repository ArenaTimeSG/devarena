import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface TabItem {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface ResponsiveTabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const ResponsiveTabs: React.FC<ResponsiveTabsProps> = ({
  items,
  value,
  onValueChange,
  className
}) => {
  const isMobile = useIsMobile();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Em mobile, se houver muitas abas ou espaço insuficiente, usar dropdown
  const shouldUseDropdown = isMobile && items.length > 3;

  const activeTab = items.find(item => item.value === value);

  if (shouldUseDropdown) {
    return (
      <div className={cn("w-full", className)}>
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-full bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg h-12 hover:border-blue-300 transition-colors">
            <SelectValue>
              <div className="flex items-center gap-2">
                {activeTab?.icon}
                <span className="font-medium text-slate-800">{activeTab?.label}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl">
            {items.map((item) => (
              <SelectItem 
                key={item.value} 
                value={item.value}
                className="flex items-center gap-2 py-3 cursor-pointer hover:bg-slate-50 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-700"
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop/Tablet: Abas horizontais com rolagem */}
      <div className="hidden md:block">
        <div className="flex w-full bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl p-1 shadow-lg overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide min-w-full">
            {items.map((item) => (
              <motion.button
                key={item.value}
                onClick={() => onValueChange(item.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 min-w-fit relative",
                  "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  value === item.value
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-800"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {item.icon}
                {item.label}
                {/* Indicador de aba ativa */}
                {value === item.value && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                    layoutId="activeTab"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: Abas com rolagem horizontal */}
      <div className="md:hidden">
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl p-1 shadow-lg overflow-hidden">
          <div className="flex overflow-x-auto scrollbar-hide gap-1">
            {items.map((item) => (
              <motion.button
                key={item.value}
                onClick={() => onValueChange(item.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm whitespace-nowrap transition-all duration-200 min-w-fit relative",
                  "hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  "touch-manipulation", // Melhora performance touch
                  value === item.value
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md"
                    : "text-slate-600 hover:text-slate-800"
                )}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ 
                  minWidth: 'max-content',
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingTop: '0.75rem',
                  paddingBottom: '0.75rem'
                }}
              >
                {item.icon}
                {item.label}
                {/* Indicador de aba ativa para mobile */}
                {value === item.value && (
                  <motion.div
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"
                    layoutId="activeTabMobile"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponsiveTabs;
