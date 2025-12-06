import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, isBefore, isEqual } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useWorkingHours } from '@/hooks/useWorkingHours';
import { useModalities } from '@/hooks/useModalities';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClientSearchDropdown } from '@/components/ClientSearchDropdown';
import { AddClientModal } from '@/components/AddClientModal';

interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedTime?: string;
  onAppointmentCreated: () => void;
  onBlockTime?: () => void;
  forceAppointment?: boolean; // Para permitir agendamento em horários bloqueados
}

const NewAppointmentModal = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  selectedTime, 
  onAppointmentCreated,
  onBlockTime,
  forceAppointment = false
}: NewAppointmentModalProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { getAvailableHoursForDay, isDayEnabled } = useWorkingHours();
  const { modalities = [] } = useModalities();
  const { createAppointment } = useAppointments();
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    modality_id: '',
    date: '',
    time: '',
    isRecurring: false,
    recurrenceType: 'data_final' as 'data_final' | 'repeticoes' | 'indeterminado',
    endDate: '',
    repetitions: 1,
    isCortesia: false,
    customValue: null as number | null
  });

  // Debug: verificar estado inicial
  console.log('🔍 NewAppointmentModal - Estado inicial formData:', formData);

  // useEffect separado para carregar clientes quando modal abrir
  useEffect(() => {
    if (isOpen) {
      fetchClients();
    }
  }, [isOpen]);

  // useEffect separado para atualizar formData quando dados mudarem
  useEffect(() => {
    if (isOpen && selectedDate && selectedTime) {
      // Debug: verificar dados recebidos
      console.log('🔍 NewAppointmentModal - Dados recebidos:', {
        selectedDate: selectedDate?.toISOString(),
        selectedTime,
        isOpen
      });
      
      // Atualizar formData com os dados selecionados
      const newFormData = {
        client_id: '',
        modality_id: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime, // Sempre definir o horário selecionado
        isRecurring: false,
        recurrenceType: 'data_final' as 'data_final' | 'repeticoes' | 'indeterminado',
        endDate: '',
        repetitions: 1,
        isCortesia: false,
        customValue: null
      };
      
      console.log('🔍 NewAppointmentModal - FormData atualizado:', newFormData);
      setFormData(newFormData);
      
      // Debug: verificar se o estado foi atualizado
      setTimeout(() => {
        console.log('🔍 NewAppointmentModal - Estado após setFormData:', formData);
      }, 0);
    }
  }, [isOpen, selectedDate, selectedTime]);

  // useEffect separado para resetar quando modal fechar
  useEffect(() => {
    if (!isOpen) {
      // Resetar formData quando o modal fechar
      setFormData({
        client_id: '',
        modality_id: '',
        date: '',
        time: '',
        isRecurring: false,
        recurrenceType: 'data_final',
        endDate: '',
        repetitions: 1,
        isCortesia: false,
        customValue: null
      });
    }
  }, [isOpen]);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('booking_clients')
        .select('id, name, email, phone')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Gerar horários disponíveis baseados na data selecionada
  const getAvailableTimeSlots = (date: string) => {
    if (!date) return [];
    
    const selectedDate = new Date(date);
    const availableHours = getAvailableHoursForDay(selectedDate);
    
    // Garantir que o horário selecionado esteja sempre disponível
    if (selectedTime && !availableHours.includes(selectedTime)) {
      availableHours.push(selectedTime);
      availableHours.sort(); // Ordenar para manter consistência
    }
    
    console.log('🔍 NewAppointmentModal - getAvailableTimeSlots:', {
      date,
      selectedTime,
      availableHours,
      includesSelectedTime: availableHours.includes(selectedTime || '')
    });
    
    return availableHours;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.date || !formData.time || !formData.modality_id) {
      toast({
        title: 'Erro no agendamento',
        description: 'Todos os campos obrigatórios devem ser preenchidos',
        variant: 'destructive',
      });
      return;
    }

    if (formData.isRecurring) {
      if (formData.recurrenceType === 'data_final' && !formData.endDate) {
        toast({
          title: 'Erro no agendamento',
          description: 'Data final é obrigatória para recorrência',
          variant: 'destructive',
        });
        return;
      }
      if (formData.recurrenceType === 'repeticoes' && formData.repetitions < 1) {
        toast({
          title: 'Erro no agendamento',
          description: 'Número de repetições deve ser maior que zero',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const appointmentDate = new Date(`${formData.date}T${formData.time}:00`);
      
      // Comentado: Validação de data passada removida para permitir agendamentos retroativos
      // if (isBefore(appointmentDate, new Date()) && !isEqual(appointmentDate, new Date())) {
      //   toast({
      //     title: 'Erro no agendamento',
      //     description: 'Não é possível agendar para datas passadas',
      //     variant: 'destructive',
      //   });
      //   return;
      // }

      // Verificar se o dia está habilitado (pular se for agendamento forçado)
      if (!forceAppointment && !isDayEnabled(appointmentDate)) {
        toast({
          title: 'Erro no agendamento',
          description: 'Este dia não está disponível para agendamento',
          variant: 'destructive',
        });
        return;
      }

      // Verificar se o horário está disponível
      const availableSlots = getAvailableTimeSlots(formData.date);
      if (!availableSlots.includes(formData.time)) {
        toast({
          title: 'Erro no agendamento',
          description: 'Este horário não está disponível para agendamento',
          variant: 'destructive',
        });
        return;
      }

      // Obter o usuário atual primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar conflitos de agendamento
      if (formData.isRecurring) {
        // Para agendamentos recorrentes, verificar todas as datas para este usuário
        // Gerar um ID temporário para verificação de conflitos
        const tempRecurrenceId = `temp_${Date.now()}`;
        const recurringAppointments = generateRecurringAppointments(formData, appointmentDate, tempRecurrenceId);
        const datesToCheck = recurringAppointments.map(a => a.date);
        
        const { data: existingAppointments, error: checkError } = await supabase
          .from('appointments')
          .select('id, date')
          .eq('user_id', user.id)
          .in('date', datesToCheck);

        if (checkError) throw checkError;

        if (existingAppointments && existingAppointments.length > 0) {
          const conflictingDates = existingAppointments.map(a => new Date(a.date).toLocaleDateString('pt-BR'));
          toast({
            title: 'Conflito de agendamentos',
            description: `Já existem agendamentos nas seguintes datas: ${conflictingDates.join(', ')}`,
            variant: 'destructive',
          });
          return;
        }
      } else {
        // Para agendamento único, verificar apenas a data específica para este usuário
        const { data: existingAppointment, error: checkError } = await supabase
          .from('appointments')
          .select('id')
          .eq('user_id', user.id)
          .eq('date', appointmentDate.toISOString())
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existingAppointment) {
          toast({
            title: 'Erro no agendamento',
            description: 'Já existe um agendamento neste horário',
            variant: 'destructive',
          });
          return;
        }
      }

      // Criar agendamentos (recorrente ou único)
      if (formData.isRecurring) {
        // Primeiro, criar o registro de recorrência
        const { data: recurrenceData, error: recurrenceError } = await supabase
          .from('recurrences')
          .insert({
            type: formData.recurrenceType,
            end_date: formData.endDate || null,
            repetitions: formData.repetitions || null,
            user_id: user.id
          })
          .select()
          .single();

        if (recurrenceError) throw recurrenceError;

        console.log('🔍 NewAppointmentModal - Recorrência criada:', recurrenceData);

        // Criar agendamentos recorrentes com o recurrence_id correto
        const appointments = generateRecurringAppointments(formData, appointmentDate, recurrenceData.id, user.id);
        
        console.log('🔍 NewAppointmentModal - Criando agendamentos recorrentes:', {
          total: appointments.length,
          recurrenceId: recurrenceData.id,
          appointments: appointments.map(a => ({ 
            date: a.date, 
            time: a.time, 
            valor_total: a.valor_total 
          }))
        });

        // Inserir todos os agendamentos
        // Criar agendamentos recorrentes em lote otimizado
        const batchSize = 50; // Processar em lotes de 50 para melhor performance
        const insertedAppointments = [];
        
        for (let i = 0; i < appointments.length; i += batchSize) {
          const batch = appointments.slice(i, i + batchSize);
          const { data: batchData, error: insertError } = await supabase
            .from('appointments')
            .insert(batch)
            .select('*');

          if (insertError) throw insertError;
          if (batchData) insertedAppointments.push(...batchData);
        }

        toast({
          title: 'Agendamentos recorrentes criados!',
          description: `${appointments.length} agendamentos foram criados com sucesso.`,
        });

        // Atualizar cache diretamente para agendamentos recorrentes
        if (insertedAppointments.length > 0) {
          queryClient.setQueryData(['appointments', user.id], (oldData: any[] | undefined) => {
            if (!oldData) return insertedAppointments;
            return [...insertedAppointments, ...oldData];
          });
        }
      } else {
        // Criar agendamento único usando o novo hook
        await createAppointment({
          client_id: formData.client_id,
          modality_id: formData.modality_id,
          date: appointmentDate.toISOString(),
          status: 'agendado',
          is_cortesia: formData.isCortesia,
          customValue: formData.customValue
        });
      }

      onAppointmentCreated();
      onClose();
      
      // Reset form
      setFormData({
        client_id: '',
        modality_id: '',
        date: '',
        time: '',
        isRecurring: false,
        recurrenceType: 'data_final',
        endDate: '',
        repetitions: 1,
        isCortesia: false
      });

    } catch (error: any) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: 'Erro ao criar agendamento',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função otimizada para gerar agendamentos recorrentes
  const generateRecurringAppointments = (formData: any, startDate: Date, recurrenceId: string, userId: string) => {
    const appointments = [];
    let currentDate = new Date(startDate);
    let count = 0;
    
    // Pré-calcular limites para otimização
    const maxRepetitions = formData.recurrenceType === 'indeterminado' ? 52 : 
                          formData.recurrenceType === 'repeticoes' ? formData.repetitions : 
                          Number.MAX_SAFE_INTEGER;
    
    const endDate = formData.recurrenceType === 'data_final' && formData.endDate ? 
                   new Date(formData.endDate) : null;

    // Buscar o valor da modalidade
    const selectedModality = modalities.find(m => m.id === formData.modality_id);
    const modalityValue = selectedModality?.valor || 0;
    
    console.log('🔍 NewAppointmentModal - Valor da modalidade para agendamentos recorrentes:', {
      modalityId: formData.modality_id,
      modalityName: selectedModality?.name,
      modalityValue: modalityValue
    });

    // Criar template do agendamento para reutilização
    const appointmentTemplate = {
      client_id: formData.client_id,
      modality_id: formData.modality_id,
      valor_total: formData.isCortesia ? 0 : (formData.customValue !== null ? formData.customValue : modalityValue),
      is_cortesia: formData.isCortesia,
      status: 'agendado' as const,
      recurrence_id: recurrenceId,
      booking_source: 'manual' as const,
      user_id: userId
    };

    while (count < maxRepetitions) {
      // Verificar se deve parar baseado no tipo de recorrência
      if (endDate && currentDate > endDate) {
        break;
      }

      // Verificar se o dia está habilitado
      const isEnabled = isDayEnabled(currentDate);
      
      if (isEnabled) {
        appointments.push({
          ...appointmentTemplate,
          date: currentDate.toISOString()
        });
      }

      // Avançar para próxima semana
      currentDate.setDate(currentDate.getDate() + 7);
      count++;
    }

    return appointments;
  };

  const availableTimeSlots = getAvailableTimeSlots(formData.date);
  
  // Debug: verificar horários disponíveis
  console.log('🔍 NewAppointmentModal - Horários disponíveis:', {
    date: formData.date,
    selectedTime,
    availableTimeSlots,
    formDataTime: formData.time,
    formDataTimeType: typeof formData.time,
    formDataTimeLength: formData.time?.length
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente */}
          <ClientSearchDropdown
            clients={clients}
            selectedClientId={formData.client_id}
            onClientSelect={(clientId) => setFormData(prev => ({ ...prev, client_id: clientId }))}
            onAddNewClient={() => {
              setIsAddClientModalOpen(true);
            }}
            placeholder="Digite para buscar..."
          />

          {/* Modalidade */}
          <div>
            <Label htmlFor="modality">Modalidade *</Label>
            <Select
              value={formData.modality_id}
              onValueChange={(value) => {
                const selectedModality = modalities.find(m => m.id === value);
                setFormData(prev => ({ 
                  ...prev, 
                  modality_id: value,
                  customValue: null // Reset custom value when modality changes
                }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma modalidade" />
              </SelectTrigger>
              <SelectContent>
                {modalities.map((modality) => (
                  <SelectItem key={modality.id} value={modality.id}>
                    {modality.name} – R$ {modality.valor.toFixed(2).replace('.', ',')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor Personalizado */}
          {formData.modality_id && (
            <div>
              <Label htmlFor="customValue">Valor do Agendamento</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="customValue"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={(() => {
                    const selectedModality = modalities.find(m => m.id === formData.modality_id);
                    return selectedModality ? `Valor padrão: R$ ${selectedModality.valor.toFixed(2).replace('.', ',')}` : '';
                  })()}
                  value={formData.customValue !== null ? formData.customValue.toString() : ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '') {
                      setFormData(prev => ({ ...prev, customValue: null }));
                    } else {
                      const numValue = parseFloat(value);
                      if (!isNaN(numValue) && numValue >= 0) {
                        setFormData(prev => ({ ...prev, customValue: numValue }));
                      }
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const selectedModality = modalities.find(m => m.id === formData.modality_id);
                    if (selectedModality) {
                      setFormData(prev => ({ ...prev, customValue: selectedModality.valor }));
                    }
                  }}
                >
                  Usar Padrão
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Deixe em branco para usar o valor padrão da modalidade
              </p>
            </div>
          )}

          {/* Cortesia */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="cortesia"
              checked={formData.isCortesia}
              disabled={formData.customValue !== null}
              onCheckedChange={(checked) => {
                const newValue = checked as boolean;
                console.log('🔍 Checkbox cortesia alterado:', checked, 'Tipo:', typeof checked, 'Novo valor:', newValue);
                setFormData(prev => {
                  const updated = { ...prev, isCortesia: newValue };
                  console.log('🔍 FormData atualizado:', updated);
                  return updated;
                });
              }}
            />
            <Label htmlFor="cortesia" className="text-sm font-medium">
              Cortesia (valor R$ 0,00)
              {formData.customValue !== null && (
                <span className="text-xs text-muted-foreground block">
                  Desabilitado quando valor personalizado é definido
                </span>
              )}
            </Label>
          </div>

          {/* Data */}
          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              // min={format(new Date(), 'yyyy-MM-dd')} // Removido para permitir datas passadas
            />
          </div>

          {/* Horário */}
          <div>
            <Label htmlFor="time">Horário *</Label>
            <Select
              key={`time-select-${formData.time}-${selectedTime}`} // Força re-render quando valores mudam
              value={formData.time || selectedTime || ''}
              onValueChange={(value) => {
                console.log('🔍 NewAppointmentModal - Horário selecionado:', value);
                console.log('🔍 NewAppointmentModal - Valor atual do formData.time:', formData.time);
                console.log('🔍 NewAppointmentModal - Horários disponíveis:', availableTimeSlots);
                setFormData(prev => ({ ...prev, time: value }));
              }}
              disabled={!formData.date || availableTimeSlots.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.date 
                    ? "Selecione uma data primeiro" 
                    : availableTimeSlots.length === 0 
                      ? "Nenhum horário disponível" 
                      : (formData.time || selectedTime)
                        ? `Horário selecionado: ${formData.time || selectedTime}`
                        : "Selecione um horário"
                } />
              </SelectTrigger>
              <SelectContent>
                {availableTimeSlots.map((time) => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.date && availableTimeSlots.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                Nenhum horário disponível para esta data
              </p>
            )}
          </div>

          {/* Recorrência */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="recurring"
              checked={formData.isRecurring}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, isRecurring: checked as boolean }))
              }
            />
            <Label htmlFor="recurring">Agendamento recorrente</Label>
          </div>

          {formData.isRecurring && (
            <div className="space-y-4 pl-6 border-l-2 border-muted">
              <div>
                <Label>Tipo de recorrência</Label>
                <Select
                  value={formData.recurrenceType}
                  onValueChange={(value: 'data_final' | 'repeticoes' | 'indeterminado') => 
                    setFormData(prev => ({ ...prev, recurrenceType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data_final">Até uma data final</SelectItem>
                    <SelectItem value="repeticoes">Número de repetições</SelectItem>
                    <SelectItem value="indeterminado">Indeterminado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.recurrenceType === 'data_final' && (
                <div>
                  <Label htmlFor="endDate">Data final</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    min={formData.date}
                  />
                </div>
              )}

              {formData.recurrenceType === 'repeticoes' && (
                <div>
                  <Label htmlFor="repetitions">Número de repetições</Label>
                  <Input
                    id="repetitions"
                    type="number"
                    min="1"
                    max="52"
                    value={formData.repetitions}
                    onChange={(e) => setFormData(prev => ({ ...prev, repetitions: parseInt(e.target.value) }))}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
            <div>
              {onBlockTime && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBlockTime}
                  className="border-orange-200 text-orange-600 hover:bg-orange-50 w-full sm:w-auto"
                >
                  Bloquear Horário
                </Button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                {isLoading ? 'Criando...' : 'Criar Agendamento'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Modal para adicionar novo cliente */}
      <AddClientModal
        isOpen={isAddClientModalOpen}
        onClose={() => setIsAddClientModalOpen(false)}
        onClientAdded={() => {
          // Recarregar lista de clientes
          fetchClients();
        }}
      />
    </Dialog>
  );
};

export default NewAppointmentModal;
