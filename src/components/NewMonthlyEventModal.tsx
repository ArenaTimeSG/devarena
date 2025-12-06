import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface NewMonthlyEventData {
  id: string;
  date: string; // yyyy-MM-dd
  clientName: string;
  phone?: string;
  amount: number;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  notes?: string;
  guests?: number;
  status: 'a_cobrar' | 'pago' | 'cancelado';
}

interface NewMonthlyEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date | null;
  onCreate: (data: NewMonthlyEventData) => void;
}

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const NewMonthlyEventModal: React.FC<NewMonthlyEventModalProps> = ({ isOpen, onClose, selectedDate, onCreate }) => {
  const dateKey = useMemo(() => (selectedDate ? toKey(selectedDate) : ''), [selectedDate]);
  const [clientName, setClientName] = useState('');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('22:00');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'a_cobrar' | 'pago' | 'cancelado'>('a_cobrar');
  const [guests, setGuests] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setClientName('');
      setPhone('');
      setAmount('');
      setStartTime('18:00');
      setEndTime('22:00');
      setNotes('');
      setStatus('a_cobrar');
      setGuests('');
    }
  }, [isOpen, dateKey]);

  if (!isOpen || !selectedDate) return null;

  const handleSave = () => {
    const normalized = (amount || '').replace(/\./g, '').replace(',', '.');
    const numeric = parseFloat(normalized || '0');
    onCreate({
      id: crypto.randomUUID(),
      date: dateKey,
      clientName: clientName.trim() || 'Cliente',
      phone: phone.trim() || undefined,
      amount: isNaN(numeric) ? 0 : Number(numeric.toFixed(2)),
      startTime,
      endTime,
      notes: notes.trim() || undefined,
      guests: guests ? Number(guests) : 0,
      status
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">Novo Evento • {dateKey}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-lg sm:text-xl">✕</button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-sm">Cliente</Label>
            <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Nome do cliente" />
          </div>
          <div>
            <Label className="text-sm">Telefone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+()-]/g,''))} placeholder="(11) 99999-9999" />
          </div>
          <div>
            <Label className="text-sm">Valor (R$)</Label>
            <Input value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g,''))} placeholder="0,00" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm">Início</Label>
              <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Fim</Label>
              <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-sm">Número de Convidados</Label>
            <Input value={guests} onChange={e => setGuests(e.target.value.replace(/[^0-9]/g,''))} placeholder="0" />
          </div>
          <div>
            <Label className="text-sm">Observações</Label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full min-h-[80px] text-sm border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              placeholder="Detalhes do evento"
            />
          </div>
          <div>
            <Label className="text-sm">Status</Label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as any)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              <option value="a_cobrar">A Cobrar</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="border-slate-200 w-full sm:w-auto">Cancelar</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">Salvar Evento</Button>
        </div>
      </div>
    </div>
  );
};

export default NewMonthlyEventModal;


