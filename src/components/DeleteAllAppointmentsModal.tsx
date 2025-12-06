import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DeleteAllAppointmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAppointmentsDeleted: () => void;
}

const DeleteAllAppointmentsModal = ({ 
  isOpen, 
  onClose, 
  onAppointmentsDeleted 
}: DeleteAllAppointmentsModalProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [appointmentCount, setAppointmentCount] = useState(0);

  // Buscar quantidade de agendamentos quando modal abrir
  useEffect(() => {
    if (isOpen) {
      fetchAppointmentCount();
    }
  }, [isOpen]);

  const fetchAppointmentCount = async () => {
    try {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      setAppointmentCount(count || 0);
    } catch (error: any) {
      console.error('Erro ao buscar quantidade de agendamentos:', error);
    }
  };

  const handleDeleteAll = async () => {
    if (confirmationText !== 'EXCLUIR TODOS') {
      toast({
        title: 'Confirmação incorreta',
        description: 'Digite exatamente "EXCLUIR TODOS" para confirmar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Excluir todos os agendamentos
      const { error } = await supabase
        .from('appointments')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Excluir todos exceto um ID impossível

      if (error) throw error;

      toast({
        title: 'Agendamentos excluídos!',
        description: `Todos os ${appointmentCount} agendamentos foram excluídos com sucesso.`,
      });

      onAppointmentsDeleted();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir agendamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setConfirmationText('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Excluir Todos os Agendamentos
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Atenção!</span>
            </div>
            <p className="text-red-700 mt-2">
              Esta ação irá excluir <strong>permanentemente</strong> todos os {appointmentCount} agendamentos do sistema.
              Esta operação não pode ser desfeita.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Para confirmar, digite <strong>EXCLUIR TODOS</strong>:
            </Label>
            <Input
              id="confirmation"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="EXCLUIR TODOS"
              className="font-mono"
            />
          </div>

          <div className="text-sm text-muted-foreground">
            <p>Esta ação irá:</p>
            <ul className="list-disc list-inside mt-1 space-y-1">
              <li>Excluir todos os agendamentos individuais</li>
              <li>Excluir todos os agendamentos recorrentes</li>
              <li>Manter os clientes e recorrências (apenas os agendamentos serão excluídos)</li>
              <li>Limpar todas as estatísticas financeiras relacionadas</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button 
            type="button" 
            variant="destructive" 
            onClick={handleDeleteAll}
            disabled={isLoading || confirmationText !== 'EXCLUIR TODOS'}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {isLoading ? 'Excluindo...' : 'Excluir Todos os Agendamentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAllAppointmentsModal;
