import { motion } from 'framer-motion';
import { Clock, DollarSign } from 'lucide-react';

interface Modalidade {
  id: string;
  name: string;
  duracao: number;
  valor: number;
  descricao: string;
  cor: string;
}

interface CardModalidadeProps {
  modalidade: Modalidade;
  onSelect: (modalidade: Modalidade) => void;
}

const CardModalidade = ({ modalidade, onSelect }: CardModalidadeProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(modalidade)}
      className={`${modalidade.cor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group relative`}
    >
      <div className="p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">{modalidade.name}</h3>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <span className="text-lg font-bold">{modalidade.name.charAt(0)}</span>
          </div>
        </div>
        
        <p className="text-white/90 mb-6 text-sm leading-relaxed">
          {modalidade.descricao}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/90">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">{modalidade.duracao} min</span>
          </div>
          
          <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full">
            <DollarSign className="w-4 h-4" />
            <span className="font-bold">R$ {modalidade.valor}</span>
          </div>
        </div>
      </div>
      
      {/* Overlay hover effect */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </motion.div>
  );
};

export default CardModalidade;
