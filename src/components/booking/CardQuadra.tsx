import { motion } from 'framer-motion';
import { Building2 } from 'lucide-react';

interface Quadra {
  id: string;
  name: string;
  description: string | null;
}

interface CardQuadraProps {
  quadra: Quadra;
  onSelect: (quadra: Quadra) => void;
}

const CardQuadra = ({ quadra, onSelect }: CardQuadraProps) => {
  // Gerar cor baseada no nome da quadra
  const getQuadraColor = (name: string): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500',
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  const cor = getQuadraColor(quadra.name);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(quadra)}
      className={`${cor} rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden group relative`}
    >
      <div className="p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">{quadra.name}</h3>
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <Building2 className="w-6 h-6" />
          </div>
        </div>
        
        {quadra.description && (
          <p className="text-white/90 mb-6 text-sm leading-relaxed">
            {quadra.description}
          </p>
        )}
        
        <div className="flex items-center gap-2 text-white/90">
          <Building2 className="w-4 h-4" />
          <span className="text-sm font-medium">Quadra disponível</span>
        </div>
      </div>
      
      {/* Overlay hover effect */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
    </motion.div>
  );
};

export default CardQuadra;
