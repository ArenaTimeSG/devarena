import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Check } from 'lucide-react';
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

interface ListaHorariosProps {
  horarios: string[]; // Horários disponíveis
  onHorarioSelect: (horario: string) => void;
  modalidade: Modalidade;
  data: Date;
  workingHours?: any; // Configuração de horários de funcionamento
  isLoading?: boolean; // Estado de carregamento
}

const ListaHorarios = ({ horarios, onHorarioSelect, modalidade, data, workingHours, isLoading = false }: ListaHorariosProps) => {
  const [selectedHorario, setSelectedHorario] = useState<string | null>(null);
  


  // Agora usamos diretamente os horários do hook useAvailableHours
  


  // Verificar se o horário está disponível
  const isHorarioOcupado = (horario: string) => {
    return !horarios.includes(horario);
  };

  const handleHorarioClick = (horario: string) => {
    if (horarios.includes(horario)) {
      setSelectedHorario(horario);
      onHorarioSelect(horario);
    }
  };

  const isHorarioSelected = (horario: string) => {
    return selectedHorario === horario;
  };

  // Agrupar horários por período (usar horários disponíveis do hook)
  const horariosManha = horarios.filter(h => parseInt(h.split(':')[0]) < 12);
  const horariosTarde = horarios.filter(h => {
    const hour = parseInt(h.split(':')[0]);
    return hour >= 12 && hour < 18;
  });
  const horariosNoite = horarios.filter(h => parseInt(h.split(':')[0]) >= 18);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Informações da reserva */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{modalidade.name}</h3>
            <p className="text-gray-600">
              {format(data, 'EEEE, dd/MM/yyyy', { locale: ptBR })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Duração</p>
            <p className="font-bold text-gray-800">{modalidade.duracao} minutos</p>
          </div>
        </div>
      </div>

      {/* Horários disponíveis */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">Carregando horários disponíveis...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Manhã */}
            {horariosManha.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Manhã
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {horariosManha.map((horario) => (
                <HorarioButton
                  key={horario}
                  horario={horario}
                  isOcupado={isHorarioOcupado(horario)}
                  isSelected={isHorarioSelected(horario)}
                  onClick={() => handleHorarioClick(horario)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tarde */}
        {horariosTarde.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Tarde
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {horariosTarde.map((horario) => (
                <HorarioButton
                  key={horario}
                  horario={horario}
                  isOcupado={isHorarioOcupado(horario)}
                  isSelected={isHorarioSelected(horario)}
                  onClick={() => handleHorarioClick(horario)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Noite */}
        {horariosNoite.length > 0 && (
          <div>
            <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-500" />
              Noite
            </h4>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {horariosNoite.map((horario) => (
                <HorarioButton
                  key={horario}
                  horario={horario}
                  isOcupado={isHorarioOcupado(horario)}
                  isSelected={isHorarioSelected(horario)}
                  onClick={() => handleHorarioClick(horario)}
                />
              ))}
            </div>
          </div>
        )}
      </>
    )}
  </div>

      {/* Legenda */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 border-2 border-green-500 rounded"></div>
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-500 rounded"></div>
            <span>Ocupado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-600 rounded flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
            <span>Selecionado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

interface HorarioButtonProps {
  horario: string;
  isOcupado: boolean;
  isSelected: boolean;
  onClick: () => void;
}

const HorarioButton = ({ horario, isOcupado, isSelected, onClick }: HorarioButtonProps) => {
  return (
    <motion.button
      whileHover={!isOcupado ? { scale: 1.05 } : {}}
      whileTap={!isOcupado ? { scale: 0.95 } : {}}
      onClick={onClick}
      disabled={isOcupado}
      className={`
        h-16 rounded-xl font-semibold text-lg transition-all duration-200
        ${isOcupado 
          ? 'bg-red-100 border-2 border-red-500 text-red-600 cursor-not-allowed' 
          : isSelected 
            ? 'bg-blue-600 text-white shadow-lg' 
            : 'bg-green-100 border-2 border-green-500 text-green-700 hover:bg-green-200 hover:border-green-600'
        }
      `}
    >
      {isSelected && (
        <div className="flex items-center justify-center gap-2">
          <Check className="w-4 h-4" />
          {horario}
        </div>
      )}
      {!isSelected && horario}
    </motion.button>
  );
};

export default ListaHorarios;
