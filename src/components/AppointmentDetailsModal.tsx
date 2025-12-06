import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, DollarSign, X, Calendar, User, Activity, Loader2, AlertCircle, MessageCircle } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { useAppointments, AppointmentWithModality } from '@/hooks/useAppointments';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentWithModality | null;
  onAppointmentUpdated: () => void;
}

const AppointmentDetailsModal = ({ 
  isOpen, 
  onClose, 
  appointment, 
  onAppointmentUpdated 
}: AppointmentDetailsModalProps) => {
  const { toast } = useToast();
  const { deleteAppointment } = useAppointments();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [showSingleDeleteDialog, setShowSingleDeleteDialog] = useState(false);
  const [showRecurrenceDeleteDialog, setShowRecurrenceDeleteDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug apenas em desenvolvimento
  const isDevelopment = import.meta.env.DEV;
  
  useEffect(() => {
    if (isDevelopment) {
      console.log('🔍 AppointmentDetailsModal - Debug Info:', {
        isOpen,
        appointment: appointment ? {
          id: appointment.id,
          date: appointment.date,
          status: appointment.status,
          modality: appointment.modality,
          clientName: appointment.client?.name,
          recurrence_id: appointment.recurrence_id
        } : null,
        recurrence_id: appointment?.recurrence_id,
        hasRecurrence: !!appointment?.recurrence_id,
        appointmentId: appointment?.id,
        showSingleDeleteDialog,
        showRecurrenceDeleteDialog
      });
    }
  }, [isOpen, appointment, isDevelopment, showSingleDeleteDialog, showRecurrenceDeleteDialog]);

  // Limpar estados quando o modal fecha
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsFetching(false);
      setShowSingleDeleteDialog(false);
      setShowRecurrenceDeleteDialog(false);
    }
  }, [isOpen]);

  // Funções auxiliares
  const getStatusColor = (status: string, paymentStatus?: string, is_cortesia?: boolean) => {
    // Se o agendamento tem payment_status 'pending', mostrar como aguardando pagamento
    if (paymentStatus === 'pending') {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    
    // Se o agendamento tem payment_status 'failed', mostrar como pagamento falhou
    if (paymentStatus === 'failed') {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    
    // Se for cortesia (independente do status), sempre mostrar como cortesia
    if (is_cortesia) {
      return 'bg-pink-100 text-pink-800 border-pink-200';
    }
    
    // Status normal baseado no status principal
    switch (status) {
      case 'pago': return 'bg-green-100 text-green-800 border-green-200';
      case 'a_cobrar': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'cortesia': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'agendado': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelado': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string, paymentStatus?: string, is_cortesia?: boolean) => {
    // Se o agendamento tem payment_status 'pending', mostrar como aguardando pagamento
    if (paymentStatus === 'pending') {
      return 'Aguardando Pagamento';
    }
    
    // Se o agendamento tem payment_status 'failed', mostrar como pagamento falhou
    if (paymentStatus === 'failed') {
      return 'Pagamento Falhou';
    }
    
    // Status normal baseado no status principal
    switch (status) {
      case 'pago': return 'Pago';
      case 'a_cobrar': return 'A Cobrar';
      case 'cortesia': return '🎁 Cortesia';
      case 'agendado': return is_cortesia ? '🎁 Cortesia' : 'Agendado';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  // Monta link do WhatsApp com mensagem de confirmação
  const buildWhatsAppLink = () => {
    const phoneRaw = appointment?.client?.phone as any;
    let digits = (phoneRaw || '').toString().replace(/\D/g, '');
    if (!digits) return null;

    // Normalização para WhatsApp: precisa ter código do país.
    // Se não vier com 55, assumimos BR e adicionamos.
    if (digits.startsWith('0')) {
      digits = digits.replace(/^0+/, '');
    }
    if (!digits.startsWith('55')) {
      // Se parece DDD+numero (10 ou 11 dígitos), prefixa 55
      if (digits.length === 10 || digits.length === 11) {
        digits = '55' + digits;
      }
    }

    const nome = appointment?.client?.name || 'Cliente';
    const data = appointment?.date ? format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR }) : '';
    const horario = appointment?.date ? format(new Date(appointment.date), "HH:mm", { locale: ptBR }) : '';
    const modalidade = (appointment as any)?.modality_info?.name || (appointment as any)?.modality || '';

    // Fallback 100% compatível com WhatsApp Web/API (sem emojis e sem acentos)
    const mensagemPlain = [
      `Ola, ${nome}!`,
      `Lembrete do seu agendamento:`,
      modalidade ? `Atividade: ${modalidade}` : null,
      `Data: ${data}`,
      `Horario: ${horario}`,
      `Local: [NOME DO GINASIO/ARENA]`,
      ``,
      `Por favor, confirme sua presenca respondendo:`,
      `[1] Confirmo`,
      `[2] Nao poderei comparecer`,
      ``,
      `Agradecemos a confirmacao!`,
    ].filter(Boolean).join('\n');

    const encoded = encodeURIComponent(mensagemPlain);
    return `https://wa.me/${digits}?text=${encoded}`;
  };

  // Hooks useCallback - devem vir antes de qualquer lógica condicional
  const handleStatusChange = useCallback(async (newStatus: 'pago' | 'cancelado') => {
    if (!appointment?.id) {
      toast({
        title: 'Erro',
        description: 'ID do agendamento não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `Agendamento marcado como ${getStatusLabel(newStatus, undefined, appointment.is_cortesia)}.`,
      });

      // Aguardar um pouco para garantir que a atualização foi processada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onAppointmentUpdated();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido ao atualizar status';
      setError(errorMessage);
      toast({
        title: 'Erro ao atualizar status',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [appointment?.id, onAppointmentUpdated, onClose, toast]);

  const handleDeleteSingle = useCallback(async () => {
    console.log('🚀 handleDeleteSingle chamada!');
    console.log('📋 Appointment ID:', appointment?.id);
    
    if (!appointment?.id) {
      console.log('❌ Appointment ID não encontrado');
      toast({
        title: 'Erro',
        description: 'ID do agendamento não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await deleteAppointment(appointment.id);

      // Aguardar um pouco para garantir que a exclusão foi processada
      await new Promise(resolve => setTimeout(resolve, 100));
      
      onAppointmentUpdated();
      onClose();
      setShowSingleDeleteDialog(false);
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido ao excluir agendamento';
      setError(errorMessage);
      toast({
        title: 'Erro ao excluir agendamento',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [appointment?.id, onAppointmentUpdated, onClose, toast, deleteAppointment]);

  const handleDeleteRecurrence = useCallback(async () => {
    if (!appointment?.recurrence_id) {
      toast({
        title: 'Erro ao excluir recorrência',
        description: 'ID de recorrência não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    if (isDevelopment) {
      console.log('🗑️ handleDeleteRecurrence - Iniciando exclusão de recorrência:', {
        recurrence_id: appointment.recurrence_id,
        appointment_id: appointment.id,
        appointment_date: appointment.date
      });
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Primeiro, verificar quantos agendamentos existem a partir da data selecionada (preserva passados)
      const { data: appointmentsToDelete, error: countError } = await supabase
        .from('appointments')
        .select('id, date, client_id, modality, status')
        .eq('recurrence_id', appointment.recurrence_id)
        .gte('date', appointment.date)
        .order('date', { ascending: true });

      if (countError) throw countError;

      if (isDevelopment) {
        console.log('📊 handleDeleteRecurrence - Agendamentos encontrados:', {
          count: appointmentsToDelete?.length || 0,
          recurrence_id: appointment.recurrence_id,
          appointments: appointmentsToDelete?.map(apt => ({
            id: apt.id,
            date: apt.date,
            modality: apt.modality,
            status: apt.status
          }))
        });
      }

      if (!appointmentsToDelete || appointmentsToDelete.length === 0) {
        if (isDevelopment) {
          console.warn('⚠️ handleDeleteRecurrence - Nenhum agendamento encontrado para este recurrence_id');
        }
        toast({
          title: 'Aviso',
          description: 'Nenhum agendamento encontrado para esta recorrência.',
          variant: 'destructive',
        });
        return;
      }

      // Deletar somente a partir do horário selecionado (>= appointment.date)
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('recurrence_id', appointment.recurrence_id)
        .gte('date', appointment.date);

      if (error) throw error;

      if (isDevelopment) {
        console.log('✅ handleDeleteRecurrence - Exclusão concluída com sucesso', {
          recurrence_id: appointment.recurrence_id,
          deleted_count: appointmentsToDelete.length,
          deleted_appointments: appointmentsToDelete.map(apt => apt.id)
        });
      }

      toast({
        title: 'Recorrência excluída!',
        description: `${appointmentsToDelete.length} ocorrência(s) a partir do horário selecionado foram excluídas. As passadas foram preservadas.`,
      });

      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['appointments', user?.id] });
      
      onAppointmentUpdated();
      setShowRecurrenceDeleteDialog(false);
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido ao excluir recorrência';
      setError(errorMessage);
      
      if (isDevelopment) {
        console.error('❌ handleDeleteRecurrence - Erro:', error);
      }
      
      toast({
        title: 'Erro ao excluir recorrência',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [appointment?.recurrence_id, appointment?.id, appointment?.date, onAppointmentUpdated, onClose, toast, isDevelopment, queryClient, user?.id]);

  // Renderizar conteúdo principal - sempre renderizar o Dialog, mas controlar visibilidade com open
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Detalhes do Agendamento
            </DialogTitle>
          </DialogHeader>
          
          {/* Loading state */}
          {isFetching && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando detalhes...</p>
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div className="text-center">
                <h3 className="text-sm font-medium text-red-600">Erro ao carregar dados</h3>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setError(null)}>
                Tentar Novamente
              </Button>
            </div>
          )}

          {/* Fallback para appointment nulo/indefinido */}
          {!isFetching && !error && (!appointment || !appointment.id) && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground">
                  Agendamento não encontrado
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Os detalhes do agendamento não estão disponíveis.
                </p>
              </div>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
            </div>
          )}

          {/* Fallback para dados incompletos */}
          {(() => {
            const shouldShowIncomplete = !isFetching && !error && appointment && appointment.id && (!appointment.client?.name || !appointment.date);
            if (isDevelopment) {
              console.log('🔍 Condição dados incompletos:', {
                isFetching,
                error,
                hasAppointment: !!appointment,
                hasAppointmentId: !!appointment?.id,
                hasClientName: !!appointment?.client?.name,
                hasDate: !!appointment?.date,
                shouldShowIncomplete
              });
            }
            return shouldShowIncomplete;
          })() && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground">
                  Dados incompletos
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Algumas informações do agendamento estão faltando.
                </p>
                {!appointment.client?.name && (
                  <p className="text-xs text-red-500 mt-2">
                    ⚠️ Cliente não identificado
                  </p>
                )}
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    console.log('🗑️ Botão Excluir clicado!');
                    console.log('📋 Appointment ID:', appointment?.id);
                    console.log('🔍 Estado atual showSingleDeleteDialog:', showSingleDeleteDialog);
                    setShowSingleDeleteDialog(true);
                    console.log('🔍 Estado após setShowSingleDeleteDialog(true)');
                    
                    // Teste: forçar re-render
                    setTimeout(() => {
                      console.log('🔍 Estado após 100ms:', showSingleDeleteDialog);
                    }, 100);
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir Agendamento
                </Button>
                <Button variant="outline" onClick={onClose}>
                  Fechar
                </Button>
              </div>
            </div>
          )}

          {/* Main content - apenas se não estiver carregando, não houver erro e appointment for válido */}
          {!isFetching && !error && appointment && appointment.id && appointment.client?.name && appointment.date && (
            <div className="space-y-6">
              {/* Informações do Cliente */}
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">{appointment.client?.name || 'Cliente não identificado'}</p>
                  <p className="text-sm text-muted-foreground">Cliente</p>
                </div>
              </div>

              {/* Informações do Agendamento */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {appointment.modality_info ? 
                        `${appointment.modality_info.name} – ${formatCurrency(appointment.valor_total)}` :
                        appointment.modality || 'Modalidade não definida'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">Modalidade</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground">Data</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {(() => {
                        const startTime = appointment.date;
                        const endTime = appointment.end_time || (() => {
                          const start = new Date(startTime);
                          start.setHours(start.getHours() + 1);
                          return start.toISOString();
                        })();
                        return `${format(new Date(startTime), 'HH:mm', { locale: ptBR })} → ${format(new Date(endTime), 'HH:mm', { locale: ptBR })}`;
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">Horário</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(appointment.status, appointment.payment_status, appointment.is_cortesia)}>
                    {getStatusLabel(appointment.status, appointment.payment_status, appointment.is_cortesia)}
                  </Badge>
                  <p className="text-sm text-muted-foreground">Status atual</p>
                </div>
              </div>

              {/* Ações */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="font-medium">Ações</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => handleStatusChange('pago')}
                    disabled={isLoading || appointment.status === 'pago'}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DollarSign className="h-4 w-4" />
                    )}
                    Marcar como Pago
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => handleStatusChange('a_cobrar')}
                    disabled={isLoading || appointment.status === 'a_cobrar'}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    Marcar como A Cobrar
                  </Button>

                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                    onClick={() => handleStatusChange('cancelado')}
                    disabled={isLoading || appointment.status === 'cancelado'}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                    Marcar como Cancelado
                  </Button>
                </div>

                {/* Botões de Exclusão */}
                <div className="space-y-3">
                  <Button
                    variant="destructive"
                    className="w-full flex items-center gap-2"
                    disabled={isLoading}
                    onClick={() => setShowSingleDeleteDialog(true)}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    Excluir este agendamento
                  </Button>

                  {/* Debug apenas em desenvolvimento */}
                  {isDevelopment && appointment.recurrence_id && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      🔍 Debug: recurrence_id = {appointment.recurrence_id}
                      <br />
                      📅 Data do agendamento: {format(new Date(appointment.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      <br />
                      🎯 Tipo: Recorrência (indeterminada ou com prazo)
                    </div>
                  )}

                  {appointment.recurrence_id && (
                    <Button
                      variant="destructive"
                      className="w-full flex items-center gap-2 bg-red-700 hover:bg-red-800"
                      disabled={isLoading}
                      onClick={() => {
                        if (isDevelopment) {
                          console.log('🔘 Botão "Excluir toda a recorrência" clicado');
                        }
                        setShowRecurrenceDeleteDialog(true);
                      }}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      Excluir toda a recorrência
                    </Button>
                  )}
                </div>


              </div>
            </div>
          )}

          <DialogFooter>
            {appointment?.client && (appointment.client as any).phone && (
              <a
                href={buildWhatsAppLink() || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </a>
            )}
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogos de Confirmação - Fora do Dialog principal */}
      <AlertDialog 
        open={showSingleDeleteDialog} 
        onOpenChange={(open) => {
          console.log('🔔 Dialog state changed:', open);
          setShowSingleDeleteDialog(open);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este agendamento?
              {appointment?.recurrence_id && (
                <span className="block mt-2 text-sm text-amber-600">
                  ⚠️ Este agendamento faz parte de uma recorrência. Apenas este agendamento será excluído.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSingle}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Excluindo...' : 'Excluir Agendamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog 
        open={showRecurrenceDeleteDialog} 
        onOpenChange={setShowRecurrenceDeleteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar exclusão de recorrência
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir TODA a recorrência? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={isLoading}
              onClick={() => {
                if (isDevelopment) {
                  console.log('🔘 Botão "Cancelar" clicado no diálogo de recorrência');
                }
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecurrence}
              className="bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'Excluindo...' : 'Excluir Toda Recorrência'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentDetailsModal;
