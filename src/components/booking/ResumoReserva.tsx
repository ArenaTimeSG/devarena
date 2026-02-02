import { motion } from 'framer-motion';
import { Calendar, User, Mail, Phone, DollarSign, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Modalidade {
  id: string;
  name: string;
  duracao: number;
  valor: number;
  descricao: string;
  cor: string;
}

interface Cliente {
  nome: string;
  email: string;
  telefone: string;
}

interface Reserva {
  modalidade: Modalidade | null;
  data: Date | null;
  horario: string | null;
  cliente: Cliente;
}

interface ResumoReservaProps {
  reserva: Reserva;
  onConfirmar: () => void;
  isCreating?: boolean;
  autoConfirmada?: boolean;
}

const ResumoReserva = ({ 
  reserva, 
  onConfirmar, 
  isCreating = false,
  autoConfirmada = false
}: ResumoReservaProps) => {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Resumo da Reserva */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          Resumo da Reserva
        </h3>
        
        {/* Detalhes da reserva */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
            <div className={`w-12 h-12 ${reserva.modalidade?.cor} rounded-full flex items-center justify-center`}>
              <span className="text-white font-bold text-lg">{reserva.modalidade?.name.charAt(0)}</span>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Modalidade</p>
              <p className="font-bold text-gray-800 text-lg">{reserva.modalidade?.name}</p>
              <p className="text-sm text-gray-600">{reserva.modalidade?.descricao}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Data e Horário</p>
              <p className="font-bold text-gray-800 text-lg">
                {reserva.data && format(reserva.data, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
              </p>
              <p className="text-sm text-gray-600">às {reserva.horario} ({reserva.modalidade?.duracao} minutos)</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">Valor da Reserva</p>
              <p className="font-bold text-gray-800 text-2xl">R$ {reserva.modalidade?.valor}</p>
              <p className="text-sm text-gray-600">Pagamento no local</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Seus Dados
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <User className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Nome</p>
              <p className="font-semibold text-gray-800">{reserva.cliente.nome}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">E-mail</p>
              <p className="font-semibold text-gray-800">{reserva.cliente.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-sm text-gray-500">Telefone</p>
              <p className="font-semibold text-gray-800">{reserva.cliente.telefone}</p>
            </div>
          </div>
        </div>
      </div>



      {/* Botões de Confirmação */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <motion.button
          onClick={onConfirmar}
          disabled={isCreating}
          whileHover={{ scale: isCreating ? 1 : 1.02 }}
          whileTap={{ scale: isCreating ? 1 : 0.98 }}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-lg
                   focus:outline-none focus:ring-2 focus:ring-offset-2
                   transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2
                   ${isCreating 
                     ? 'bg-gray-400 text-white cursor-not-allowed' 
                     : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
                   }`}
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              {autoConfirmada ? 'Confirmar Reserva' : 'Solicitar Reserva'}
            </>
          )}
        </motion.button>
        
        <p className="text-center text-sm text-gray-500 mt-4">
          {autoConfirmada 
            ? 'Sua reserva será confirmada automaticamente'
            : 'Sua solicitação será enviada para aprovação'
          }
        </p>
      </div>
    </div>
  );
};

export default ResumoReserva;
