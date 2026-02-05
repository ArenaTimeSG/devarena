import { useState, useEffect } from 'react';
import { useCourts } from '@/hooks/useCourts';
import { useSelectedCourt } from '@/hooks/useSelectedCourt';
import { useQueryClient } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Building2, Check } from 'lucide-react';

type CourtSelectorProps = {
  className?: string;
  showLabel?: boolean;
};

export function CourtSelector({ className, showLabel = true }: CourtSelectorProps) {
  const { courts, isLoading } = useCourts();
  const { selectedCourtId, selectedCourt, setSelectedCourtId } = useSelectedCourt();
  const queryClient = useQueryClient();
  const [tempSelectedId, setTempSelectedId] = useState<string>(selectedCourtId || '');

  // Sincronizar valor temporário com o valor selecionado atual
  useEffect(() => {
    setTempSelectedId(selectedCourtId || '');
  }, [selectedCourtId]);

  const handleApply = () => {
    if (tempSelectedId === selectedCourtId) {
      return; // Já está selecionado
    }

    console.log('✅ CourtSelector - Aplicando seleção:', tempSelectedId);
    
    // Atualizar a quadra selecionada
    setSelectedCourtId(tempSelectedId || null);

    // Remover TODAS as queries de appointments do cache
    queryClient.removeQueries({ 
      queryKey: ['appointments'],
      exact: false 
    });

    // Invalidar queries
    queryClient.invalidateQueries({ 
      queryKey: ['appointments'],
      exact: false 
    });

    // Forçar refetch após um pequeno delay
    setTimeout(() => {
      queryClient.refetchQueries({ 
        queryKey: ['appointments'],
        exact: false 
      });
    }, 100);
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

  const hasChanges = tempSelectedId !== selectedCourtId;

  return (
    <div className={className}>
      {showLabel && (
        <label className="text-sm font-medium mb-2 block flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Quadra
        </label>
      )}
      <div className="flex gap-2 items-center">
        <Select 
          value={tempSelectedId} 
          onValueChange={setTempSelectedId}
          className="flex-1"
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione uma quadra" />
          </SelectTrigger>
          <SelectContent>
            {courts.map((court) => (
              <SelectItem key={court.id} value={court.id}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${court.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                  {court.name}
                  {court.description && (
                    <span className="text-xs text-muted-foreground ml-2">({court.description})</span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button 
          onClick={handleApply}
          size="default"
          className="shrink-0"
          disabled={!hasChanges}
          title={hasChanges ? "Aplicar seleção" : "Nenhuma mudança"}
        >
          <Check className="h-4 w-4" />
          <span className="hidden sm:inline">Aplicar</span>
        </Button>
      </div>
      {selectedCourt && !hasChanges && (
        <p className="text-xs text-muted-foreground mt-1">
          Quadra selecionada: <strong>{selectedCourt.name}</strong>
        </p>
      )}
    </div>
  );
}
