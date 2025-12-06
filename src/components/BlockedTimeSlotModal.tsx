import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BlockedTimeSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onUnblock?: () => void;
  blockedDate: Date | null;
  blockedTimeSlot: string | null;
  blockadeReason?: string;
  canUnblock?: boolean;
}

export const BlockedTimeSlotModal = ({
  isOpen,
  onClose,
  onConfirm,
  onUnblock,
  blockedDate,
  blockedTimeSlot,
  blockadeReason = 'Horário bloqueado',
  canUnblock = false
}: BlockedTimeSlotModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnblock = async () => {
    if (onUnblock) {
      setIsLoading(true);
      try {
        await onUnblock();
        onClose();
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (!blockedDate || !blockedTimeSlot) return null;

  const getReasonMessage = () => {
    if (blockadeReason.includes('horário de funcionamento')) {
      return 'Este horário está fora do horário de funcionamento configurado.';
    }
    if (blockadeReason.includes('almoço') || blockedTimeSlot === '12:00') {
      return 'Este horário está bloqueado para o período de almoço.';
    }
    if (blockadeReason.includes('manual')) {
      return 'Este horário foi bloqueado manualmente.';
    }
    return 'Este horário não está disponível para agendamento.';
  };

  const getReasonIcon = () => {
    if (blockadeReason.includes('horário de funcionamento')) {
      return <Clock className="h-5 w-5 text-orange-500" />;
    }
    if (blockadeReason.includes('almoço') || blockedTimeSlot === '12:00') {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Horário Bloqueado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do horário */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <Calendar className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">
                  {format(blockedDate, 'dd/MM/yyyy', { locale: ptBR })}
                </p>
                <p className="text-sm text-orange-700">
                  {format(blockedDate, 'EEEE', { locale: ptBR })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-900">
                  {blockedTimeSlot}
                </p>
                <p className="text-sm text-orange-700">Horário selecionado</p>
              </div>
            </div>
          </div>

          {/* Motivo do bloqueio */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              {getReasonIcon()}
              <div>
                <p className="font-medium text-slate-900 mb-1">Motivo do bloqueio:</p>
                <p className="text-sm text-slate-600">
                  {getReasonMessage()}
                </p>
              </div>
            </div>
          </div>

          {/* Aviso */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 mb-1">Deseja mesmo agendar?</p>
                <p className="text-sm text-blue-700">
                  Você pode forçar o agendamento neste horário, mas isso pode causar conflitos 
                  com as configurações do sistema.
                </p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            {canUnblock && onUnblock && (
              <Button
                onClick={handleUnblock}
                disabled={isLoading}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                {isLoading ? 'Processando...' : 'Desbloquear'}
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? 'Processando...' : 'Forçar Agendamento'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
