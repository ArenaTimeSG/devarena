import { supabase } from '@/integrations/supabase/client';

// Modalidades padrão do sistema
export const DEFAULT_MODALITIES = [
  { id: 'volei', name: 'Vôlei', isDefault: true },
  { id: 'futsal', name: 'Futsal', isDefault: true },
  { id: 'basquete', name: 'Basquete', isDefault: true }
];

export interface Modality {
  id: string;
  name: string;
  isDefault?: boolean;
}

export const getAllModalities = async (userId?: string): Promise<Modality[]> => {
  try {
    // Sempre incluir modalidades padrão
    const allModalities: Modality[] = [...DEFAULT_MODALITIES];

    // Se tiver usuário, buscar modalidades personalizadas
    if (userId) {
      const { data: customModalities, error } = await supabase
        .from('custom_modalities')
        .select('id, name')
        .eq('user_id', userId)
        .eq('active', true)
        .order('name');

      if (!error && customModalities) {
        // Adicionar modalidades personalizadas
        customModalities.forEach(custom => {
          allModalities.push({
            id: custom.id,
            name: custom.name,
            isDefault: false
          });
        });
      }
    }

    return allModalities;
  } catch (error) {
    console.error('Erro ao carregar modalidades:', error);
    return DEFAULT_MODALITIES; // Retornar pelo menos as padrão em caso de erro
  }
};

export const getModalityById = async (modalityId: string, userId?: string): Promise<Modality | null> => {
  const allModalities = await getAllModalities(userId);
  return allModalities.find(m => m.id === modalityId) || null;
};

// Função removida pois não usamos mais cores
