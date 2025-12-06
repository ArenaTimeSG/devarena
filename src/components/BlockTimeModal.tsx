import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Clock, Calendar, Repeat, CalendarX } from 'lucide-react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  selectedTime: string | null;
  onBlocked: (blockData: {
    reason: string;
    description?: string;
    isRecurring: boolean;
    endDate?: Date;
    isIndefinite?: boolean;
    recurrenceType?: 'daily' | 'weekly' | 'monthly';
  }) => void;
}

const BlockTimeModal: React.FC<BlockTimeModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onBlocked
}) => {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [endDateType, setEndDateType] = useState<'limit' | 'indefinite'>('limit');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState('');

  const handleSubmit = () => {
    if (!selectedDate || !selectedTime || !reason.trim()) {
      toast({ title: "Erro", description: "Preencha o motivo do bloqueio", variant: "destructive" });
      return;
    }

    if (isRecurring && endDateType === 'limit' && !customEndDate) {
      toast({ title: "Erro", description: "Selecione uma data limite", variant: "destructive" });
      return;
    }

    // Calcular data limite se necessário
    let calculatedEndDate: Date | undefined;
    if (isRecurring) {
      if (endDateType === 'limit') {
        calculatedEndDate = new Date(customEndDate);
      } else {
        calculatedEndDate = undefined; // Indefinido
      }
    }

    // Chamar a função de bloqueio com os dados completos
    onBlocked({
      reason: reason.trim(),
      description: description.trim() || undefined,
      isRecurring,
      endDate: calculatedEndDate,
      isIndefinite: endDateType === 'indefinite',
      recurrenceType: recurrenceType
    });
    
    toast({ title: "Sucesso", description: "Horário bloqueado com sucesso!" });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setReason('');
    setDescription('');
    setIsRecurring(false);
    setRecurrenceType('weekly');
    setEndDateType('limit');
    setEndDate(null);
    setCustomEndDate('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const getSuggestedEndDate = () => {
    if (!selectedDate) return '';
    
    const today = new Date();
    let suggestedDate: Date;
    
    switch (recurrenceType) {
      case 'daily':
        suggestedDate = addDays(today, 7); // 1 semana
        break;
      case 'weekly':
        suggestedDate = addWeeks(today, 4); // 1 mês
        break;
      case 'monthly':
        suggestedDate = addMonths(today, 3); // 3 meses
        break;
      default:
        suggestedDate = addWeeks(today, 4);
    }
    
    return suggestedDate.toISOString().split('T')[0];
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Bloquear Horário
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do horário selecionado */}
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
            </div>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason" className="text-sm font-medium">
                Motivo do Bloqueio *
              </Label>
              <Input
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: Manutenção, Evento, Feriado..."
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-sm font-medium">
                Descrição (opcional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes adicionais sobre o bloqueio..."
                className="mt-1"
                rows={3}
              />
            </div>

            {/* Opções de Recorrência */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(checked as boolean)}
                />
                <Label htmlFor="recurring" className="text-sm font-medium flex items-center gap-2">
                  <Repeat className="h-4 w-4" />
                  Bloqueio Recorrente
                </Label>
              </div>

              {isRecurring && (
                <div className="ml-6 space-y-4 border-l-2 border-orange-200 pl-4">
                  {/* Tipo de Recorrência */}
                  <div>
                    <Label className="text-sm font-medium">Repetir:</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="daily"
                          name="recurrenceType"
                          value="daily"
                          checked={recurrenceType === 'daily'}
                          onChange={(e) => setRecurrenceType(e.target.value as any)}
                          className="text-orange-600"
                        />
                        <Label htmlFor="daily" className="text-sm">Diariamente</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="weekly"
                          name="recurrenceType"
                          value="weekly"
                          checked={recurrenceType === 'weekly'}
                          onChange={(e) => setRecurrenceType(e.target.value as any)}
                          className="text-orange-600"
                        />
                        <Label htmlFor="weekly" className="text-sm">Semanalmente (mesmo dia da semana)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="monthly"
                          name="recurrenceType"
                          value="monthly"
                          checked={recurrenceType === 'monthly'}
                          onChange={(e) => setRecurrenceType(e.target.value as any)}
                          className="text-orange-600"
                        />
                        <Label htmlFor="monthly" className="text-sm">Mensalmente (mesmo dia do mês)</Label>
                      </div>
                    </div>
                  </div>

                  {/* Data Limite */}
                  <div>
                    <Label className="text-sm font-medium">Data Limite:</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="limit"
                          name="endDateType"
                          value="limit"
                          checked={endDateType === 'limit'}
                          onChange={(e) => setEndDateType(e.target.value as any)}
                          className="text-orange-600"
                        />
                        <Label htmlFor="limit" className="text-sm">Até uma data específica</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="indefinite"
                          name="endDateType"
                          value="indefinite"
                          checked={endDateType === 'indefinite'}
                          onChange={(e) => setEndDateType(e.target.value as any)}
                          className="text-orange-600"
                        />
                        <Label htmlFor="indefinite" className="text-sm flex items-center gap-1">
                          <CalendarX className="h-4 w-4" />
                          Indefinidamente
                        </Label>
                      </div>
                      
                      {endDateType === 'limit' && (
                        <div className="ml-6">
                          <Input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => setCustomEndDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            placeholder={getSuggestedEndDate()}
                            className="mt-1"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Sugestão: {getSuggestedEndDate()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isRecurring ? 'Bloquear Recorrentemente' : 'Bloquear Horário'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BlockTimeModal;
