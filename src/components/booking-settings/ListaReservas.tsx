import { motion } from 'framer-motion';
import { Calendar, Clock, User, Phone, CheckCircle, XCircle, Play, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Reserva {
  id: string;
  cliente: {
    nome: string;
    email: string;
    telefone: string;
  };
  modalidade: string;
  data: Date;
  horario: string;
  status: 'pendente' | 'confirmada' | 'cancelada' | 'realizada';
  valor: number;
}

interface ListaReservasProps {
  reservas: Reserva[];
  onCancelar: (id: string) => void;
  onConfirmar: (id: string) => void;
  onMarcarRealizada: (id: string) => void;
}

const ListaReservas = ({ reservas, onCancelar, onConfirmar, onMarcarRealizada }: ListaReservasProps) => {
  const reservasFuturas = reservas.filter(r => r.status !== 'cancelada' && r.status !== 'realizada');
  const reservasPendentes = reservas.filter(r => r.status === 'pendente').length;
  const reservasConfirmadas = reservas.filter(r => r.status === 'confirmada').length;

  const getStatusColor = (status: Reserva['status']) => {
    switch (status) {
      case 'pendente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'confirmada':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelada':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'realizada':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: Reserva['status']) => {
    switch (status) {
      case 'pendente':
        return <Clock className="w-4 h-4" />;
      case 'confirmada':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelada':
        return <XCircle className="w-4 h-4" />;
      case 'realizada':
        return <Play className="w-4 h-4" />;
      default:
        return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Reservas Futuras</h3>
            <p className="text-sm text-gray-600">
              Gerencie as próximas reservas do agendamento online
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{reservasFuturas.length}</div>
          <div className="text-sm text-gray-600">Futuras</div>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-lg font-bold text-yellow-600">{reservasPendentes}</div>
          <div className="text-xs text-yellow-700">Pendentes</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{reservasConfirmadas}</div>
          <div className="text-xs text-blue-700">Confirmadas</div>
        </div>
      </div>

      {/* Lista de Reservas */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {reservasFuturas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Nenhuma reserva futura encontrada</p>
          </div>
        ) : (
          reservasFuturas.map((reserva) => (
            <motion.div
              key={reserva.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-gray-200 hover:shadow-md transition-shadow"
            >
              {/* Header da Reserva */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold text-gray-800">{reserva.cliente.nome}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(reserva.status)}`}>
                  {getStatusIcon(reserva.status)}
                </span>
              </div>

              {/* Detalhes da Reserva */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{format(reserva.data, 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{reserva.horario} - {reserva.modalidade}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{reserva.cliente.telefone}</span>
                </div>
                <div className="text-sm font-medium text-gray-800">
                  R$ {reserva.valor}
                </div>
              </div>

              {/* Ações */}
              {reserva.status === 'pendente' && (
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => onConfirmar(reserva.id)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Confirmar
                  </motion.button>
                  <motion.button
                    onClick={() => onCancelar(reserva.id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancelar
                  </motion.button>
                </div>
              )}

              {reserva.status === 'confirmada' && (
                <div className="flex gap-2">
                  <motion.button
                    onClick={() => onMarcarRealizada(reserva.id)}
                    className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Marcar Realizada
                  </motion.button>
                  <motion.button
                    onClick={() => onCancelar(reserva.id)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Cancelar
                  </motion.button>
                </div>
              )}

              {reserva.status === 'realizada' && (
                <div className="text-center py-2 bg-green-50 rounded-lg">
                  <span className="text-sm text-green-700 font-medium">
                    ✅ Reserva Realizada
                  </span>
                </div>
              )}

              {reserva.status === 'cancelada' && (
                <div className="text-center py-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-red-700 font-medium">
                    ❌ Reserva Cancelada
                  </span>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <h4 className="font-semibold text-blue-800 mb-2">Gerenciamento de Reservas</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Pendentes:</strong> Aguardando confirmação</li>
          <li>• <strong>Confirmadas:</strong> Cliente confirmado</li>
          <li>• <strong>Realizadas:</strong> Atividade concluída</li>
          <li>• <strong>Canceladas:</strong> Reserva cancelada</li>
        </ul>
      </div>

      {/* Resumo */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {reservasFuturas.length} reservas futuras
          </span>
          <span>
            {reservasPendentes} pendentes
          </span>
        </div>
      </div>
    </div>
  );
};

export { ListaReservas };
