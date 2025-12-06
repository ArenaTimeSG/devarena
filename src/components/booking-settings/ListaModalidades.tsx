import { motion } from 'framer-motion';
import { Users, Clock, DollarSign, ToggleLeft, Settings, Eye, EyeOff } from 'lucide-react';

interface Modalidade {
  id: string;
  name: string;
  duracao: number;
  valor: number;
  descricao: string;
  cor: string;
  ativa: boolean;
}

interface ListaModalidadesProps {
  modalidades: Modalidade[];
  onToggleModalidade: (id: string, ativa: boolean) => void;
}

const ListaModalidades = ({ modalidades, onToggleModalidade }: ListaModalidadesProps) => {
  const modalidadesAtivas = modalidades.filter(m => m.ativa).length;
  const modalidadesInativas = modalidades.filter(m => !m.ativa).length;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Users className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Modalidades Disponíveis</h3>
            <p className="text-sm text-gray-600">
              Gerencie quais modalidades estão disponíveis para agendamento
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-800">{modalidadesAtivas}</div>
          <div className="text-sm text-gray-600">Ativas</div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-lg font-bold text-green-600">{modalidadesAtivas}</div>
          <div className="text-xs text-green-700">Ativas</div>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-lg font-bold text-red-600">{modalidadesInativas}</div>
          <div className="text-xs text-red-700">Inativas</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-lg font-bold text-blue-600">{modalidades.length}</div>
          <div className="text-xs text-blue-700">Total</div>
        </div>
      </div>

      {/* Lista de Modalidades */}
      <div className="space-y-4">
        {modalidades.map((modalidade) => (
          <motion.div
            key={modalidade.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-xl border transition-all ${
              modalidade.ativa 
                ? 'bg-white border-green-200 shadow-sm' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Ícone da Modalidade */}
                <div className={`w-12 h-12 ${modalidade.cor} rounded-xl flex items-center justify-center`}>
                  <span className="text-white font-bold text-lg">{modalidade.name.charAt(0)}</span>
                </div>
                
                {/* Informações da Modalidade */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-semibold ${
                      modalidade.ativa ? 'text-gray-800' : 'text-gray-500'
                    }`}>
                      {modalidade.name}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      modalidade.ativa 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {modalidade.ativa ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  
                  <p className={`text-sm ${
                    modalidade.ativa ? 'text-gray-600' : 'text-gray-400'
                  }`}>
                    {modalidade.descricao}
                  </p>
                  
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>{modalidade.duracao} min</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <DollarSign className="w-3 h-3" />
                      <span>R$ {modalidade.valor}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Toggle Switch */}
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${
                  modalidade.ativa ? 'text-green-600' : 'text-red-600'
                }`}>
                  {modalidade.ativa ? 'Disponível' : 'Indisponível'}
                </span>
                
                <motion.button
                  onClick={() => onToggleModalidade(modalidade.id, !modalidade.ativa)}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${
                    modalidade.ativa ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md"
                    animate={{
                      x: modalidade.ativa ? 28 : 4
                    }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>
            </div>
            
            {/* Status Info */}
            {!modalidade.ativa && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-700">
                    Esta modalidade não aparece para clientes no agendamento online
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 p-4 bg-blue-50 rounded-xl">
        <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Gerenciamento de Modalidades
        </h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• <strong>Modalidades ativas:</strong> Aparecem para clientes no agendamento</li>
          <li>• <strong>Modalidades inativas:</strong> Ficam ocultas dos clientes</li>
          <li>• As alterações são aplicadas imediatamente</li>
          <li>• Para editar valores e durações, use o módulo de Modalidades</li>
        </ul>
      </div>

      {/* Resumo */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {modalidadesAtivas} de {modalidades.length} modalidades ativas
          </span>
          <span>
            {Math.round((modalidadesAtivas / modalidades.length) * 100)}% disponível
          </span>
        </div>
      </div>
    </div>
  );
};

export default ListaModalidades;
