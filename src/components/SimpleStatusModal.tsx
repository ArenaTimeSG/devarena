import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface Appointment {
  id: string;
  date: string;
  status: string;
  modality: string;
  valor_total: number;
}

interface SimpleStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  appointments: Appointment[];
  onStatusUpdated: () => void;
}

const SimpleStatusModal = ({
  isOpen,
  onClose,
  clientName,
  appointments,
  onStatusUpdated
}: SimpleStatusModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // EXATAMENTE igual ao AppointmentDetailsModal
  const handleStatusChange = useCallback(async (appointmentId: string, newStatus: 'pago' | 'a_cobrar') => {
    if (!appointmentId) {
      toast({
        title: 'Erro',
        description: 'ID do agendamento não encontrado.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `Agendamento marcado como ${newStatus === 'pago' ? 'Pago' : 'A Cobrar'}.`,
      });

      onStatusUpdated();
      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || 'Erro desconhecido ao atualizar status';
      toast({
        title: 'Erro ao atualizar status',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [onStatusUpdated, onClose, toast]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Alterar Status - {clientName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div>
                <div className="font-medium">
                  {format(new Date(appointment.date), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </div>
                <div className="text-sm text-gray-600">
                  {appointment.modality} - R$ {appointment.valor_total.toFixed(2)}
                </div>
                <div className="text-sm">
                  Status: <span className="font-medium">{appointment.status}</span>
                </div>
              </div>

              <div className="flex gap-2">
                {appointment.status === 'a_cobrar' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(appointment.id, 'pago')}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    Pago
                  </Button>
                )}
                
                {appointment.status === 'pago' && (
                  <Button
                    size="sm"
                    onClick={() => handleStatusChange(appointment.id, 'a_cobrar')}
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    A Cobrar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleStatusModal;