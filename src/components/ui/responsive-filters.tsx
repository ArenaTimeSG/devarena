import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';

interface FilterOption {
  value: string;
  label: string;
}

interface ResponsiveFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    label: string;
    value: string;
    options: FilterOption[];
    onValueChange: (value: string) => void;
  }[];
  actions?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: 'default' | 'outline';
  }[];
  className?: string;
}

const ResponsiveFilters: React.FC<ResponsiveFiltersProps> = ({
  searchTerm,
  onSearchChange,
  filters,
  actions = [],
  className
}) => {
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isMobile) {
    return (
      <div className={cn("w-full", className)}>
        {/* Mobile: Filtros colapsáveis */}
        <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Header com busca e toggle */}
          <div className="p-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="pl-10 border-slate-200 focus:border-blue-300"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="border-slate-200 hover:bg-slate-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 ml-2 transition-transform",
                    isExpanded && "rotate-180"
                  )} 
                />
              </Button>
            </div>
          </div>

          {/* Filtros expandidos */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="border-t border-slate-200"
              >
                <div className="p-4 space-y-4">
                  {/* Filtros */}
                  {filters.map((filter, index) => (
                    <div key={index} className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        {filter.label}
                      </label>
                      <Select 
                        value={filter.value} 
                        onValueChange={filter.onValueChange}
                      >
                        <SelectTrigger className="border-slate-200 focus:border-blue-300">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filter.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}

                  {/* Ações */}
                  {actions.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Ações</label>
                      <div className="space-y-2">
                        {actions.map((action, index) => (
                          <Button
                            key={index}
                            variant={action.variant || 'default'}
                            className="w-full justify-start"
                            onClick={action.onClick}
                          >
                            {action.icon}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Desktop: Filtros em grid */}
      <div className="bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Busca */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 border-slate-200 focus:border-blue-300"
              />
            </div>
          </div>

          {/* Filtros */}
          {filters.map((filter, index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {filter.label}
              </label>
              <Select 
                value={filter.value} 
                onValueChange={filter.onValueChange}
              >
                <SelectTrigger className="border-slate-200 focus:border-blue-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}

          {/* Ações */}
          {actions.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Ações</label>
              <div className="space-y-2">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || 'default'}
                    className="w-full justify-start"
                    onClick={action.onClick}
                  >
                    {action.icon}
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResponsiveFilters;
