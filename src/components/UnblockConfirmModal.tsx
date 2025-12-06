import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Calendar, Clock, Repeat } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface UnblockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedTime: string | null;
  isRecurring: boolean;
  onConfirm: (removeAllFollowing: boolean) => void;
}

const UnblockConfirmModal: React.FC<UnblockConfirmModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  isRecurring,
  onConfirm
}) => {
  const handleConfirm = (removeAllFollowing: boolean) => {
    onConfirm(removeAllFollowing);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Desbloquear Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do horário */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Data:</span>
                <span>{selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Horário:</span>
                <span>{selectedTime}</span>
              </div>
              {isRecurring && (
                <div className="flex items-center gap-2">
                  <Repeat className="h-4 w-4 text-orange-600" />
                  <span className="font-medium text-orange-700">Bloqueio Recorrente</span>
                </div>
              )}
            </div>
          </div>

          {/* Mensagem */}
          <div className="text-center">
            {isRecurring ? (
              <div className="space-y-3">
                <p className="text-gray-700">
                  Este é um bloqueio recorrente. O que você deseja fazer?
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => handleConfirm(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Desbloquear apenas este horário
                  </Button>
                  <Button
                    onClick={() => handleConfirm(true)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Desbloquear todos os horários seguintes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-gray-700">
                  Deseja desbloquear este horário?
                </p>
                <Button
                  onClick={() => handleConfirm(false)}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Confirmar
                </Button>
              </div>
            )}
          </div>

          {/* Botão Cancelar */}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnblockConfirmModal;
