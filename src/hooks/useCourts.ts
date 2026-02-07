import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Court {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateCourtData {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateCourtData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export const useCourts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar todas as quadras do usuário
  const {
    data: courts = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['courts', user?.id],
    queryFn: async (): Promise<Court[]> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('courts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar quadras:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // Mutation para criar quadra
  const createCourtMutation = useMutation({
    mutationFn: async (courtData: CreateCourtData): Promise<Court> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('courts')
        .insert({
          user_id: user.id,
          name: courtData.name,
          description: courtData.description || null,
          is_active: courtData.is_active !== undefined ? courtData.is_active : true,
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar quadra:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Quadra criada!',
        description: 'A quadra foi criada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['courts', user?.id] });
      // Invalidar também queries de agendamentos para garantir que o filtro seja aplicado
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar quadra',
        description: error.message || 'Ocorreu um erro ao criar a quadra.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar quadra
  const updateCourtMutation = useMutation({
    mutationFn: async ({ id, ...courtData }: UpdateCourtData & { id: string }): Promise<Court> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('courts')
        .update(courtData)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao atualizar quadra:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Quadra atualizada!',
        description: 'A quadra foi atualizada com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['courts', user?.id] });
      // Invalidar queries de agendamentos para garantir que o filtro seja aplicado
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar quadra',
        description: error.message || 'Ocorreu um erro ao atualizar a quadra.',
        variant: 'destructive',
      });
    },
  });

  // Mutation para deletar quadra (soft delete - marca como inativa)
  const deleteCourtMutation = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      if (!user?.id) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar se há agendamentos futuros para esta quadra
      const { data: futureAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('court_id', id)
        .eq('user_id', user.id)
        .gte('date', new Date().toISOString())
        .limit(1);

      if (checkError) {
        throw new Error('Erro ao verificar agendamentos');
      }

      if (futureAppointments && futureAppointments.length > 0) {
        throw new Error('Não é possível excluir uma quadra que possui agendamentos futuros.');
      }

      // Soft delete: marcar como inativa
      const { error } = await supabase
        .from('courts')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Erro ao excluir quadra:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Quadra excluída!',
        description: 'A quadra foi excluída com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['courts', user?.id] });
      // Invalidar queries de agendamentos para garantir que o filtro seja aplicado
      queryClient.invalidateQueries({ queryKey: ['appointments'], exact: false });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao excluir quadra',
        description: error.message || 'Ocorreu um erro ao excluir a quadra.',
        variant: 'destructive',
      });
    },
  });

  // Função para obter a primeira quadra ativa ou criar Quadra 1 se não existir nenhuma
  const getOrCreateDefaultCourt = async (): Promise<Court | null> => {
    if (!user?.id) return null;

    // Primeiro, buscar qualquer quadra ativa do usuário
    const { data: activeCourts, error: fetchError } = await supabase
      .from('courts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('❌ Erro ao buscar quadras:', fetchError);
      return null;
    }

    // Se encontrou alguma quadra ativa, retornar a primeira
    if (activeCourts && activeCourts.length > 0) {
      return activeCourts[0];
    }

    // Se não encontrou nenhuma quadra ativa, criar Quadra 1 padrão
    const { data: newCourt, error: createError } = await supabase
      .from('courts')
      .insert({
        user_id: user.id,
        name: 'Quadra 1',
        description: null,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Erro ao criar quadra padrão:', createError);
      return null;
    }

    return newCourt;
  };

  return {
    courts,
    isLoading,
    error,
    refetch,
    createCourt: createCourtMutation.mutate,
    updateCourt: updateCourtMutation.mutate,
    deleteCourt: deleteCourtMutation.mutate,
    getOrCreateDefaultCourt,
    isCreating: createCourtMutation.isPending,
    isUpdating: updateCourtMutation.isPending,
    isDeleting: deleteCourtMutation.isPending,
  };
};
