import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Client, CreateClientData, LoginClientData, UpdateClientData } from '@/types/client';

// Função para hash simples da senha (em produção, usar bcrypt)
const hashPassword = (password: string): string => {
  return btoa(password); // Base64 para demo - NÃO usar em produção
};

// Função para verificar senha
const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

export const useClientAuth = () => {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  // Verificar se há cliente logado no localStorage
  useEffect(() => {
    const checkSavedClient = async () => {
      const savedClient = localStorage.getItem('client');
      if (savedClient) {
        try {
          const parsedClient = JSON.parse(savedClient);
          // Verificar se o cliente ainda é válido (tem id e email)
          if (parsedClient && parsedClient.id && parsedClient.email) {
            // Definir o cliente imediatamente para evitar flash de loading
            setClient(parsedClient);
            // Verificar se o cliente ainda existe no banco em background
            verifyClientExists(parsedClient.id, parsedClient.email);
          } else {
            localStorage.removeItem('client');
            setClient(null);
          }
        } catch (error) {
          console.error('Erro ao parsear cliente do localStorage:', error);
          localStorage.removeItem('client');
          setClient(null);
        }
      }
      setLoading(false);
    };

    checkSavedClient();
  }, []);

  // Verificar se o cliente ainda existe no banco
  const verifyClientExists = async (clientId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from('booking_clients')
        .select('id, name, email, phone')
        .eq('id', clientId)
        .eq('email', email)
        .single();

      if (error) {
        console.error('❌ Erro ao verificar cliente no banco:', error);
        // Se for erro de RLS, remover do localStorage
        if (error.code === '42501' || error.message.includes('row-level security')) {
          console.log('❌ Erro de RLS detectado, removendo cliente do localStorage');
          localStorage.removeItem('client');
          setClient(null);
          return false;
        }
        return false;
      }

      if (!data) {
        console.log('❌ Cliente não encontrado no banco, removendo do localStorage');
        localStorage.removeItem('client');
        setClient(null);
        return false;
      }

      // Atualizar dados do cliente caso tenha mudanças
      if (JSON.stringify(data) !== localStorage.getItem('client')) {
        saveClientToStorage(data);
      }

      return true;
    } catch (error) {
      console.error('❌ Erro inesperado ao verificar cliente no banco:', error);
      return false;
    }
  };

  // Listener para sincronizar mudanças no localStorage entre abas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'client') {
        if (e.newValue) {
          try {
            const parsedClient = JSON.parse(e.newValue);
            setClient(parsedClient);
          } catch (error) {
            console.error('Erro ao parsear cliente do storage event:', error);
            setClient(null);
          }
        } else {
          setClient(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listener para manter sessão ao recarregar página
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Garantir que o cliente seja salvo antes de recarregar
      if (client) {
        localStorage.setItem('client', JSON.stringify(client));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [client]);

  // Salvar cliente no localStorage
  const saveClientToStorage = (clientData: Client) => {
    localStorage.setItem('client', JSON.stringify(clientData));
    setClient(clientData);
  };

  // Remover cliente do localStorage
  const removeClientFromStorage = () => {
    localStorage.removeItem('client');
    setClient(null);
  };

  // Mutation para registrar cliente (considera apenas conta global - user_id IS NULL)
  const registerMutation = useMutation({
    mutationFn: async (data: CreateClientData) => {
      // Verificar se o email já existe (usando .maybeSingle() para evitar erro de múltiplos registros)
      const normalizedEmail = data.email.trim().toLowerCase();
      const { data: existingClient, error: checkError } = await supabase
        .from('booking_clients')
        .select('id')
        .eq('email', normalizedEmail)
        // Ignorar registros temporários de agendas (que possuem user_id)
        .is('user_id', null)
        // Em caso de duplicatas antigas, pegar o mais recente
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .single();

      // Se encontrou um cliente com este email, erro
      if (existingClient) {
        throw new Error('Email já cadastrado');
      }

      // Se houve erro diferente de "não encontrado", pode ser problema de RLS
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ useClientAuth: Erro ao verificar email existente:', checkError);
        throw new Error('Erro ao verificar email: ' + checkError.message);
      }

      const hashedPassword = hashPassword(data.password);
      
      console.log('🔍 useClientAuth: Tentando registrar cliente:', { name: data.name, email: data.email, phone: data.phone });
      
      const { data: newClient, error } = await supabase
        .from('booking_clients')
        .insert({
          name: data.name,
          email: normalizedEmail,
          password_hash: hashedPassword,
          phone: data.phone
        })
        .select('id, name, email, phone, created_at')
        .single();

      if (error) {
        console.error('❌ useClientAuth: Erro ao registrar cliente:', error);
        throw error;
      }
      
      console.log('✅ useClientAuth: Cliente registrado com sucesso:', newClient);
      return newClient;
    },
    onSuccess: (data) => {
      saveClientToStorage(data);
    }
  });

  // Mutation para login (validação 100% no banco; suporta duplicatas por email)
  const loginMutation = useMutation({
    mutationFn: async (data: LoginClientData & { user_id?: string }) => {
      const normalizedLoginEmail = data.email.trim().toLowerCase();
      console.log('🔍 useClientAuth: Tentando fazer login (validação no banco):', { email: normalizedLoginEmail, user_id: data.user_id });

      const hashed = hashPassword(data.password);

      // 1) Se user_id foi fornecido, priorizar o registro específico da agenda
      if (data.user_id) {
        const { data: clientByUser, error: errByUser } = await supabase
          .from('booking_clients')
          .select('*')
          .eq('email', normalizedLoginEmail)
          .eq('user_id', data.user_id)
          .eq('password_hash', hashed)
          .order('updated_at', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false, nullsFirst: false })
          .limit(1)
          .maybeSingle();

        if (errByUser && errByUser.code !== 'PGRST116') {
          console.error('❌ useClientAuth: Erro ao buscar cliente por user_id:', errByUser);
          throw new Error('Erro ao fazer login: ' + errByUser.message);
        }
        if (clientByUser) {
          return clientByUser;
        }
      }

      // 2) Sem user_id (ou não encontrou acima): procurar qualquer registro do email com o hash correspondente
      const { data: clientAny, error: errAny } = await supabase
        .from('booking_clients')
        .select('*')
        .eq('email', normalizedLoginEmail)
        .eq('password_hash', hashed)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (errAny) {
        if (errAny.code === 'PGRST116') {
          throw new Error('Email ou senha incorretos');
        }
        console.error('❌ useClientAuth: Erro ao buscar cliente por email/hash:', errAny);
        throw new Error('Erro ao fazer login: ' + errAny.message);
      }

      if (!clientAny) {
        throw new Error('Email ou senha incorretos');
      }

      return clientAny;
    },
    onSuccess: (data) => {
      saveClientToStorage(data);
    }
  });

  // Mutation para atualizar cliente
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateClientData) => {
      if (!client) throw new Error('Cliente não autenticado');

      const { data: updatedClient, error } = await supabase
        .from('booking_clients')
        .update(data)
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;
      return updatedClient;
    },
    onSuccess: (data) => {
      saveClientToStorage(data);
    }
  });

  // Função para logout
  const logout = () => {
    removeClientFromStorage();
  };

  return {
    client,
    loading,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    loginClient: loginMutation.mutate,
    update: updateMutation.mutate,
    logout,
    verifyClientExists,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isUpdating: updateMutation.isPending,
    registerError: registerMutation.error,
    loginError: loginMutation.error,
    updateError: updateMutation.error
  };
};
