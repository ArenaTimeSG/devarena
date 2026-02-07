import { useState, useEffect, useRef } from 'react';
import { useCourts } from './useCourts';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

/**
 * Hook para gerenciar a quadra selecionada
 * Mantém a seleção no localStorage para persistência entre sessões
 */
export const useSelectedCourt = () => {
  const { user } = useAuth();
  const { courts, isLoading: courtsLoading, getOrCreateDefaultCourt } = useCourts();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Carregar quadra selecionada do localStorage ao montar
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) {
      initializedRef.current = false;
      setSelectedCourtId(null);
      return;
    }
    
    if (courtsLoading) return;
    
    if (initializedRef.current) return;

    const storageKey = `selectedCourt_${user.id}`;
    let savedCourtId: string | null = null;
    
    try {
      savedCourtId = localStorage.getItem(storageKey);
    } catch (error) {
      logger.error('Erro ao acessar localStorage:', error);
    }

    if (savedCourtId && courts.length > 0) {
      const courtExists = courts.some((c) => c.id === savedCourtId && c.is_active);
      if (courtExists) {
        setSelectedCourtId(savedCourtId);
        initializedRef.current = true;
        return;
      }
    }

    // Selecionar primeira quadra ativa
    if (courts.length > 0) {
      const firstActiveCourt = courts.find((c) => c.is_active);
      if (firstActiveCourt) {
        setSelectedCourtId(firstActiveCourt.id);
        try {
          localStorage.setItem(storageKey, firstActiveCourt.id);
        } catch (error) {
          console.error('Erro ao salvar no localStorage:', error);
        }
        initializedRef.current = true;
      } else if (getOrCreateDefaultCourt) {
        getOrCreateDefaultCourt().then((defaultCourt) => {
          if (defaultCourt) {
            setSelectedCourtId(defaultCourt.id);
            try {
              localStorage.setItem(storageKey, defaultCourt.id);
            } catch (error) {
              console.error('Erro ao salvar no localStorage:', error);
            }
            initializedRef.current = true;
          }
        }).catch((error) => {
          logger.error('Erro ao criar quadra padrão:', error);
        });
      }
    } else if (getOrCreateDefaultCourt) {
      getOrCreateDefaultCourt().then((defaultCourt) => {
        if (defaultCourt) {
          setSelectedCourtId(defaultCourt.id);
          try {
            localStorage.setItem(storageKey, defaultCourt.id);
          } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
          }
          initializedRef.current = true;
        }
      }).catch((error) => {
        console.error('Erro ao criar quadra padrão:', error);
      });
    }
  }, [user?.id, courts, courtsLoading, getOrCreateDefaultCourt]);

  // Atualizar localStorage quando a quadra selecionada mudar
  const handleSetSelectedCourt = (courtId: string | null) => {
    setSelectedCourtId(courtId);
    if (user?.id && typeof window !== 'undefined') {
      const storageKey = `selectedCourt_${user.id}`;
      if (courtId) {
        try {
          localStorage.setItem(storageKey, courtId);
        } catch (error) {
          console.error('Erro ao salvar no localStorage:', error);
        }
      } else {
        try {
          localStorage.removeItem(storageKey);
        } catch (error) {
          logger.error('Erro ao remover do localStorage:', error);
        }
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
