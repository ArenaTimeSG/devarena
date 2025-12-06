import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users } from 'lucide-react';

interface ThemePreviewProps {
  theme: 'light' | 'dark' | 'custom' | 'auto';
  isActive?: boolean;
  onClick?: () => void;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({ 
  theme, 
  isActive = false, 
  onClick 
}) => {
  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return {
          background: 'bg-white',
          border: 'border-gray-200',
          text: 'text-gray-900',
          accent: 'bg-blue-500',
          muted: 'bg-gray-100',
          card: 'bg-white border-gray-200'
        };
      case 'dark':
        return {
          background: 'bg-gray-900',
          border: 'border-gray-700',
          text: 'text-gray-100',
          accent: 'bg-blue-400',
          muted: 'bg-gray-800',
          card: 'bg-gray-800 border-gray-700'
        };
      case 'custom':
        return {
          background: 'bg-gradient-to-br from-purple-50 to-blue-50',
          border: 'border-purple-200',
          text: 'text-purple-900',
          accent: 'bg-gradient-to-r from-purple-500 to-blue-500',
          muted: 'bg-purple-100',
          card: 'bg-white/80 border-purple-200 backdrop-blur-sm'
        };
      case 'auto':
        return {
          background: 'bg-gradient-to-br from-gray-50 to-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-800',
          accent: 'bg-gray-600',
          muted: 'bg-gray-200',
          card: 'bg-white border-gray-300'
        };
      default:
        return {
          background: 'bg-white',
          border: 'border-gray-200',
          text: 'text-gray-900',
          accent: 'bg-blue-500',
          muted: 'bg-gray-100',
          card: 'bg-white border-gray-200'
        };
    }
  };

  const styles = getThemeStyles();

  return (
    <div
      className={`
        relative p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-105
        ${isActive 
          ? 'ring-2 ring-primary ring-offset-2 shadow-lg' 
          : 'hover:shadow-md'
        }
        ${styles.background}
        ${styles.border}
        border-2
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${styles.accent}`} />
          <span className={`text-sm font-medium ${styles.text}`}>
            {theme === 'light' && 'Claro'}
            {theme === 'dark' && 'Escuro'}
            {theme === 'custom' && 'Personalizado'}
            {theme === 'auto' && 'Automático'}
          </span>
        </div>
        {isActive && (
          <Badge variant="secondary" className="text-xs">
            Ativo
          </Badge>
        )}
      </div>

      {/* Preview Content */}
      <div className="space-y-3">
        {/* Navigation Bar */}
        <div className={`flex items-center justify-between p-2 rounded-lg ${styles.muted}`}>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${styles.accent}`} />
            <div className={`w-8 h-2 rounded ${styles.accent}`} />
          </div>
          <div className="flex space-x-1">
            <div className={`w-3 h-3 rounded ${styles.accent}`} />
            <div className={`w-3 h-3 rounded ${styles.accent}`} />
            <div className={`w-3 h-3 rounded ${styles.accent}`} />
          </div>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className={`p-2 rounded-lg ${styles.card}`}>
            <div className="flex items-center space-x-2">
              <Calendar className={`w-3 h-3 ${styles.text}`} />
              <div className={`w-4 h-2 rounded ${styles.accent}`} />
            </div>
            <div className={`w-6 h-1 rounded mt-1 ${styles.muted}`} />
          </div>
          
          <div className={`p-2 rounded-lg ${styles.card}`}>
            <div className="flex items-center space-x-2">
              <Users className={`w-3 h-3 ${styles.text}`} />
              <div className={`w-4 h-2 rounded ${styles.accent}`} />
            </div>
            <div className={`w-6 h-1 rounded mt-1 ${styles.muted}`} />
          </div>
        </div>

        {/* Calendar Preview */}
        <div className={`p-2 rounded-lg ${styles.card}`}>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded text-xs flex items-center justify-center ${
                  i === 3 ? styles.accent : styles.muted
                }`}
              />
            ))}
          </div>
        </div>

        {/* Button Preview */}
        <div className="flex space-x-2">
          <div className={`w-8 h-2 rounded ${styles.accent}`} />
          <div className={`w-6 h-2 rounded ${styles.muted}`} />
        </div>
      </div>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
          <div className="w-2 h-2 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
};
