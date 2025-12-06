import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, CheckCircle, DollarSign, Calendar, User, AlertCircle, Clock, XCircle } from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  status: string;
  modality: string;
  valor_total: number;
  client: {
    name: string;
  };
}

interface EditPaymentStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  appointments: Appointment[];
  onStatusUpdated: () => void;
}

const statusOptions = [
  { value: 'a_cobrar', label: 'A Cobrar', icon: AlertCircle, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
  { value: 'pago', label: 'Pago', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { value: 'agendado', label: 'Agendado', icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { value: 'cancelado', label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
];

const EditPaymentStatusModal = ({
  isOpen,
  onClose,
  clientId,
  clientName,
  appointments,
  onStatusUpdated
}: EditPaymentStatusModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [appointmentStatuses, setAppointmentStatuses] = useState<Record<string, string>>({});

  // Inicializar status dos agendamentos
  useEffect(() => {
    if (isOpen && appointments) {
      const initialStatuses: Record<string, string> = {};
      const now = new Date();
      
      appointments.forEach(appointment => {
        const appointmentDate = new Date(appointment.date);
        
        // Se o agendamento é futuro e está marcado como "pago", deve ser "agendado"
        if (appointmentDate > now && appointment.status === 'pago') {
          initialStatuses[appointment.id] = 'agendado';
        } else {
          initialStatuses[appointment.id] = appointment.status;
        }
      });
      setAppointmentStatuses(initialStatuses);
    }
  }, [isOpen, appointments]);

  const handleStatusChange = (appointmentId: string, newStatus: string) => {
    setAppointmentStatuses(prev => ({
      ...prev,
      [appointmentId]: newStatus
    }));
  };

  const handleSave = async () => {
    setIsLoading(true);

    try {
      // Verificar se houve mudanças
      const hasChanges = appointments.some(appointment => 
        appointmentStatuses[appointment.id] !== appointment.status
      );

      if (!hasChanges) {
        toast({
          title: 'Nenhuma alteração',
          description: 'Nenhum status foi alterado.',
          variant: 'destructive',
        });
        return;
      }

      // Validar se algum agendamento futuro está sendo marcado como "pago"
      const now = new Date();
      const invalidChanges = appointments.filter(appointment => {
        const appointmentDate = new Date(appointment.date);
        const newStatus = appointmentStatuses[appointment.id];
        return appointmentDate > now && newStatus === 'pago' && newStatus !== appointment.status;
      });

      if (invalidChanges.length > 0) {
        toast({
          title: 'Erro de validação',
          description: 'Agendamentos futuros não podem ser marcados como "pago".',
          variant: 'destructive',
        });
        return;
      }

      // Atualizar agendamentos que mudaram de status
      const updates = appointments
        .filter(appointment => appointmentStatuses[appointment.id] !== appointment.status)
        .map(appointment => ({
          id: appointment.id,
          status: appointmentStatuses[appointment.id]
        }));

      // Fazer atualizações em lote
      for (const update of updates) {
        const { error } = await supabase
          .from('appointments')
          .update({ status: update.status })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast({
        title: 'Status atualizado!',
        description: `${updates.length} agendamentos tiveram seus status atualizados.`,
      });

      onStatusUpdated();
      onClose();
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar status',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/60">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl font-bold text-blue-800">
              <DollarSign className="h-6 w-6" />
              Editar Status de Pagamento - {clientName}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-blue-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Resumo do Cliente */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-5 w-5 text-slate-600" />
              <h3 className="font-semibold text-slate-800">{clientName}</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600">Total de Agendamentos:</span>
                <span className="font-semibold text-slate-800 ml-2">
                  {appointments.length}
                </span>
              </div>
              <div>
                <span className="text-slate-600">Valor Total:</span>
                <span className="font-semibold text-slate-800 ml-2">
                  {formatCurrency(appointments.reduce((sum, apt) => sum + apt.valor_total, 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Agendamentos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Agendamentos</h3>
            <div className="space-y-3">
              {appointments.map((appointment) => {
                const currentStatus = appointmentStatuses[appointment.id] || appointment.status;
                const statusInfo = getStatusInfo(currentStatus);
                const StatusIcon = statusInfo.icon;
                const appointmentDate = new Date(appointment.date);
                const isFuture = appointmentDate > new Date();

                return (
                  <div
                    key={appointment.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 ${
                      isFuture ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <Calendar className={`h-4 w-4 ${isFuture ? 'text-blue-500' : 'text-slate-500'}`} />
                        <span className="text-sm font-medium">
                          {format(appointmentDate, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                        {isFuture && (
                          <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                            Futuro
                          </Badge>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-slate-600">{appointment.modality}</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {formatCurrency(appointment.valor_total)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Status Atual */}
                      <Badge 
                        variant="outline" 
                        className={`${statusInfo.color} ${statusInfo.bgColor} ${statusInfo.borderColor}`}
                      >
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusInfo.label}
                      </Badge>

                      {/* Dropdown de Status */}
                      <select
                        value={currentStatus}
                        onChange={(e) => handleStatusChange(appointment.id, e.target.value)}
                        className="text-sm border border-slate-300 rounded px-2 py-1 bg-white"
                      >
                        {statusOptions.map((option) => {
                          // Desabilitar "Pago" para agendamentos futuros
                          const isDisabled = isFuture && option.value === 'pago';
                          return (
                            <option 
                              key={option.value} 
                              value={option.value}
                              disabled={isDisabled}
                              style={{ color: isDisabled ? '#999' : 'inherit' }}
                            >
                              {option.label} {isDisabled ? '(Não permitido para agendamentos futuros)' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resumo das Alterações */}
          {appointments.some(appointment => 
            appointmentStatuses[appointment.id] !== appointment.status
          ) && (
            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <h4 className="font-semibold text-yellow-800 mb-2">Alterações Pendentes</h4>
              <div className="space-y-1 text-sm">
                {appointments
                  .filter(appointment => appointmentStatuses[appointment.id] !== appointment.status)
                  .map((appointment) => {
                    const oldStatus = getStatusInfo(appointment.status);
                    const newStatus = getStatusInfo(appointmentStatuses[appointment.id]);
                    return (
                      <div key={appointment.id} className="flex items-center gap-2">
                        <span className="text-slate-600">
                          {format(new Date(appointment.date), 'dd/MM HH:mm', { locale: ptBR })}:
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {oldStatus.label}
                        </Badge>
                        <span className="text-slate-500">→</span>
                        <Badge variant="outline" className="text-xs">
                          {newStatus.label}
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </CardContent>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !appointments.some(appointment => 
              appointmentStatuses[appointment.id] !== appointment.status
            )}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default EditPaymentStatusModal;
