import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

export interface EventActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId?: string | null;
  currentStatus?: 'a_cobrar' | 'pago' | 'cancelado';
  onUpdateStatus: (status: 'a_cobrar' | 'pago' | 'cancelado') => Promise<void> | void;
  onDelete: () => Promise<void> | void;
  info?: {
    clientName: string;
    phone?: string;
    amount: number;
    startTime: string;
    endTime: string;
    notes?: string;
    guests?: number;
    eventDate?: string; // yyyy-MM-dd
  } | null;
  onSave?: (data: {
    clientName: string;
    phone?: string;
    amount: number;
    startTime: string;
    endTime: string;
    notes?: string;
    guests?: number;
    status: 'a_cobrar' | 'pago' | 'cancelado';
  }) => Promise<void> | void;
}

const EventActionsModal: React.FC<EventActionsModalProps> = ({ isOpen, onClose, eventId, currentStatus = 'a_cobrar', onUpdateStatus, onDelete, info, onSave }) => {
  const [status, setStatus] = useState<'a_cobrar' | 'pago' | 'cancelado'>(currentStatus);
  const [clientName, setClientName] = useState(info?.clientName || '');
  const [phone, setPhone] = useState(info?.phone || '');
  const [amount, setAmount] = useState<string>(info ? String(info.amount) : '');
  const [startTime, setStartTime] = useState(info?.startTime || '18:00');
  const [endTime, setEndTime] = useState(info?.endTime || '22:00');
  const [notes, setNotes] = useState(info?.notes || '');
  const [guests, setGuests] = useState<string>(info?.guests ? String(info.guests) : '');

  // Sync when open changes
  React.useEffect(() => {
    setStatus(currentStatus);
    setClientName(info?.clientName || '');
    setPhone(info?.phone || '');
    setAmount(info ? String(info.amount) : '');
    setStartTime(info?.startTime || '18:00');
    setEndTime(info?.endTime || '22:00');
    setNotes(info?.notes || '');
    setGuests(info?.guests ? String(info.guests) : '');
  }, [isOpen, currentStatus, info]);

  if (!isOpen || !eventId) return null;

  const normalizePhoneForWhatsApp = (raw?: string) => {
    let digits = (raw || '').toString().replace(/\D/g, '');
    if (!digits) return null;
    digits = digits.replace(/^0+/, '');
    // Se já começa com 55, manter
    if (digits.startsWith('55')) return digits;
    // Para números BR comuns (com DDD, com/sem 9), garantir prefixo 55
    if (digits.length >= 10 && digits.length <= 12) {
      return '55' + digits;
    }
    return digits;
  };

  const normalizeLocalDate = (iso?: string) => {
    if (!iso) return null;
    try {
      const [y, m, d] = iso.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    } catch {
      return null;
    }
  };

  const buildWhatsAppLink = () => {
    const phoneDigits = normalizePhoneForWhatsApp(phone);
    if (!phoneDigits) return null;

    // Observacao: alguns emojis podem falhar no wa.me. Manteremos apenas os mais seguros.
    const dateLabel = (() => {
      const raw = info?.eventDate;
      const d = normalizeLocalDate(raw || '');
      if (!d) return '[DATA]';
      return format(d, 'dd/MM/yyyy');
    })();
    const mensagem = [
      'Lembrete \uD83D\uDCE2', // 📢 em unicode
      '',
      `Olá, ${clientName || 'Cliente'}!`,
      '',
      'Este é o lembrete da sua reserva do Salão de Festas \uD83C\uDF89', // 🎉
      '',
      `📅 Data: ${dateLabel}`,
      `📍 Local: [LOCAL]`,
      '',
      'Por favor, confirme sua presença:',
      '✅ Confirmo',
      '❌ Preciso cancelar/alterar',
      '',
      'Agradecemos a confirmação!'
    ].join('\n');

    return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(mensagem)}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-800">Ações do Evento</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 text-lg sm:text-xl">✕</button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Cliente</label>
                <input className="w-full text-sm border border-slate-200 rounded-lg p-2"
                       value={clientName} onChange={e => setClientName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Telefone</label>
                <input className="w-full text-sm border border-slate-200 rounded-lg p-2"
                       value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9+()-]/g,''))} placeholder="(11) 99999-9999" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Valor (R$)</label>
                <input className="w-full text-sm border border-slate-200 rounded-lg p-2"
                       value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.,]/g,''))} />
              </div>
              <div>
                <label className="text-sm">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value as any)} className="w-full text-sm border border-slate-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                  <option value="a_cobrar">A Cobrar</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm">Início</label>
                <input type="time" className="w-full text-sm border border-slate-200 rounded-lg p-2" value={startTime} onChange={e => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className="text-sm">Fim</label>
                <input type="time" className="w-full text-sm border border-slate-200 rounded-lg p-2" value={endTime} onChange={e => setEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm">Convidados</label>
              <input className="w-full text-sm border border-slate-200 rounded-lg p-2" value={guests} onChange={e => setGuests(e.target.value.replace(/[^0-9]/g,''))} />
            </div>
            <div>
              <label className="text-sm">Observações</label>
              <textarea className="w-full text-sm border border-slate-200 rounded-lg p-2 min-h-[80px]"
                        value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
          </div>
        </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 mt-6">
          <Button variant="destructive" onClick={() => onDelete()} className="bg-red-600 hover:bg-red-700 w-full sm:w-auto">Excluir</Button>
          <div className="flex flex-col sm:flex-row gap-3">
            {(() => {
              const disabled = !normalizePhoneForWhatsApp(phone);
              const href = buildWhatsAppLink() || '#';
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => { if (disabled) e.preventDefault(); }}
                  title={disabled ? 'Preencha o telefone para enviar no WhatsApp' : 'Abrir conversa no WhatsApp'}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md text-white w-full sm:w-auto ${disabled ? 'bg-green-400 cursor-not-allowed opacity-60' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              );
            })()}
            <Button variant="outline" onClick={onClose} className="border-slate-200 w-full sm:w-auto">Cancelar</Button>
            <Button onClick={async () => {
              // Se onSave existir, salva dados completos; caso contrário, apenas o status
              if (onSave) {
                const normalized = (amount || '').replace(/\./g,'').replace(',', '.');
                const num = parseFloat(normalized || '0');
                await onSave({
                  clientName: clientName.trim(),
                  phone: phone.trim() || undefined,
                  amount: isNaN(num) ? 0 : Number(num.toFixed(2)),
                  startTime,
                  endTime,
                  notes: notes.trim() || undefined,
                  guests: guests ? Number(guests) : 0,
                  status
                });
              } else {
                await onUpdateStatus(status);
              }
              onClose();
            }} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">Salvar</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventActionsModal;


