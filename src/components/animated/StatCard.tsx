import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color: 'blue' | 'red' | 'green' | 'orange';
  description?: string;
  delay?: number;
}

const colorVariants = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-50 to-blue-100/60 dark:from-blue-900/30 dark:to-blue-800/20',
    border: 'border-blue-200/50 dark:border-blue-700/50',
    text: 'text-blue-700 dark:text-blue-300',
    value: 'text-blue-900 dark:text-blue-100',
    iconBg: 'bg-blue-500/10 dark:bg-blue-400/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    shadow: 'shadow-blue-100 dark:shadow-blue-900/50',
  },
  red: {
    bg: 'bg-gradient-to-br from-red-50 to-red-100/60 dark:from-red-900/30 dark:to-red-800/20',
    border: 'border-red-200/50 dark:border-red-700/50',
    text: 'text-red-700 dark:text-red-300',
    value: 'text-red-900 dark:text-red-100',
    iconBg: 'bg-red-500/10 dark:bg-red-400/20',
    iconColor: 'text-red-600 dark:text-red-400',
    shadow: 'shadow-red-100 dark:shadow-red-900/50',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/60 dark:from-emerald-900/30 dark:to-emerald-800/20',
    border: 'border-emerald-200/50 dark:border-emerald-700/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    value: 'text-emerald-900 dark:text-emerald-100',
    iconBg: 'bg-emerald-500/10 dark:bg-emerald-400/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    shadow: 'shadow-emerald-100 dark:shadow-emerald-900/50',
  },
  orange: {
    bg: 'bg-gradient-to-br from-orange-50 to-orange-100/60 dark:from-orange-900/30 dark:to-orange-800/20',
    border: 'border-orange-200/50 dark:border-orange-700/50',
    text: 'text-orange-700 dark:text-orange-300',
    value: 'text-orange-900 dark:text-orange-100',
    iconBg: 'bg-orange-500/10 dark:bg-orange-400/20',
    iconColor: 'text-orange-600 dark:text-orange-400',
    shadow: 'shadow-orange-100 dark:shadow-orange-900/50',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  description,
  delay = 0,
}) => {
  const colors = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ 
        scale: 1.02,
        y: -4,
      }}
      className="relative w-full"
    >
      <Card className={`
        ${colors.bg} ${colors.border} border 
        shadow-lg hover:shadow-xl transition-all duration-300 
        rounded-2xl overflow-hidden backdrop-blur-sm
        hover:shadow-${colors.shadow}
      `}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className={`text-sm font-semibold ${colors.text} tracking-wide uppercase`}>
                {title}
              </p>
              <motion.p 
                className={`text-2xl font-bold ${colors.value}`}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.1 }}
              >
                {value}
              </motion.p>
              {description && (
                <p className={`text-xs ${colors.text} opacity-80 font-medium`}>
                  {description}
                </p>
              )}
            </div>
            <motion.div 
              className={`p-3 ${colors.iconBg} rounded-xl`}
              whileHover={{ scale: 1.1, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <Icon className={`h-6 w-6 ${colors.iconColor}`} />
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
