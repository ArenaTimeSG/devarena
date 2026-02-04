import { useState, useEffect, useRef, useCallback } from 'react';
import { useCourts } from './useCourts';
import { useAuth } from './useAuth';

/**
 * Hook para gerenciar a quadra selecionada
 * Mantém a seleção no localStorage para persistência entre sessões
 */
export const useSelectedCourt = () => {
  const { user } = useAuth();
  const { courts, isLoading: courtsLoading, getOrCreateDefaultCourt } = useCourts();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Carregar quadra selecionada do localStorage ao montar (apenas uma vez)
  useEffect(() => {
    // Só executar no cliente
    if (typeof window === 'undefined' || !user?.id) return;
    
    // Aguardar o carregamento das quadras antes de inicializar
    if (courtsLoading) return;
    
    // Se já inicializou, não resetar (evita resetar ao trocar de aba ou quando courts atualiza)
    if (initializedRef.current) return;

    const storageKey = `selectedCourt_${user.id}`;
    const savedCourtId = localStorage.getItem(storageKey);

    if (savedCourtId) {
      // Verificar se a quadra ainda existe e está ativa
      const courtExists = courts.some((c) => c.id === savedCourtId && c.is_active);
      if (courtExists) {
        setSelectedCourtId(savedCourtId);
        initializedRef.current = true;
        return;
      }
    }

    // Se não há quadra selecionada ou a quadra não existe mais,
    // usar a primeira quadra disponível ou criar Quadra 1 padrão apenas se não houver nenhuma
    if (courts.length > 0) {
      const firstActiveCourt = courts.find((c) => c.is_active);
      if (firstActiveCourt) {
        setSelectedCourtId(firstActiveCourt.id);
        localStorage.setItem(storageKey, firstActiveCourt.id);
        initializedRef.current = true;
      } else if (getOrCreateDefaultCourt) {
        // Se não há quadras ativas, tentar criar Quadra 1 padrão (mas só se realmente não houver nenhuma)
        getOrCreateDefaultCourt().then((defaultCourt) => {
          if (defaultCourt) {
            setSelectedCourtId(defaultCourt.id);
            localStorage.setItem(storageKey, defaultCourt.id);
            initializedRef.current = true;
          }
        }).catch((error) => {
          console.error('Erro ao criar quadra padrão:', error);
        });
      }
    } else if (getOrCreateDefaultCourt) {
      // Se não há quadras, criar Quadra 1 padrão
      getOrCreateDefaultCourt().then((defaultCourt) => {
        if (defaultCourt) {
          setSelectedCourtId(defaultCourt.id);
          localStorage.setItem(storageKey, defaultCourt.id);
          initializedRef.current = true;
        }
      }).catch((error) => {
        console.error('Erro ao criar quadra padrão:', error);
      });
    }
  }, [user?.id, courts, courtsLoading, getOrCreateDefaultCourt]);

  // Atualizar localStorage quando a quadra selecionada mudar
  const handleSetSelectedCourt = useCallback((courtId: string | null) => {
    console.log('🎯 useSelectedCourt - handleSetSelectedCourt chamado:', courtId, 'Estado atual:', selectedCourtId);
    
    // Evitar atualizações desnecessárias usando função de atualização funcional
    setSelectedCourtId((currentId) => {
      if (currentId === courtId) {
        console.log('⚠️ useSelectedCourt - Quadra já está selecionada, ignorando');
        return currentId;
      }
      
      console.log('✅ useSelectedCourt - Atualizando de', currentId, 'para', courtId);
      
      if (user?.id && typeof window !== 'undefined') {
        const storageKey = `selectedCourt_${user.id}`;
        if (courtId) {
          localStorage.setItem(storageKey, courtId);
          console.log('✅ useSelectedCourt - Salvo no localStorage:', courtId);
        } else {
          localStorage.removeItem(storageKey);
          console.log('✅ useSelectedCourt - Removido do localStorage');
        }
      }
      
      return courtId;
    });
  }, [selectedCourtId, user?.id]);

  // Obter a quadra selecionada completa
  const selectedCourt = courts.find((c) => c.id === selectedCourtId && c.is_active) || null;

  return {
    selectedCourtId,
    selectedCourt,
    setSelectedCourtId: handleSetSelectedCourt,
  };
};
