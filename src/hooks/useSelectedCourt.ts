import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCourts } from './useCourts';
import { useAuth } from './useAuth';

/**
 * Hook para gerenciar a quadra selecionada
 * Mantém a seleção no localStorage para persistência entre sessões
 */
export const useSelectedCourt = () => {
  const { user } = useAuth();
  const { courts, isLoading: courtsLoading, getOrCreateDefaultCourt } = useCourts();
  const queryClient = useQueryClient();
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const previousCourtsIdsRef = useRef<string>('');
  const previousCourtIdRef = useRef<string | null>(null);

  // Criar uma string de IDs das quadras para usar como dependência
  const courtsIds = useMemo(() => courts.map(c => c.id).sort().join(','), [courts]);

  // Carregar quadra selecionada do localStorage ao montar (apenas uma vez)
  useEffect(() => {
    // Só executar no cliente
    if (typeof window === 'undefined' || !user?.id) {
      initializedRef.current = false;
      previousCourtsIdsRef.current = '';
      setSelectedCourtId(null);
      return;
    }
    
    // Aguardar o carregamento das quadras antes de inicializar
    if (courtsLoading) return;
    
    // Se já inicializou, não resetar (evita resetar ao trocar de aba ou quando courts atualiza)
    if (initializedRef.current) {
      // Verificar se as quadras mudaram e se a seleção atual ainda é válida
      if (previousCourtsIdsRef.current !== courtsIds) {
        previousCourtsIdsRef.current = courtsIds;
        
        const currentCourtIsValid = selectedCourtId 
          ? courts.some((c) => c.id === selectedCourtId && c.is_active)
          : false;

        if (!currentCourtIsValid && courts.length > 0) {
          const firstActiveCourt = courts.find((c) => c.is_active);
          if (firstActiveCourt) {
            setSelectedCourtId(firstActiveCourt.id);
            const storageKey = `selectedCourt_${user.id}`;
            try {
              localStorage.setItem(storageKey, firstActiveCourt.id);
            } catch (error) {
              console.error('Erro ao salvar no localStorage:', error);
            }
          }
        }
      }
      return;
    }

    const storageKey = `selectedCourt_${user.id}`;
    let savedCourtId: string | null = null;
    
    try {
      savedCourtId = localStorage.getItem(storageKey);
    } catch (error) {
      console.error('Erro ao acessar localStorage:', error);
    }

    if (savedCourtId && courts.length > 0) {
      // Verificar se a quadra ainda existe e está ativa
      const courtExists = courts.some((c) => c.id === savedCourtId && c.is_active);
      if (courtExists) {
        setSelectedCourtId(savedCourtId);
        initializedRef.current = true;
        previousCourtsIdsRef.current = courtsIds;
        return;
      }
    }

    // Se não há quadra selecionada ou a quadra não existe mais,
    // usar a primeira quadra disponível ou criar Quadra 1 padrão apenas se não houver nenhuma
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
        previousCourtsIdsRef.current = courtsIds;
      } else if (getOrCreateDefaultCourt) {
        // Se não há quadras ativas, tentar criar Quadra 1 padrão (mas só se realmente não houver nenhuma)
        getOrCreateDefaultCourt().then((defaultCourt) => {
          if (defaultCourt) {
            setSelectedCourtId(defaultCourt.id);
            try {
              localStorage.setItem(storageKey, defaultCourt.id);
            } catch (error) {
              console.error('Erro ao salvar no localStorage:', error);
            }
            initializedRef.current = true;
            previousCourtsIdsRef.current = courtsIds;
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
          try {
            localStorage.setItem(storageKey, defaultCourt.id);
          } catch (error) {
            console.error('Erro ao salvar no localStorage:', error);
          }
          initializedRef.current = true;
          previousCourtsIdsRef.current = courtsIds;
        }
      }).catch((error) => {
        console.error('Erro ao criar quadra padrão:', error);
      });
    }
  }, [user?.id, courts, courtsLoading, getOrCreateDefaultCourt, courtsIds, selectedCourtId]);

  // Atualizar localStorage quando a quadra selecionada mudar e invalidar queries
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
      
      // Invalidar queries de agendamentos para forçar recarregamento imediato
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      
      return courtId;
    });
  }, [selectedCourtId, user?.id, queryClient]);

  // Invalidar queries quando a quadra selecionada mudar
  useEffect(() => {
    // Só invalidar se a quadra realmente mudou (não na primeira renderização)
    if (previousCourtIdRef.current !== null && previousCourtIdRef.current !== selectedCourtId) {
      console.log('🔄 Quadra selecionada mudou, invalidando queries...', {
        anterior: previousCourtIdRef.current,
        nova: selectedCourtId
      });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
    }
    previousCourtIdRef.current = selectedCourtId;
  }, [selectedCourtId, queryClient]);

  // Obter a quadra selecionada completa
  const selectedCourt = courts.find((c) => c.id === selectedCourtId && c.is_active) || null;

  return {
    selectedCourtId,
    selectedCourt,
    setSelectedCourtId: handleSetSelectedCourt,
  };
};
