import { useState, useEffect } from 'react';
import { useCourts } from './useCourts';
import { useAuth } from './useAuth';

/**
 * Hook para gerenciar a quadra selecionada
 * Mantém a seleção no localStorage para persistência entre sessões
 */
export const useSelectedCourt = () => {
  const { user } = useAuth();
  const { courts, getOrCreateDefaultCourt } = useCourts();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

  // Carregar quadra selecionada do localStorage ao montar
  useEffect(() => {
    if (!user?.id) return;

    const storageKey = `selectedCourt_${user.id}`;
    const savedCourtId = localStorage.getItem(storageKey);

    if (savedCourtId) {
      // Verificar se a quadra ainda existe e está ativa
      const courtExists = courts.some((c) => c.id === savedCourtId && c.is_active);
      if (courtExists) {
        setSelectedCourtId(savedCourtId);
        return;
      }
    }

    // Se não há quadra selecionada ou a quadra não existe mais,
    // usar a primeira quadra disponível ou criar Quadra 1 padrão
    if (courts.length > 0) {
      const firstActiveCourt = courts.find((c) => c.is_active);
      if (firstActiveCourt) {
        setSelectedCourtId(firstActiveCourt.id);
        localStorage.setItem(storageKey, firstActiveCourt.id);
      } else {
        // Se não há quadras ativas, criar Quadra 1 padrão
        getOrCreateDefaultCourt().then((defaultCourt) => {
          if (defaultCourt) {
            setSelectedCourtId(defaultCourt.id);
            localStorage.setItem(storageKey, defaultCourt.id);
          }
        });
      }
    } else {
      // Se não há quadras, criar Quadra 1 padrão
      getOrCreateDefaultCourt().then((defaultCourt) => {
        if (defaultCourt) {
          setSelectedCourtId(defaultCourt.id);
          const storageKey = `selectedCourt_${user.id}`;
          localStorage.setItem(storageKey, defaultCourt.id);
        }
      });
    }
  }, [user?.id, courts, getOrCreateDefaultCourt]);

  // Atualizar localStorage quando a quadra selecionada mudar
  const handleSetSelectedCourt = (courtId: string | null) => {
    setSelectedCourtId(courtId);
    if (user?.id) {
      const storageKey = `selectedCourt_${user.id}`;
      if (courtId) {
        localStorage.setItem(storageKey, courtId);
      } else {
        localStorage.removeItem(storageKey);
      }
    }
  };

  // Obter a quadra selecionada completa
  const selectedCourt = courts.find((c) => c.id === selectedCourtId && c.is_active) || null;

  return {
    selectedCourtId,
    selectedCourt,
    setSelectedCourtId: handleSetSelectedCourt,
  };
};
