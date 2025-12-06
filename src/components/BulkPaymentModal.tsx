import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertCircle, Loader2, CreditCard, DollarSign, ArrowLeft, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentData {
  id: string;
  date: string;
  status: string;
  modality: string;
  valor_total: number;
  client: {
    name: string;
  };
}

interface BulkPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  appointments: AppointmentData[];
  onStatusUpdated: () => void;
}

const BulkPaymentModal = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  appointments,
  onStatusUpdated
}: BulkPaymentModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Filtrar agendamentos "a_cobrar" e "pago" para permitir ambas as operações
  const appointmentsToPay = appointments.filter(apt => apt.status === 'a_cobrar');
  const appointmentsToUnpay = appointments.filter(apt => apt.status === 'pago');

  // Inicializar seleção quando modal abrir
  useEffect(() => {
    if (isOpen) {
      if (appointmentsToPay.length > 0) {
        // Por padrão, selecionar todos os agendamentos "a_cobrar"
        const allIds = appointmentsToPay.map(apt => apt.id);
        console.log('🔄 BulkPayment - Modal aberto, agendamentos a cobrar:', appointmentsToPay);
        console.log('🔄 BulkPayment - IDs dos agendamentos:', allIds);
        setSelectedAppointments(allIds);
        setSelectAll(true);
      } else if (appointmentsToUnpay.length > 0) {
        // Se não há "a_cobrar", selecionar todos os "pago"
        const allIds = appointmentsToUnpay.map(apt => apt.id);
        console.log('🔄 BulkPayment - Modal aberto, agendamentos pagos:', appointmentsToUnpay);
        console.log('🔄 BulkPayment - IDs dos agendamentos pagos:', allIds);
        setSelectedAppointments(allIds);
        setSelectAll(true);
      } else {
        setSelectedAppointments([]);
        setSelectAll(false);
      }
    } else {
      setSelectedAppointments([]);
      setSelectAll(false);
    }
  }, [isOpen, appointments.length]); // Usar appointments.length em vez de appointmentsToPay

  // Atualizar selectAll quando seleção individual mudar
  useEffect(() => {
    const totalAppointments = appointmentsToPay.length + appointmentsToUnpay.length;
    setSelectAll(selectedAppointments.length === totalAppointments && totalAppointments > 0);
  }, [selectedAppointments, appointmentsToPay.length, appointmentsToUnpay.length]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = [...appointmentsToPay.map(apt => apt.id), ...appointmentsToUnpay.map(apt => apt.id)];
      setSelectedAppointments(allIds);
    } else {
      setSelectedAppointments([]);
    }
    setSelectAll(checked);
  };

  const handleSelectAppointment = (appointmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedAppointments(prev => [...prev, appointmentId]);
    } else {
      setSelectedAppointments(prev => prev.filter(id => id !== appointmentId));
    }
  };

  const handleBulkPayment = useCallback(async () => {
    if (selectedAppointments.length === 0) {
      toast({
        title: 'Nenhum agendamento selecionado',
        description: 'Selecione pelo menos um agendamento para processar.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 BulkPayment - Iniciando atualização de pagamentos');
      console.log('🔄 BulkPayment - IDs selecionados:', selectedAppointments);
      
      // Determinar qual operação fazer baseado nos agendamentos selecionados
      const selectedToPay = selectedAppointments.filter(id => 
        appointmentsToPay.some(apt => apt.id === id)
      );
      const selectedToUnpay = selectedAppointments.filter(id => 
        appointmentsToUnpay.some(apt => apt.id === id)
      );

      let successCount = 0;
      
      // Processar agendamentos "a_cobrar" -> "pago"
      for (const appointmentId of selectedToPay) {
        console.log('🔄 BulkPayment - Marcando como pago:', appointmentId);
        
        const { data, error } = await supabase
          .from('appointments')
          .update({ 
            status: 'pago',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId)
          .select();

        if (error) {
          console.error('❌ BulkPayment - Erro ao marcar como pago', appointmentId, ':', error);
          throw error;
        }

        console.log('✅ BulkPayment - Marcado como pago:', data);
        successCount++;
      }

      // Processar agendamentos "pago" -> "a_cobrar"
      for (const appointmentId of selectedToUnpay) {
        console.log('🔄 BulkPayment - Marcando como a cobrar:', appointmentId);
        
        const { data, error } = await supabase
          .from('appointments')
          .update({ 
            status: 'a_cobrar',
            updated_at: new Date().toISOString()
          })
          .eq('id', appointmentId)
          .select();

        if (error) {
          console.error('❌ BulkPayment - Erro ao marcar como a cobrar', appointmentId, ':', error);
          throw error;
        }

        console.log('✅ BulkPayment - Marcado como a cobrar:', data);
        successCount++;
      }

      console.log('✅ BulkPayment - Todos os agendamentos atualizados com sucesso:', successCount);

      const payCount = selectedToPay.length;
      const unpayCount = selectedToUnpay.length;
      
      let message = '';
      if (payCount > 0 && unpayCount > 0) {
        message = `${payCount} marcado(s) como pago(s) e ${unpayCount} marcado(s) como a cobrar.`;
      } else if (payCount > 0) {
        message = `${payCount} agendamento(s) marcado(s) como pago(s).`;
      } else {
        message = `${unpayCount} agendamento(s) marcado(s) como a cobrar.`;
      }

      toast({
        title: 'Status atualizado!',
        description: message,
      });

      // Aguardar um pouco para garantir que o banco processou a atualização
      setTimeout(() => {
        onStatusUpdated();
        onClose();
        
        // Forçar recarregamento da página como último recurso
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }, 500);
    } catch (error: any) {
      console.error('❌ BulkPayment - Erro completo:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao processar pagamentos';
      toast({
        title: 'Erro ao processar pagamentos',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedAppointments, appointmentsToPay, appointmentsToUnpay, onStatusUpdated, onClose, toast]);

  const totalValue = selectedAppointments.reduce((total, appointmentId) => {
    const appointment = [...appointmentsToPay, ...appointmentsToUnpay].find(apt => apt.id === appointmentId);
    return total + (appointment?.valor_total || 0);
  }, 0);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <CreditCard className="h-6 w-6 text-green-600" />
            Pagamento em Massa - {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {appointmentsToPay.length === 0 && appointmentsToUnpay.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-20 w-20 mx-auto text-slate-300 mb-6" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">Nenhum agendamento para processar</h3>
              <p className="text-slate-500 max-w-sm mx-auto">
                Este cliente não possui agendamentos com status "a cobrar" ou "pago" no momento.
              </p>
            </div>
          ) : (
            <>
              {/* Header com seleção em massa */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="select-all"
                      checked={selectAll}
                      onCheckedChange={handleSelectAll}
                      className="h-5 w-5"
                    />
                    <div>
                      <label
                        htmlFor="select-all"
                        className="text-base font-semibold text-blue-900 cursor-pointer"
                      >
                        Selecionar todos os agendamentos
                      </label>
                      <p className="text-sm text-blue-600">
                        {appointmentsToPay.length + appointmentsToUnpay.length} agendamento(s) disponível(is)
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900">
                      R$ {totalValue.toFixed(2).replace('.', ',')}
                    </p>
                    <p className="text-sm text-blue-600">Valor total selecionado</p>
                  </div>
                </div>
              </div>

              {/* Seção de agendamentos a cobrar */}
              {appointmentsToPay.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-orange-200">
                    <div className="h-3 w-3 bg-orange-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-orange-800">
                      Agendamentos A Cobrar ({appointmentsToPay.length})
                    </h3>
                    <div className="flex items-center space-x-1 text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-xs font-medium">Serão marcados como Pago</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {appointmentsToPay.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center space-x-4 p-4 bg-white border-2 border-orange-200 rounded-xl hover:border-orange-300 hover:shadow-md transition-all duration-200"
                      >
                        <Checkbox
                          id={appointment.id}
                          checked={selectedAppointments.includes(appointment.id)}
                          onCheckedChange={(checked) => 
                            handleSelectAppointment(appointment.id, checked as boolean)
                          }
                          className="h-5 w-5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="text-base font-semibold text-slate-900">
                                    {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })} às{' '}
                                    {format(new Date(appointment.date), 'HH:mm', { locale: ptBR })}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {appointment.modality}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">
                                R$ {appointment.valor_total.toFixed(2).replace('.', ',')}
                              </p>
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                A Cobrar
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seção de agendamentos pagos */}
              {appointmentsToUnpay.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-green-200">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <h3 className="text-lg font-semibold text-green-800">
                      Agendamentos Pagos ({appointmentsToUnpay.length})
                    </h3>
                    <div className="flex items-center space-x-1 text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                      <ArrowLeft className="h-3 w-3" />
                      <span className="text-xs font-medium">Serão marcados como A Cobrar</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {appointmentsToUnpay.map((appointment) => (
                      <div
                        key={appointment.id}
                        className="flex items-center space-x-4 p-4 bg-white border-2 border-green-200 rounded-xl hover:border-green-300 hover:shadow-md transition-all duration-200"
                      >
                        <Checkbox
                          id={appointment.id}
                          checked={selectedAppointments.includes(appointment.id)}
                          onCheckedChange={(checked) => 
                            handleSelectAppointment(appointment.id, checked as boolean)
                          }
                          className="h-5 w-5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center space-x-3">
                                <div>
                                  <p className="text-base font-semibold text-slate-900">
                                    {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })} às{' '}
                                    {format(new Date(appointment.date), 'HH:mm', { locale: ptBR })}
                                  </p>
                                  <p className="text-sm text-slate-600">
                                    {appointment.modality}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-slate-900">
                                R$ {appointment.valor_total.toFixed(2).replace('.', ',')}
                              </p>
                              <Badge className="bg-green-100 text-green-800 border-green-200">
                                Pago
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo das ações */}
              {selectedAppointments.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                  <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Resumo das Ações
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 font-medium">Total selecionado:</span>
                      <span className="text-xl font-bold text-blue-900">
                        {selectedAppointments.length} agendamento(s)
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {selectedAppointments.filter(id => appointmentsToPay.some(apt => apt.id === id)).length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-green-100 rounded-lg border border-green-200">
                          <div className="flex items-center space-x-2">
                            <ArrowRight className="h-4 w-4 text-green-600" />
                            <span className="text-green-800 font-medium">Marcar como Pago</span>
                          </div>
                          <span className="text-green-900 font-bold">
                            {selectedAppointments.filter(id => appointmentsToPay.some(apt => apt.id === id)).length} agendamento(s)
                          </span>
                        </div>
                      )}
                      
                      {selectedAppointments.filter(id => appointmentsToUnpay.some(apt => apt.id === id)).length > 0 && (
                        <div className="flex items-center justify-between p-3 bg-orange-100 rounded-lg border border-orange-200">
                          <div className="flex items-center space-x-2">
                            <ArrowLeft className="h-4 w-4 text-orange-600" />
                            <span className="text-orange-800 font-medium">Marcar como A Cobrar</span>
                          </div>
                          <span className="text-orange-900 font-bold">
                            {selectedAppointments.filter(id => appointmentsToUnpay.some(apt => apt.id === id)).length} agendamento(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Botões de ação */}
              <div className="flex gap-4 pt-2">
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 h-12 text-base font-medium"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleBulkPayment}
                  disabled={isLoading || selectedAppointments.length === 0}
                  className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-semibold shadow-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Confirmar Alterações ({selectedAppointments.length})
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkPaymentModal;