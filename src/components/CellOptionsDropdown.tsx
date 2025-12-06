import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useWorkingHours } from '@/hooks/useWorkingHours';

interface CellOptionsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number } | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  onCreateAppointment: () => void;
}

const CellOptionsDropdown: React.FC<CellOptionsDropdownProps> = ({
  isOpen,
  onClose,
  position,
  selectedDate,
  selectedTime,
  onCreateAppointment
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { blockTimeSlot } = useWorkingHours();
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateAppointment = () => {
    onClose();
    onCreateAppointment();
  };

  const handleBlockTime = () => {
    onClose();
    setShowBlockModal(true);
  };

  const handleSubmitBlock = async () => {
    if (!user?.id || !selectedDate || !selectedTime || !reason.trim()) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Usar o sistema de bloqueio do useWorkingHours
      await blockTimeSlot(selectedDate, selectedTime, reason.trim(), {
        description: description.trim() || undefined
      });

      // Limpar formulário
      setReason('');
      setDescription('');
      setShowBlockModal(false);

    } catch (error) {
      console.error('Erro ao bloquear horário:', error);
      toast({
        title: "Erro",
        description: "Erro ao bloquear horário. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseBlockModal = () => {
    setReason('');
    setDescription('');
    setShowBlockModal(false);
  };

  if (!isOpen || !position || !selectedDate || !selectedTime) return null;

  return (
    <>
      {/* Dropdown de opções */}
      <AnimatePresence>
        <motion.div
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 min-w-[200px]"
          style={{
            left: position.x,
            top: position.y,
          }}
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
        >
          {/* Informações do horário */}
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 rounded-t-lg">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Calendar className="h-4 w-4" />
              <span>{format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{selectedTime}</span>
            </div>
          </div>

          {/* Opções */}
          <div className="py-2">
            <button
              onClick={handleCreateAppointment}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-3"
            >
              <Plus className="h-4 w-4" />
              Criar Agendamento
            </button>
            
            <button
              onClick={handleBlockTime}
              className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-3"
            >
              <AlertTriangle className="h-4 w-4" />
              Bloquear Horário
            </button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de bloqueio */}
      <Dialog open={showBlockModal} onOpenChange={handleCloseBlockModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Bloquear Horário
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações do horário */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4" />
                <span>
                  {format(selectedDate, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
                </span>
                <span className="font-medium">às {selectedTime}</span>
              </div>
            </div>

            {/* Motivo do bloqueio */}
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo do bloqueio *</Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Manutenção, Evento, Feriado..."
                maxLength={100}
              />
            </div>

            {/* Descrição adicional */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre o bloqueio..."
                rows={3}
                maxLength={500}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseBlockModal}
                disabled={isLoading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmitBlock}
                disabled={isLoading || !reason.trim()}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {isLoading ? 'Bloqueando...' : 'Bloquear Horário'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CellOptionsDropdown;
