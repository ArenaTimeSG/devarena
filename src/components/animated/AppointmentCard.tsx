import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Calendar, RotateCcw, Globe } from 'lucide-react';

interface AppointmentCardProps {
  appointment: {
    id: string;
    client: { name: string };
    modality: string;
    modality_id?: string | null;
    modality_info?: {
      name: string;
      valor: number;
    };
    status: 'a_cobrar' | 'pago' | 'cancelado' | 'agendado';
    payment_status?: 'not_required' | 'pending' | 'failed';
    client_id?: string;
    recurrence_id?: string;
    booking_source?: 'manual' | 'online';
    is_cortesia?: boolean;
  };
  onClick: () => void;
  getStatusColor: (status: string, date?: string, recurrence_id?: string, is_cortesia?: boolean) => string;
  getStatusLabel: (status: string, date?: string, is_cortesia?: boolean) => string;
  date?: string;
}

export const AppointmentCard: React.FC<AppointmentCardProps> = ({
  appointment,
  onClick,
  getStatusColor,
  getStatusLabel,
  date,
}) => {
  // Verificar se o agendamento foi feito online
  const isOnlineBooking = appointment.booking_source === 'online';
  // Determinar a cor baseada no tipo de agendamento (recorrente vs único)
  const getGradientClass = () => {
    if (appointment.recurrence_id) {
      // Agendamento recorrente - tons de azul
      switch (appointment.status) {
        case 'pago': return 'from-blue-500 to-blue-600';
        case 'a_cobrar': return 'from-blue-500 to-blue-600';
        case 'agendado': return 'from-blue-500 to-blue-600';
        case 'cancelado': return 'from-gray-400 to-gray-600';
        default: return 'from-blue-500 to-blue-600';
      }
    } else {
      // Agendamento único - tons de roxo
      switch (appointment.status) {
        case 'pago': return 'from-violet-500 to-violet-600';
        case 'a_cobrar': return 'from-violet-500 to-violet-600';
        case 'agendado': return 'from-violet-500 to-violet-600';
        case 'cancelado': return 'from-gray-400 to-gray-600';
        default: return 'from-violet-500 to-violet-600';
      }
    }
  };

  // Determinar a cor do badge baseada no status e payment_status
  const getBadgeColor = () => {
    // Se o agendamento tem payment_status 'pending', mostrar como aguardando pagamento
    if (appointment.payment_status === 'pending') {
      return 'bg-yellow-500 text-white border-yellow-600';
    }
    
    // Se o agendamento tem payment_status 'failed', mostrar como pagamento falhou
    if (appointment.payment_status === 'failed') {
      return 'bg-red-500 text-white border-red-600';
    }
    
    // Se for cortesia (independente do status), sempre mostrar como cortesia
    if (appointment.is_cortesia) {
      return 'bg-pink-500 text-white border-pink-600';
    }
    
    // Status normal baseado no status principal
    switch (appointment.status) {
      case 'pago': return 'bg-green-500 text-white border-green-600';
      case 'a_cobrar': return 'bg-orange-500 text-white border-orange-600';
      case 'cortesia': return 'bg-pink-500 text-white border-pink-600';
      case 'agendado': return 'bg-white/20 text-white border-white/30';
      case 'cancelado': return 'bg-gray-500 text-white border-gray-600';
      default: return 'bg-orange-500 text-white border-orange-600';
    }
  };

  const gradientClass = getGradientClass();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      whileHover={{ 
        y: -2,
        boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      }}
      whileTap={{ y: 0 }}
      transition={{ duration: 0.2 }}
      className={`
        relative overflow-hidden rounded-lg cursor-pointer p-1 h-full w-full max-h-[56px]
        bg-gradient-to-br ${gradientClass} text-white
        shadow-md hover:shadow-lg transition-all duration-200
        border-0 backdrop-blur-sm
      `}
      onClick={onClick}
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
      </div>

             <div className="relative h-full flex flex-col justify-between">
         {/* Top row: Status badge and icons */}
         <div className="flex items-center justify-between">
           <Badge 
             variant="secondary" 
             className={`text-xs font-semibold ${getBadgeColor()}`}
           >
             {getStatusLabel(appointment.status, date, appointment.is_cortesia)}
           </Badge>
           <div className="flex items-center gap-0.5">
             {isOnlineBooking && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.8 }}
                 animate={{ opacity: 1, scale: 1 }}
                 transition={{ duration: 0.3 }}
                 title="Agendamento Online"
               >
                 <Globe className="h-2.5 w-2.5 text-white/80" />
               </motion.div>
             )}
             {appointment.recurrence_id && (
               <motion.div
                 whileHover={{ rotate: 180 }}
                 transition={{ duration: 0.3 }}
                 title="Agendamento Recorrente"
               >
                 <RotateCcw className="h-2.5 w-2.5 text-white/80" />
               </motion.div>
             )}
           </div>
         </div>

         {/* Middle: Client name */}
         <div className="flex-1 flex items-center">
           <p className="font-semibold text-xs leading-tight line-clamp-1">
             {appointment.client?.name || 'Cliente não identificado'}
           </p>
         </div>

         {/* Bottom: Modality and recurrence indicator */}
         <div className="flex items-center justify-between">
           <div className="flex items-center gap-0.5 opacity-90">
             <Calendar className="h-2 w-2" />
             <p className="text-xs font-medium line-clamp-1">
               {appointment.modality_info ? 
                 appointment.modality_info.name : 
                 appointment.modality || 'Modalidade não definida'
               }
             </p>
           </div>
           
           {appointment.recurrence_id && (
             <motion.div 
               className="flex items-center gap-0.5 text-xs font-medium opacity-80"
               initial={{ opacity: 0 }}
               animate={{ opacity: 0.8 }}
               transition={{ delay: 0.2 }}
             >
               <div className="w-1 h-1 bg-white rounded-full" />
               <span className="text-xs">Rec</span>
             </motion.div>
           )}
         </div>
       </div>
    </motion.div>
  );
};
