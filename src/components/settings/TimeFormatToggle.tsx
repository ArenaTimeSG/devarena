import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Settings } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimeFormatToggleProps {
  timeFormatInterval: 30 | 60;
  onUpdate: (interval: 30 | 60) => void;
}

const TimeFormatToggle = ({ timeFormatInterval, onUpdate }: TimeFormatToggleProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setIsUpdating(true);
    const newInterval = checked ? 30 : 60;
    
    try {
      await onUpdate(newInterval);
    } catch (error) {
      console.error('Erro ao atualizar formato de horário:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const isHalfHour = timeFormatInterval === 30;

  return (
    <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200/60 p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">
              Formato de Horários
            </CardTitle>
            <p className="text-sm text-slate-600">
              Configure como os horários são exibidos na agenda
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 space-y-6">
        {/* Toggle Principal */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <div className="flex-1">
            <Label className="text-base font-medium text-gray-700">
              Horários Quebrados (30 min)
            </Label>
            <p className="text-sm text-gray-600 mt-1">
              {isHalfHour 
                ? 'Ativado: Horários quebrados de 30 em 30 minutos (13:30, 14:30, 15:30)'
                : 'Desativado: Horários inteiros de 60 em 60 minutos (13:00, 14:00, 15:00)'
              }
            </p>
          </div>
          <Switch 
            checked={isHalfHour}
            onCheckedChange={handleToggle}
            disabled={isUpdating}
            className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
          />
        </div>

        {/* Exemplos Visuais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Formato Atual */}
          <div className={`p-4 rounded-xl border-2 ${
            isHalfHour 
              ? 'bg-purple-50 border-purple-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                isHalfHour ? 'bg-purple-500' : 'bg-gray-400'
              }`}></div>
              <h4 className="font-semibold text-gray-800">
                {isHalfHour ? 'Formato Atual' : 'Formato Padrão'}
              </h4>
            </div>
            <div className="space-y-2">
              {isHalfHour ? (
                <>
                  <div className="text-sm text-gray-600">13:30 - 14:30</div>
                  <div className="text-sm text-gray-600">14:30 - 15:30</div>
                  <div className="text-sm text-gray-600">15:30 - 16:30</div>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">13:00 - 14:00</div>
                  <div className="text-sm text-gray-600">14:00 - 15:00</div>
                  <div className="text-sm text-gray-600">15:00 - 16:00</div>
                </>
              )}
            </div>
          </div>

          {/* Formato Alternativo */}
          <div className={`p-4 rounded-xl border-2 ${
            !isHalfHour 
              ? 'bg-purple-50 border-purple-200' 
              : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-3 h-3 rounded-full ${
                !isHalfHour ? 'bg-purple-500' : 'bg-gray-400'
              }`}></div>
              <h4 className="font-semibold text-gray-800">
                {!isHalfHour ? 'Formato Alternativo' : 'Formato Padrão'}
              </h4>
            </div>
            <div className="space-y-2">
              {!isHalfHour ? (
                <>
                  <div className="text-sm text-gray-600">13:30 - 14:30</div>
                  <div className="text-sm text-gray-600">14:30 - 15:30</div>
                  <div className="text-sm text-gray-600">15:30 - 16:30</div>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">13:00 - 14:00</div>
                  <div className="text-sm text-gray-600">14:00 - 15:00</div>
                  <div className="text-sm text-gray-600">15:00 - 16:00</div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Informações Importantes */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-800 mb-1">Como Funciona</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Horários Inteiros (60min):</strong> Agenda tradicional com slots de 1 hora (13:00, 14:00, 15:00)</li>
                <li>• <strong>Horários Quebrados (30min):</strong> Agenda com slots de 30 em 30 minutos (13:30, 14:30, 15:30)</li>
                <li>• Cada agendamento continua com duração de 60 minutos</li>
                <li>• A alteração afeta tanto o Dashboard quanto o agendamento online</li>
                <li>• Agendamentos existentes não são afetados</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm text-gray-600">
            {isUpdating ? 'Atualizando...' : 'Configuração salva automaticamente'}
          </span>
          <div className={`w-2 h-2 rounded-full ${
            isUpdating ? 'bg-yellow-500' : 'bg-green-500'
          }`}></div>
        </div>
      </CardContent>
    </Card>
  );
};

export { TimeFormatToggle };
