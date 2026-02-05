import { useState, useEffect } from 'react';
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
  const [localCourtId, setLocalCourtId] = useState<string>(selectedCourtId || '');

  // Sincronizar com o estado global
  useEffect(() => {
    setLocalCourtId(selectedCourtId || '');
  }, [selectedCourtId]);

  const handleChange = (value: string) => {
    const newCourtId = value || null;
    
    if (newCourtId === selectedCourtId) {
      return;
    }

    console.log('🔄 CourtSelector - Mudando de', selectedCourtId, 'para', newCourtId);
    
    // Atualizar estado local imediatamente para feedback visual
    setLocalCourtId(value);
    
    // Atualizar estado global - React Query vai detectar automaticamente a mudança na query key
    setSelectedCourtId(newCourtId);
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
