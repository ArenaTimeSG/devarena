import { useEffect, useCallback, useState } from 'react';
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

type CourtSelectorProps = {
  className?: string;
  showLabel?: boolean;
};

export function CourtSelector({ className, showLabel = true }: CourtSelectorProps) {
  const { courts, isLoading } = useCourts();
  const { selectedCourtId, selectedCourt, setSelectedCourtId } = useSelectedCourt();
  const [localValue, setLocalValue] = useState<string>(selectedCourtId || '');

  // Sincronizar valor local com o hook global
  useEffect(() => {
    const newValue = selectedCourtId || '';
    if (localValue !== newValue) {
      console.log('🔄 CourtSelector - Sincronizando valor local:', localValue, '->', newValue);
      setLocalValue(newValue);
    }
  }, [selectedCourtId]);

  // Log para debug
  useEffect(() => {
    console.log('🎯 CourtSelector - Renderizado:', { selectedCourtId, selectedCourtName: selectedCourt?.name, localValue, courtsCount: courts.length });
  }, [selectedCourtId, selectedCourt, localValue, courts]);

  // Usar useCallback para estabilizar a função e evitar re-renderizações desnecessárias
  const handleValueChange = useCallback((value: string) => {
    console.log('🎯 CourtSelector - onValueChange chamado:', value, 'Estado atual:', selectedCourtId, 'Local:', localValue);
    setLocalValue(value); // Atualizar valor local imediatamente para feedback visual
    if (value !== selectedCourtId) {
      console.log('✅ CourtSelector - Atualizando para:', value);
      setSelectedCourtId(value || null);
    } else {
      console.log('⚠️ CourtSelector - Valor já está selecionado, ignorando');
    }
  }, [selectedCourtId, localValue, setSelectedCourtId]);

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
        value={localValue} 
        onValueChange={handleValueChange}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecione uma quadra">
            {selectedCourt ? (
              <span className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {selectedCourt.name}
              </span>
            ) : (
              'Selecione uma quadra'
            )}
          </SelectValue>
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
    </div>
  );
}
