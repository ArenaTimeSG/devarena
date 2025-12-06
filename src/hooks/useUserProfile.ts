import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile, CreateUserProfile, UpdateUserProfile } from '@/types/user';

export const useUserProfile = () => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  // Buscar perfil do usuário atual
  const {
    data: profile,
    isLoading: isLoadingProfile,
    error: profileError,
    refetch: refetchProfile
  } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async (): Promise<UserProfile | null> => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          return null;
        }

        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Perfil não encontrado, retorna null
            return null;
          }
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false,
    gcTime: 60 * 60 * 1000, // 60 minutos
  });

  // Criar perfil de usuário
  const createProfileMutation = useMutation({
    mutationFn: async (profileData: CreateUserProfile): Promise<UserProfile> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          name: profileData.name,
          email: profileData.email,
          phone: profileData.phone,
          role: profileData.role || 'user'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  // Atualizar perfil de usuário
  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: UpdateUserProfile): Promise<UserProfile> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  // Deletar perfil de usuário
  const deleteProfileMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] });
    },
  });

  // Verificar se o usuário é admin
  const isAdmin = profile?.role === 'admin';

  // Verificar se o perfil está ativo
  const isActive = profile?.is_active ?? false;

  return {
    // Estados
    profile,
    isLoading: isLoadingProfile || createProfileMutation.isPending || updateProfileMutation.isPending || deleteProfileMutation.isPending,
    error: profileError,
    
    // Mutations
    createProfile: createProfileMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    deleteProfile: deleteProfileMutation.mutate,
    
    // Estados das mutations
    isCreating: createProfileMutation.isPending,
    isUpdating: updateProfileMutation.isPending,
    isDeleting: deleteProfileMutation.isPending,
    
    // Erros das mutations
    createError: createProfileMutation.error,
    updateError: updateProfileMutation.error,
    deleteError: deleteProfileMutation.error,
    
    // Utilitários
    refetchProfile,
    isAdmin,
    isActive,
  };
};

