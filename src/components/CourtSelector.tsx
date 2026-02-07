import { useState, useEffect, memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCourts } from '@/hooks/useCourts';
import { useSelectedCourt } from '@/hooks/useSelectedCourt';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2 } from 'lucide-react';
import { logger } from '@/utils/logger';

type CourtSelectorProps = {
  className?: string;
  showLabel?: boolean;
};

export const CourtSelector = memo(function CourtSelector({ className, showLabel = true }: CourtSelectorProps) {
  const { courts, isLoading } = useCourts();
  const { selectedCourtId, setSelectedCourtId } = useSelectedCourt();
  const [localCourtId, setLocalCourtId] = useState<string>(selectedCourtId || '');
  const navigate = useNavigate();
  const location = useLocation();

  // Sincronizar com o estado global
  useEffect(() => {
    setLocalCourtId(selectedCourtId || '');
  }, [selectedCourtId]);

  const handleChange = (value: string) => {
    const newCourtId = value || null;
    
    if (newCourtId === selectedCourtId) {
      return;
    }

    logger.log('🔄 CourtSelector - Mudando de', selectedCourtId, 'para', newCourtId);
    
    // Atualizar estado local imediatamente para feedback visual
    setLocalCourtId(value);
    
    // Salvar no localStorage e atualizar estado
    setSelectedCourtId(newCourtId);

    // Lista de rotas que não devem redirecionar (rotas públicas)
    const publicRoutes = ['/auth', '/agendar', '/booking', '/cliente', '/payment'];
    const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
    
    // Se não for rota pública, navegar para dashboard e recarregar
    if (!isPublicRoute) {
      if (location.pathname !== '/dashboard') {
        // Se não estiver no dashboard, navegar primeiro
        logger.log('🚀 CourtSelector - Navegando para /dashboard');
        navigate('/dashboard');
        // Aguardar navegação e então recarregar
        setTimeout(() => {
          logger.log('🔄 CourtSelector - Recarregando página para atualizar dados');
          window.location.reload();
        }, 100);
      } else {
        // Se já estiver no dashboard, recarregar diretamente
        logger.log('🔄 CourtSelector - Recarregando página para atualizar dados');
        window.location.reload();
      }
    }
  };

  if (isLoading) {
    return (
      <div className={className}>
        {showLabel && <label className="text-sm font-medium mb-2 block">Quadra</label>}
        <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
      </div>
    );
  }

  if (!courts || courts.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {showLabel && (
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Quadra
        </label>
      )}
      <Select 
        value={localCourtId} 
        onValueChange={handleChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma quadra" />
        </SelectTrigger>
        <SelectContent>
          {courts.map((court) => {
            // Filtrar descrições que contenham "criada automaticamente" ou "padrão criada automaticamente"
            const shouldShowDescription = court.description && 
              !court.description.toLowerCase().includes('criada automaticamente') &&
              !court.description.toLowerCase().includes('padrão criada automaticamente');
            
            return (
              <SelectItem key={court.id} value={court.id}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${court.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {court.name}
                  {shouldShowDescription && (
                    <span className="text-xs text-muted-foreground ml-2">({court.description})</span>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
});
