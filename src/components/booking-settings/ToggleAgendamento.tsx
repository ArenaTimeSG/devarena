import { motion } from 'framer-motion';
import { Power, PowerOff, CheckCircle, AlertCircle } from 'lucide-react';

interface ToggleAgendamentoProps {
  ativo: boolean;
  onToggle: (ativo: boolean) => void;
}

const ToggleAgendamento = ({ ativo, onToggle }: ToggleAgendamentoProps) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            ativo ? 'bg-green-100' : 'bg-red-100'
          }`}>
            {ativo ? (
              <Power className="w-6 h-6 text-green-600" />
            ) : (
              <PowerOff className="w-6 h-6 text-red-600" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Status do Agendamento Online</h3>
            <p className="text-sm text-gray-600">
              {ativo ? 'Sistema ativo e disponível para clientes' : 'Sistema desativado'}
            </p>
          </div>
        </div>
        
        {/* Toggle Switch */}
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${
            ativo ? 'text-green-600' : 'text-red-600'
          }`}>
            {ativo ? 'Ativo' : 'Inativo'}
          </span>
          
          <motion.button
            onClick={() => onToggle(!ativo)}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ${
              ativo ? 'bg-green-500' : 'bg-gray-300'
            }`}
            whileTap={{ scale: 0.95 }}
          >
            <motion.div
              className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-md"
              animate={{
                x: ativo ? 32 : 4
              }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </motion.button>
        </div>
      </div>

      {/* Status Info */}
      <div className={`p-4 rounded-xl border ${
        ativo 
          ? 'bg-green-50 border-green-200' 
          : 'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start gap-3">
          {ativo ? (
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          )}
          <div>
            <h4 className={`font-semibold ${
              ativo ? 'text-green-800' : 'text-red-800'
            }`}>
              {ativo ? 'Sistema Funcionando' : 'Sistema Desativado'}
            </h4>
            <p className={`text-sm mt-1 ${
              ativo ? 'text-green-700' : 'text-red-700'
            }`}>
              {ativo 
                ? 'Os clientes podem acessar o link de agendamento e fazer reservas normalmente.'
                : 'Os clientes não conseguem acessar o sistema de agendamento. Ative para permitir reservas.'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Última alteração: {new Date().toLocaleDateString('pt-BR')}
          </div>
          
          <div className="flex gap-2">
            <motion.button
              onClick={() => onToggle(true)}
              disabled={ativo}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                ativo
                  ? 'bg-green-100 text-green-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              whileHover={!ativo ? { scale: 1.02 } : {}}
              whileTap={!ativo ? { scale: 0.98 } : {}}
            >
              Ativar
            </motion.button>
            
            <motion.button
              onClick={() => onToggle(false)}
              disabled={!ativo}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !ativo
                  ? 'bg-red-100 text-red-600 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
              whileHover={ativo ? { scale: 1.02 } : {}}
              whileTap={ativo ? { scale: 0.98 } : {}}
            >
              Desativar
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ToggleAgendamento };
