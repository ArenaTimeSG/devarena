import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, X, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeBlockades } from '@/hooks/useTimeBlockades';
import { TimeBlockade, CreateTimeBlockadeData, UpdateTimeBlockadeData, BLOCKADE_REASONS } from '@/types/settings';
import { cn } from '@/lib/utils';

interface TimeBlockadeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedTime?: string;
  blockade?: TimeBlockade | null;
  mode: 'create' | 'edit';
}

export default function TimeBlockadeModal({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  blockade,
  mode
}: TimeBlockadeModalProps) {
  const { createBlockade, updateBlockade, isCreating, isUpdating } = useTimeBlockades();
  
  const [date, setDate] = useState<Date | undefined>(selectedDate);
  const [timeSlot, setTimeSlot] = useState<string>(selectedTime || '18:00');
  const [reason, setReason] = useState<string>('manutencao');
  const [customReason, setCustomReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or mode changes
  useEffect(() => {
    if (isOpen) {
             if (mode === 'create') {
         setDate(selectedDate);
         setTimeSlot(selectedTime || '18:00');
         setReason('manutencao');
         setCustomReason('');
         setDescription('');
       } else if (mode === 'edit' && blockade) {
        setDate(new Date(blockade.date));
        setTimeSlot(blockade.time_slot);
        setReason(blockade.reason);
        setCustomReason('');
        setDescription(blockade.description || '');
      }
      setErrors({});
    }
  }, [isOpen, mode, blockade, selectedDate, selectedTime]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!date || date === undefined) {
      newErrors.date = 'Data é obrigatória';
    }

    if (!timeSlot || timeSlot === '') {
      newErrors.timeSlot = 'Horário é obrigatório';
    }

    if (!reason || reason === '') {
      newErrors.reason = 'Motivo é obrigatório';
    }

    if (reason === 'outro' && !customReason.trim()) {
      newErrors.customReason = 'Descrição do motivo é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !date || !timeSlot || !reason) {
      return;
    }

    const finalReason = reason === 'outro' ? customReason : reason;
    const formattedDate = format(date, 'yyyy-MM-dd');

    try {
      if (mode === 'create') {
        const blockadeData: CreateTimeBlockadeData = {
          date: formattedDate,
          time_slot: timeSlot,
          reason: finalReason,
          description: description.trim() || undefined
        };
        await createBlockade(blockadeData);
      } else if (mode === 'edit' && blockade) {
        const updateData: UpdateTimeBlockadeData = {
          reason: finalReason,
          description: description.trim() || undefined
        };
        await updateBlockade({ id: blockade.id, data: updateData });
      }

      handleClose();
    } catch (error) {
      console.error('Erro ao salvar bloqueio:', error);
    }
  };

  const handleClose = () => {
    setDate(undefined);
    setTimeSlot('18:00');
    setReason('manutencao');
    setCustomReason('');
    setDescription('');
    setErrors({});
    onClose();
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {mode === 'create' ? 'Bloquear Horário' : 'Editar Bloqueio'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  locale={ptBR}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date}</p>
            )}
          </div>

          {/* Horário */}
          <div className="space-y-2">
            <Label htmlFor="timeSlot">Horário</Label>
                         <Select value={timeSlot || '18:00'} onValueChange={setTimeSlot}>
               <SelectTrigger>
                 <SelectValue placeholder="Selecione um horário" defaultValue="18:00" />
               </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {slot}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.timeSlot && (
              <p className="text-sm text-red-500">{errors.timeSlot}</p>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo do Bloqueio</Label>
            <Select value={reason || 'manutencao'} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um motivo" defaultValue="manutencao" />
              </SelectTrigger>
              <SelectContent>
                {BLOCKADE_REASONS.map((reasonOption) => (
                  <SelectItem key={reasonOption.value} value={reasonOption.value}>
                    {reasonOption.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && (
              <p className="text-sm text-red-500">{errors.reason}</p>
            )}
          </div>

          {/* Motivo Customizado */}
          {reason === 'outro' && (
            <div className="space-y-2">
              <Label htmlFor="customReason">Descrição do Motivo</Label>
              <Input
                id="customReason"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Descreva o motivo do bloqueio..."
                maxLength={100}
              />
              {errors.customReason && (
                <p className="text-sm text-red-500">{errors.customReason}</p>
              )}
            </div>
          )}

          {/* Descrição Opcional */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (Opcional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Adicione detalhes sobre o bloqueio..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 caracteres
            </p>
          </div>

          {/* Resumo */}
          {date && timeSlot && reason && reason !== '' && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <h4 className="font-medium text-orange-800 mb-2">Resumo do Bloqueio</h4>
              <div className="space-y-1 text-sm text-orange-700">
                <p><strong>Data:</strong> {format(date, 'dd/MM/yyyy', { locale: ptBR })}</p>
                <p><strong>Horário:</strong> {timeSlot}</p>
                <p><strong>Motivo:</strong> {reason === 'outro' ? customReason : BLOCKADE_REASONS.find(r => r.value === reason)?.label}</p>
                {description && <p><strong>Descrição:</strong> {description}</p>}
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating || isUpdating}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isCreating || isUpdating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isCreating || isUpdating ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {mode === 'create' ? 'Bloquear Horário' : 'Atualizar Bloqueio'}
                </div>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
