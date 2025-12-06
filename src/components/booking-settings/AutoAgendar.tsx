import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface AutoAgendarProps {
  ativo: boolean;
  onToggle: (ativo: boolean) => void;
}

const AutoAgendar = ({ ativo, onToggle }: AutoAgendarProps) => {
  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async () => {
    setIsToggling(true);
    
    // Simular delay de processamento
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onToggle(!ativo);
    setIsToggling(false);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
          <Zap className="w-6 h-6 text-yellow-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Auto-Agendar</h3>
          <p className="text-sm text-gray-600">
            Configurar confirmação automática de reservas online
          </p>
        </div>
      </div>

      {/* Status Atual */}
      <div className={`p-4 rounded-xl border mb-6 ${
        ativo 
          ? 'bg-green-50 border-green-200' 
          : 'bg-orange-50 border-orange-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {ativo ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-orange-600" />
            )}
            <div>
              <span className={`text-sm font-medium ${
                ativo ? 'text-green-800' : 'text-orange-800'
              }`}>
                {ativo ? 'Auto-Agendar Ativo' : 'Auto-Agendar Inativo'}
              </span>
              <p className={`text-xs ${
                ativo ? 'text-green-600' : 'text-orange-600'
              }`}>
                {ativo 
                  ? 'Reservas são confirmadas automaticamente' 
                  : 'Reservas precisam de aprovação manual'
                }
              </p>
            </div>
          </div>
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            ativo 
              ? 'bg-green-200 text-green-800' 
              : 'bg-orange-200 text-orange-800'
          }`}>
            {ativo ? 'Automático' : 'Manual'}
          </span>
        </div>
      </div>

      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              {ativo ? 'Confirmação Automática' : 'Aprovação Manual'}
            </span>
          </div>
        </div>
        
        <motion.button
          onClick={handleToggle}
          disabled={isToggling}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 ${
            ativo ? 'bg-green-600' : 'bg-gray-300'
          } ${isToggling ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          whileTap={{ scale: 0.95 }}
        >
          <motion.span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              ativo ? 'translate-x-6' : 'translate-x-1'
            }`}
            animate={isToggling ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.2 }}
          />
        </motion.button>
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
            <span className="text-xs font-bold text-blue-600">i</span>
          </div>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Como funciona:</p>
            <ul className="space-y-1 text-xs">
              {ativo ? (
                <>
                  <li>• Reservas online são confirmadas instantaneamente</li>
                  <li>• Clientes recebem confirmação imediata</li>
                  <li>• Não há necessidade de aprovação manual</li>
                </>
              ) : (
                <>
                  <li>• Reservas online ficam como "pendentes"</li>
                  <li>• Administrador deve aprovar manualmente</li>
                  <li>• Clientes recebem notificação após aprovação</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Estatísticas Simuladas */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-800">
            {ativo ? '98%' : '85%'}
          </div>
          <div className="text-xs text-gray-600">
            Taxa de Confirmação
          </div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="text-lg font-bold text-gray-800">
            {ativo ? '< 1min' : '~2h'}
          </div>
          <div className="text-xs text-gray-600">
            Tempo de Resposta
          </div>
        </div>
      </div>
    </div>
  );
};

export { AutoAgendar };
