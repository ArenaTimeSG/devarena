import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, isBefore, isEqual, addHours } from 'date-fns';
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
import { useSelectedCourt } from '@/hooks/useSelectedCourt';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ClientSearchDropdown } from '@/components/ClientSearchDropdown';
import { AddClientModal } from '@/components/AddClientModal';
import { validateAppointmentTime, appointmentsOverlap } from '@/utils/appointmentPosition';

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
  const { selectedCourtId } = useSelectedCourt();
  const { createAppointment } = useAppointments({ courtId: selectedCourtId });
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    modality_id: '',
    date: '',
    start_time: '', // Horário de início (HH:mm)
    end_time: '', // Horário de fim (HH:mm)
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
      
      // Converter horário selecionado (HH:mm) para start_time e calcular end_time (+1h)
      const startTime = selectedTime || '08:00';
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(selectedDate);
      startDate.setHours(hours, minutes || 0, 0, 0);
      const endDate = addHours(startDate, 1);
      
      // Atualizar formData com os dados selecionados
      const newFormData = {
        client_id: '',
        modality_id: '',
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: startTime, // Horário de início selecionado
        end_time: format(endDate, 'HH:mm'), // Horário de fim (início + 1h por padrão)
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
        start_time: '',
        end_time: '',
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.date || !formData.start_time || !formData.end_time || !formData.modality_id) {
      toast({
        title: 'Erro no agendamento',
        description: 'Todos os campos obrigatórios devem ser preenchidos',
        variant: 'destructive',
      });
      return;
    }
    
    // Validar horários
    const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
    const endDateTime = new Date(`${formData.date}T${formData.end_time}`);
    
    const validation = validateAppointmentTime(startDateTime, endDateTime);
    if (!validation.isValid) {
      toast({
        title: 'Erro no agendamento',
        description: validation.errorMessage || 'Horários inválidos',
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
      const startDateTime = new Date(`${formData.date}T${formData.start_time}`);
      const endDateTime = new Date(`${formData.date}T${formData.end_time}`);
      
      // Verificar se o dia está habilitado (pular se for agendamento forçado)
      if (!forceAppointment && !isDayEnabled(startDateTime)) {
        toast({
          title: 'Erro no agendamento',
          description: 'Este dia não está disponível para agendamento',
          variant: 'destructive',
        });
        return;
      }

      // Obter o usuário atual primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar conflitos de agendamento (sobreposição de intervalos)
      const dayStart = new Date(formData.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(formData.date);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Buscar todos os agendamentos do dia para verificar sobreposições
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id, date, end_time')
        .eq('user_id', user.id)
        .gte('date', dayStart.toISOString())
        .lte('date', dayEnd.toISOString());

      if (checkError) throw checkError;

      // Verificar sobreposição com agendamentos existentes
      if (existingAppointments && existingAppointments.length > 0) {
        const hasOverlap = existingAppointments.some(apt => {
          const existingStart = new Date(apt.date);
          const existingEnd = new Date(apt.end_time);
          return appointmentsOverlap(startDateTime, endDateTime, existingStart, existingEnd);
        });

        if (hasOverlap) {
          toast({
            title: 'Erro no agendamento',
            description: 'Este horário conflita com um agendamento existente. Por favor, escolha outro horário.',
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
        const appointments = generateRecurringAppointments(formData, startDateTime, endDateTime, recurrenceData.id, user.id, selectedCourtId);
        
        console.log('🔍 NewAppointmentModal - Criando agendamentos recorrentes:', {
          total: appointments.length,
          recurrenceId: recurrenceData.id,
          appointments: appointments.map(a => ({ 
            date: a.date, 
            end_time: a.end_time, 
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
          court_id: selectedCourtId || null,
          client_id: formData.client_id,
          modality_id: formData.modality_id,
          date: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
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
        start_time: '',
        end_time: '',
        isRecurring: false,
        recurrenceType: 'data_final',
        endDate: '',
        repetitions: 1,
        isCortesia: false,
        customValue: null
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
  const generateRecurringAppointments = (
    formData: any, 
    startDateTime: Date, 
    endDateTime: Date,
    recurrenceId: string, 
    userId: string,
    courtId?: string | null
  ) => {
    const appointments = [];
    let currentDate = new Date(startDateTime);
    let count = 0;
    
    // Calcular duração do agendamento
    const durationMs = endDateTime.getTime() - startDateTime.getTime();
    
    // Pré-calcular limites para otimização
    const maxRepetitions = formData.recurrenceType === 'indeterminado' ? 52 : 
                          formData.recurrenceType === 'repeticoes' ? formData.repetitions : 
                          Number.MAX_SAFE_INTEGER;
    
    const recurrenceEndDate = formData.recurrenceType === 'data_final' && formData.endDate ? 
                   new Date(formData.endDate) : null;

    // Buscar o valor da modalidade
    const selectedModality = modalities.find(m => m.id === formData.modality_id);
    const modalityValue = selectedModality?.valor || 0;
    
    // Calcular valor proporcional baseado na duração (usar durationMs já calculado acima)
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    let calculatedValue = modalityValue;
    
    // Se a duração for diferente de 60 minutos e não houver valor customizado, calcular proporcional
    if (!formData.isCortesia && formData.customValue === null && durationMinutes !== 60) {
      calculatedValue = (modalityValue / 60) * durationMinutes;
    }
    
    console.log('🔍 NewAppointmentModal - Valor da modalidade para agendamentos recorrentes:', {
      modalityId: formData.modality_id,
      modalityName: selectedModality?.name,
      modalityValue: modalityValue,
      durationMinutes: durationMinutes,
      calculatedValue: calculatedValue
    });

    // Criar template do agendamento para reutilização
    const appointmentTemplate = {
      client_id: formData.client_id,
      modality_id: formData.modality_id,
      valor_total: formData.isCortesia ? 0 : (formData.customValue !== null ? formData.customValue : calculatedValue),
      is_cortesia: formData.isCortesia,
      status: 'agendado' as const,
      recurrence_id: recurrenceId,
      booking_source: 'manual' as const,
      user_id: userId,
      court_id: courtId || null
    };

    while (count < maxRepetitions) {
      // Verificar se deve parar baseado no tipo de recorrência
      if (recurrenceEndDate && currentDate > recurrenceEndDate) {
        break;
      }

      // Verificar se o dia está habilitado
      const isEnabled = isDayEnabled(currentDate);
      
      if (isEnabled) {
        // Criar horário de início para esta ocorrência
        const occurrenceStart = new Date(currentDate);
        occurrenceStart.setHours(startDateTime.getHours(), startDateTime.getMinutes(), 0, 0);
        
        // Calcular horário de término mantendo a mesma duração
        const occurrenceEnd = new Date(occurrenceStart.getTime() + durationMs);
        
        appointments.push({
          ...appointmentTemplate,
          date: occurrenceStart.toISOString(),
          end_time: occurrenceEnd.toISOString()
        });
      }

      // Avançar para próxima semana
      currentDate.setDate(currentDate.getDate() + 7);
      count++;
    }

    return appointments;
  };


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

          {/* Horários - Início e Fim */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Horário de Início *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => {
                  const newStartTime = e.target.value;
                  setFormData(prev => {
                    // Se end_time não estiver definido ou for anterior ao novo start_time, ajustar end_time
                    let newEndTime = prev.end_time;
                    if (!newEndTime || newEndTime <= newStartTime) {
                      const [hours, minutes] = newStartTime.split(':').map(Number);
                      const startDate = new Date(`${prev.date || '2000-01-01'}T${newStartTime}`);
                      const endDate = addHours(startDate, 1);
                      newEndTime = format(endDate, 'HH:mm');
                    }
                    return { ...prev, start_time: newStartTime, end_time: newEndTime };
                  });
                }}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">Horário de Término *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                min={formData.start_time || undefined}
                onChange={(e) => {
                  const newEndTime = e.target.value;
                  // Validar que end_time > start_time
                  if (formData.start_time && newEndTime <= formData.start_time) {
                    toast({
                      title: 'Horário inválido',
                      description: 'O horário de término deve ser posterior ao horário de início',
                      variant: 'destructive',
                    });
                    return;
                  }
                  setFormData(prev => ({ ...prev, end_time: newEndTime }));
                }}
                required
              />
            </div>
          </div>
          {formData.start_time && formData.end_time && formData.end_time <= formData.start_time && (
            <p className="text-sm text-red-500">
              O horário de término deve ser posterior ao horário de início
            </p>
          )}

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
