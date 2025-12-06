import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
  description?: string;
}

const LoadingSpinner = ({ 
  size = 'md', 
  className,
  text = 'Carregando...',
  description 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={cn("flex flex-col items-center justify-center space-y-4", className)}>
      <div className={cn(
        "animate-spin border-4 border-primary border-t-transparent rounded-full",
        sizeClasses[size]
      )} />
      {text && (
        <div className="text-center space-y-2">
          <div className="text-lg font-medium">{text}</div>
          {description && (
            <div className="text-sm text-muted-foreground">{description}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;


