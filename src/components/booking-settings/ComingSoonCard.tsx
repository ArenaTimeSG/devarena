import { motion } from 'framer-motion';
import { Clock, Lock } from 'lucide-react';

interface ComingSoonCardProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const ComingSoonCard = ({ title, description, icon }: ComingSoonCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 border-2 border-dashed border-gray-300 relative overflow-hidden"
    >
      {/* Overlay de bloqueio */}
      <div className="absolute inset-0 bg-gray-50/80 backdrop-blur-sm flex items-center justify-center z-10">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-orange-600" />
          </div>
          <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-full text-sm font-semibold mb-2">
            EM BREVE
          </div>
          <p className="text-gray-600 text-sm">
            {description}
          </p>
        </div>
      </div>

      {/* Conteúdo original (desabilitado) */}
      <div className="opacity-30">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            {icon || <Clock className="w-6 h-6 text-gray-400" />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">{title}</h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>

        {/* Placeholder do conteúdo */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    </motion.div>
  );
};

export { ComingSoonCard };
