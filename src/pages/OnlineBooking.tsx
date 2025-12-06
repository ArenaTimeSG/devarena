import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Phone, Mail, CheckCircle, ArrowLeft, AlertCircle, X, LogOut, List } from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAdminByUsername } from '@/hooks/useAdminByUsername';
import { useClientBookings } from '@/hooks/useClientBookings';
import { useAvailableHours } from '@/hooks/useAvailableHours';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

import CardModalidade from '@/components/booking/CardModalidade';
import Calendario from '@/components/booking/Calendario';
import ListaHorarios from '@/components/booking/ListaHorarios';
import FormCliente from '@/components/booking/FormCliente';
import ResumoReserva from '@/components/booking/ResumoReserva';
import AgendamentosMenu from '@/components/booking/AgendamentosMenu';
import ClientAuth from './ClientAuth';

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

const OnlineBooking = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [reserva, setReserva] = useState<Reserva>({
    modalidade: null,
    data: null,
    horario: null,
    cliente: { nome: '', email: '', telefone: '' }
  });
  const [reservaConfirmada, setReservaConfirmada] = useState(false);
  const [reservationStatus, setReservationStatus] = useState<'success' | 'pending' | null>(null);
  const [isAgendamentosMenuOpen, setIsAgendamentosMenuOpen] = useState(false);

  // Hook de autenticação do cliente
  const { client, loading: clientLoading, logout } = useClientAuth();
  
  // Hook para toast notifications
  const { toast } = useToast();

  // Debug: Log do username da URL
  console.log('🔍 OnlineBooking - username da URL:', username);
  
  // Verificar se username existe
  if (!username) {
    console.error('❌ OnlineBooking - Username não encontrado na URL');
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Erro</h1>
          <p className="text-gray-600">URL inválida. Username não encontrado.</p>
        </div>
      </div>
    );
  }
  
  // Buscar dados do admin baseado no username
  const { 
    data: adminData, 
    isLoading: loadingAdmin, 
    error: adminError 
  } = useAdminByUsername(username);

  // Verificar se o agendamento online está ativo
  const isOnlineBookingEnabled = adminData?.settings?.online_enabled ?? false;

  // Hook para salvar reserva
  const { 
    createBooking, 
    isCreating, 
    createError: reservationError 
  } = useClientBookings(adminData?.user?.user_id);
  
  // Query client para invalidação de cache
  const queryClient = useQueryClient();

  // Usar modalidades do adminData (já vêm com o admin)
  const modalities = adminData?.modalities || [];
  const modalitiesLoading = false;

  // Debug: Log dos dados do admin e modalidades
  console.log('🔍 OnlineBooking - adminData:', adminData);
  console.log('🔍 OnlineBooking - adminUserId:', adminData?.user?.user_id);
  console.log('🔍 OnlineBooking - modalities:', modalities);
  console.log('🔍 OnlineBooking - modalitiesLoading:', modalitiesLoading);
  console.log('🔍 OnlineBooking - adminData?.user:', adminData?.user);
  console.log('🔍 OnlineBooking - adminData?.user?.user_id:', adminData?.user?.user_id);
  console.log('🔍 OnlineBooking - adminData?.modalities:', adminData?.modalities);

  // Verificar se o cliente está logado e redirecionar se necessário
  useEffect(() => {
    if (!clientLoading && !client) {
      const adminUserId = adminData?.user?.user_id;
      const redirectUrl = adminUserId 
        ? `/cliente/login?redirect=${encodeURIComponent(`/agendar/${username}`)}&adminUserId=${adminUserId}`
        : `/cliente/login?redirect=${encodeURIComponent(`/agendar/${username}`)}`;
      navigate(redirectUrl);
    }
  }, [client, clientLoading, navigate, username, adminData]);

  // Verificar se o agendamento online está habilitado
  useEffect(() => {
    if (adminData && !isOnlineBookingEnabled) {
      navigate('/');
    }
  }, [adminData, isOnlineBookingEnabled, navigate]);

  // Hook para horários disponíveis (usando tabela horarios)
  const { data: availableHours = [], isLoading: availableHoursLoading } = useAvailableHours({
    adminUserId: adminData?.user?.user_id,
    selectedDate: reserva.data || new Date(),
    workingHours: adminData?.settings?.working_hours || {
      monday: { enabled: true, start: '08:00', end: '18:00' },
      tuesday: { enabled: true, start: '08:00', end: '18:00' },
      wednesday: { enabled: true, start: '08:00', end: '18:00' },
      thursday: { enabled: true, start: '08:00', end: '18:00' },
      friday: { enabled: true, start: '08:00', end: '18:00' },
      saturday: { enabled: true, start: '08:00', end: '18:00' },
      sunday: { enabled: false, start: '08:00', end: '18:00' }
    },
    tempoMinimoAntecedencia: adminData?.settings?.online_booking?.tempo_minimo_antecedencia || 24,
    modalityDuration: reserva.modalidade?.duracao || 60,
    timeFormatInterval: (adminData?.settings as any)?.time_format_interval || 60
  });

  // Debug: Log do time_format_interval
  console.log('🔍 OnlineBooking - adminData completo:', adminData);
  console.log('🔍 OnlineBooking - adminData?.settings:', adminData?.settings);
  console.log('🔍 OnlineBooking - adminData?.settings?.time_format_interval:', (adminData?.settings as any)?.time_format_interval);
  console.log('🔍 OnlineBooking - availableHours:', availableHours);





  // Função para gerar cor baseada no nome da modalidade
  const getModalidadeColor = useCallback((name: string): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500',
      'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  }, []);

  // Converter modalidades do admin para o formato esperado (memoizado)
  const modalidades = useMemo(() => {
    if (!modalities) return [];
    
    return modalities.map(mod => ({
      id: mod.id,
      name: mod.name,
      duracao: 60, // Duração padrão de 60 minutos
      valor: parseFloat(mod.valor.toString()),
      descricao: `${mod.name} - 60 minutos`,
      cor: getModalidadeColor(mod.name)
    }));
  }, [modalities, getModalidadeColor]);

  const handleModalidadeSelect = useCallback((modalidade: Modalidade) => {
    setReserva(prev => ({ ...prev, modalidade }));
    setStep(2);
  }, []);

  const handleDataSelect = useCallback((data: Date) => {
    setReserva(prev => ({ ...prev, data }));
    setStep(3);
  }, []);

  const handleHorarioSelect = useCallback((horario: string) => {
    setReserva(prev => ({ ...prev, horario }));
    setStep(4);
  }, []);

  // Atualizar dados do cliente quando ele fizer login
  const handleAuthSuccess = useCallback(() => {
    if (client) {
      setReserva(prev => ({
        ...prev,
        cliente: {
          nome: client.name,
          email: client.email,
          telefone: client.phone || ''
        }
      }));
    }
  }, [client]);

  const handleClienteSubmit = useCallback((cliente: Cliente) => {
    setReserva(prev => ({ ...prev, cliente }));
    setStep(5);
  }, []);

  // Função para processar pagamento - criar agendamento primeiro
  const handleProcessPayment = useCallback(async () => {
    console.log('🔍 OnlineBooking: Processando pagamento - criando agendamento primeiro');
    
    if (!adminData || !reserva.modalidade || !reserva.data || !reserva.horario || !client) {
      console.error('❌ OnlineBooking: Dados insuficientes para processar pagamento');
      console.error('❌ Dados:', { adminData: !!adminData, modalidade: !!reserva.modalidade, data: !!reserva.data, horario: !!reserva.horario, client: !!client });
      throw new Error('Dados insuficientes para processar pagamento');
    }

    try {
      // Criar data e hora combinadas
      const dataHora = new Date(reserva.data);
      const [horas, minutos] = reserva.horario.split(':');
      dataHora.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      
      // Preparar dados do pagamento (sem criar agendamento ainda)
      const paymentData = {
        user_id: adminData.user.user_id,
        amount: reserva.modalidade.valor,
        description: `Agendamento - ${reserva.modalidade.name}`,
        client_name: client.name,
        client_email: client.email,
        // Dados do agendamento para criar após pagamento
        appointment_data: {
          user_id: adminData.user.user_id,
          client_id: client.id,
          date: dataHora.toISOString(),
          modality: reserva.modalidade.name,
          valor_total: reserva.modalidade.valor,
          payment_status: 'pending',
          status: 'a_cobrar'
        }
      };
      
      console.log('🔍 OnlineBooking: Dados do pagamento:', paymentData);
      
      // Armazenar dados do pagamento para uso no checkout
      sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
      console.log('✅ Payment data stored in sessionStorage:', paymentData);
      
      // Verificar se foi salvo corretamente
      const storedData = sessionStorage.getItem('paymentData');
      if (!storedData) {
        throw new Error('Falha ao salvar dados do pagamento');
      }
      
      console.log('✅ Payment data verified in sessionStorage');
      
    } catch (error) {
      console.error('❌ OnlineBooking: Erro ao processar pagamento:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message || 'Não foi possível processar o pagamento. Tente novamente.',
        variant: 'destructive',
      });
      throw error; // Re-throw para que o ResumoReserva possa capturar
    }
  }, [adminData, reserva, client, toast]);

  // Função para criar agendamento apenas para reservas sem pagamento
  const createAppointment = useCallback(async (paymentStatus: 'not_required' | 'pending' | 'failed' = 'not_required') => {
    console.log('🔍 OnlineBooking: Criando agendamento sem pagamento');
    
    if (!adminData || !reserva.modalidade || !reserva.data || !reserva.horario || !client) {
      console.error('❌ OnlineBooking: Dados insuficientes para criar agendamento');
      return;
    }

    try {
      const autoConfirmada = adminData?.settings?.online_booking?.auto_agendar ?? false;
      
      // Criar data e hora combinadas
      const dataHora = new Date(reserva.data);
      const [horas, minutos] = reserva.horario.split(':');
      dataHora.setHours(parseInt(horas), parseInt(minutos), 0, 0);
      
      const bookingData = {
        user_id: adminData.user.user_id,
        client_data: {
          name: reserva.cliente.nome,
          email: reserva.cliente.email,
          phone: reserva.cliente.telefone
        },
        date: dataHora.toISOString(),
        modality: reserva.modalidade.name,
        modality_id: reserva.modalidade.id, // Adicionar modality_id
        valor_total: reserva.modalidade.valor,
        payment_policy: (adminData.settings as any)?.payment_policy || 'sem_pagamento',
        payment_status: paymentStatus,
        autoConfirmada: autoConfirmada
      };
      
      console.log('🔍 OnlineBooking: Dados do agendamento:', bookingData);
      
      // Criar agendamento na tabela appointments
      createBooking(bookingData, {
        onSuccess: (newBooking) => {
          console.log('✅ OnlineBooking: Agendamento criado com sucesso!', newBooking);
          
          // Invalidar cache de horários disponíveis para a data específica
          const dateKey = format(reserva.data!, 'yyyy-MM-dd');
          queryClient.invalidateQueries({ 
            queryKey: ['availableHours', adminData?.user?.user_id, dateKey] 
          });
          
          // Se chegou até aqui, a reserva foi criada com sucesso
          setReservationStatus(autoConfirmada ? 'success' : 'pending');
          setReservaConfirmada(true);
          
          // Reset após 5 segundos
          setTimeout(() => {
            setReservaConfirmada(false);
            setReservationStatus(null);
            setReserva({
              modalidade: null,
              data: null,
              horario: null,
              cliente: { nome: '', email: '', telefone: '' }
            });
            setStep(1);
          }, 5000);
        },
        onError: (error) => {
          console.error('❌ OnlineBooking: Erro ao criar agendamento:', error);
          alert('Erro ao criar agendamento. Tente novamente.');
        }
      });
    } catch (error) {
      console.error('❌ OnlineBooking: Erro ao confirmar reserva:', error);
    }
  }, [adminData, reserva, client, createBooking, queryClient]);

  // Função para confirmar reserva sem pagamento (política sem_pagamento ou opcional sem pagamento)
  const handleConfirmarReserva = useCallback(async () => {
    console.log('🔍 OnlineBooking: Confirmando reserva sem pagamento');
    // Para reservas sem pagamento, ainda precisamos criar o agendamento
    await createAppointment('not_required');
  }, [createAppointment]);

  // Função para confirmar reserva com pagamento (política opcional com pagamento)
  const handleConfirmarComPagamento = useCallback(async () => {
    console.log('🔍 OnlineBooking: Processando pagamento opcional');
    // Para pagamento opcional, apenas processar pagamento (não criar agendamento)
    await handleProcessPayment();
  }, [handleProcessPayment]);

  const handleVoltar = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  // Loading state
  if (loadingAdmin || modalitiesLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  // Error state - Admin não encontrado
  if (adminError || !adminData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <X className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Agenda não encontrada</h1>
          <p className="text-slate-600 text-sm sm:text-base">O link de agendamento não está disponível ou foi removido.</p>
        </div>
      </div>
    );
  }

  // Se o agendamento online está desativado
  if (!adminData?.settings?.online_enabled) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Agendamento Online Desativado</h1>
          <p className="text-slate-600 text-sm sm:text-base">O agendamento online está temporariamente indisponível.</p>
        </div>
      </div>
    );
  }

  // Se não há modalidades cadastradas
  if (modalidades.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Nenhuma modalidade disponível</h1>
          <p className="text-slate-600 text-sm sm:text-base">Não há modalidades cadastradas para agendamento no momento.</p>
        </div>
      </div>
    );
  }

  // Se o cliente não está autenticado, mostrar tela de login
  if (!client && !clientLoading) {
    return (
      <ClientAuth 
        onAuthSuccess={handleAuthSuccess}
        adminName={adminData.user.name}
        adminUserId={adminData.user.user_id}
      />
    );
  }

  // Loading do cliente
  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Carregando...</p>
        </div>
      </div>
    );
  }

  // Success state - Reserva confirmada
  if (reservaConfirmada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            {reservationStatus === 'success' ? (
              <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
            ) : (
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-600" />
            )}
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {reservationStatus === 'success' ? 'Reserva Confirmada!' : 'Horário Agendado!'}
            </h1>
            <p className="text-slate-600 text-sm sm:text-base">
              {reservationStatus === 'success' 
                ? 'Sua reserva foi confirmada automaticamente.' 
                : 'Seu agendamento foi registrado com sucesso.'
              }
            </p>
          </div>

          {/* Detalhes da reserva */}
          <div className="bg-white rounded-xl shadow-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${reserva.modalidade?.cor} rounded-full flex items-center justify-center`}>
                <span className="text-white font-bold text-sm">{reserva.modalidade?.name.charAt(0)}</span>
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">{reserva.modalidade?.name}</p>
                <p className="text-sm text-gray-600">
                  {reserva.data && format(reserva.data, 'dd/MM/yyyy', { locale: ptBR })} às {reserva.horario}
                </p>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="space-y-3">
            <button
              onClick={() => {
                setReservaConfirmada(false);
                setReservationStatus(null);
                setReserva({
                  modalidade: null,
                  data: null,
                  horario: null,
                  cliente: { nome: '', email: '', telefone: '' }
                });
                setStep(1);
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Novo Agendamento
            </button>
            
            <button
              onClick={() => navigate(`/cliente/dashboard/${username}`)}
              className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border-2 border-gray-200 hover:border-gray-300 transition-all duration-300"
            >
              Menu Principal
            </button>
          </div>

          <p className="text-xs text-gray-500">
            Você receberá um e-mail de confirmação com todos os detalhes.
          </p>
        </div>
      </div>
    );
  }

  // Tela principal de agendamento
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Header Principal */}
            <div className="flex items-center gap-3 sm:gap-4">
              {step > 1 && (
                <button
                  onClick={handleVoltar}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                  {adminData?.user?.name} - Agendamento
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Reserve seu horário de forma rápida e fácil</p>
              </div>
            </div>
            
            {/* Cliente logado e botões */}
            <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
              {client && (
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-slate-700 truncate">{client.name}</p>
                  <p className="text-xs text-slate-500 truncate">{client.email}</p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAgendamentosMenuOpen(true)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                  title="Meus Agendamentos"
                >
                  <List className="w-5 h-5" />
                </button>
                <button
                  onClick={logout}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Progress Steps - Mobile */}
          <div className="mt-3 sm:hidden">
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((stepNumber) => (
                <div key={stepNumber} className="flex items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                    stepNumber <= step 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-slate-200 text-slate-500'
                  }`}>
                    {stepNumber}
                  </div>
                  {stepNumber < 5 && (
                    <div className={`w-4 h-1 mx-1 ${
                      stepNumber < step ? 'bg-blue-600' : 'bg-slate-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress Steps - Desktop */}
          <div className="hidden sm:flex items-center justify-center gap-2 mt-4">
            {[1, 2, 3, 4, 5].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  stepNumber <= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 5 && (
                  <div className={`w-8 h-1 mx-1 ${
                    stepNumber < step ? 'bg-blue-600' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Step 1: Seleção da Modalidade */}
          {step === 1 && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Escolha sua Modalidade</h2>
                <p className="text-gray-600 text-sm sm:text-base">Selecione o esporte que você deseja praticar</p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {modalidades.map((modalidade) => (
                  <CardModalidade
                    key={modalidade.id}
                    modalidade={modalidade}
                    onSelect={handleModalidadeSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Calendário */}
          {step === 2 && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Escolha a Data</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  Selecione a data para sua reserva de {reserva.modalidade?.name}
                </p>
              </div>
              
              <div className="max-w-md mx-auto">
                <Calendario
                  onDataSelect={handleDataSelect}
                  modalidade={reserva.modalidade!}
                  workingHours={adminData?.settings?.working_hours}
                  tempoMinimoAntecedencia={adminData?.settings?.online_booking?.tempo_minimo_antecedencia || 24}
                />
              </div>
            </div>
          )}

          {/* Step 3: Horários */}
          {step === 3 && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Escolha o Horário</h2>
                <p className="text-gray-600 text-sm sm:text-base">
                  {reserva.modalidade?.name} - {reserva.data && format(reserva.data, 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <ListaHorarios
                  horarios={availableHours}
                  onHorarioSelect={handleHorarioSelect}
                  modalidade={reserva.modalidade!}
                  data={reserva.data!}
                  workingHours={adminData?.settings?.working_hours}
                  isLoading={availableHoursLoading}
                />
              </div>
            </div>
          )}

          {/* Step 4: Dados do Cliente */}
          {step === 4 && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Seus Dados</h2>
                <p className="text-gray-600 text-sm sm:text-base">Confirme suas informações para finalizar a reserva</p>
              </div>
              
              {client ? (
                // Se o cliente está logado, mostrar dados pré-preenchidos
                <div className="max-w-md mx-auto">
                  <div className="bg-white rounded-2xl shadow-xl p-4 sm:p-6 space-y-4">
                    <div className="text-center mb-4 sm:mb-6">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                        <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{client.name}</h3>
                      <p className="text-gray-600 text-sm sm:text-base">{client.email}</p>
                      {client.phone && (
                        <p className="text-gray-600 text-sm sm:text-base">{client.phone}</p>
                      )}
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                        <span className="text-green-800 font-medium text-sm sm:text-base">Dados confirmados</span>
                      </div>
                      
                      <p className="text-xs sm:text-sm text-gray-600 text-center">
                        Seus dados estão corretos. Clique em continuar para revisar a reserva.
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleClienteSubmit({
                        nome: client.name,
                        email: client.email,
                        telefone: client.phone || ''
                      })}
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl text-sm sm:text-base"
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : (
                // Fallback para cliente não logado (não deveria acontecer)
                <FormCliente
                  onSubmit={handleClienteSubmit}
                  reserva={reserva}
                />
              )}
            </div>
          )}

          {/* Step 5: Resumo e Confirmação */}
          {step === 5 && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Confirme sua Reserva</h2>
                <p className="text-gray-600 text-sm sm:text-base">Revise os dados antes de confirmar</p>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <ResumoReserva
                  reserva={reserva}
                  onConfirmar={handleConfirmarReserva}
                  onConfirmarComPagamento={handleConfirmarComPagamento}
                  isCreating={isCreating}
                  autoConfirmada={adminData?.settings?.online_booking?.auto_agendar || false}
                  paymentPolicy={(adminData?.settings as any)?.payment_policy || 'sem_pagamento'}
                  appointmentId={sessionStorage.getItem('lastAppointmentId') || undefined}
                  userId={adminData?.user?.user_id}
                  mercadoPagoPublicKey={(adminData?.settings as any)?.mercado_pago_public_key}
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Menu de Agendamentos */}
      {client && adminData?.user?.user_id && (
        <AgendamentosMenu
          clientId={client.id}
          adminUserId={adminData.user.user_id}
          isOpen={isAgendamentosMenuOpen}
          onClose={() => setIsAgendamentosMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default OnlineBooking;
