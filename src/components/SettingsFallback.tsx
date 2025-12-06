import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface SettingsFallbackProps {
  error?: Error | null;
  onRetry?: () => void;
  isLoading?: boolean;
}

const SettingsFallback = ({ error, onRetry, isLoading }: SettingsFallbackProps) => {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner 
          size="lg"
          text="Carregando configurações..."
          description="Isso pode levar alguns segundos"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 max-w-md mx-auto p-6">
          <div className="mx-auto text-red-600">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <div className="text-lg font-medium">Erro ao carregar configurações</div>
          <div className="text-sm text-muted-foreground">
            {error.message || 'Ocorreu um erro inesperado ao carregar suas configurações'}
          </div>
          {onRetry && (
            <Button onClick={onRetry} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="text-lg">Nenhuma configuração encontrada</div>
        <div className="text-sm text-muted-foreground">
          Suas configurações serão criadas automaticamente
        </div>
      </div>
    </div>
  );
};

export default SettingsFallback;
