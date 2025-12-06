import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, LogOut, Plus, CheckCircle, AlertCircle } from 'lucide-react';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useClientBookings } from '@/hooks/useClientBookings';
import { useAdminByUsername } from '@/hooks/useAdminByUsername';
import { supabase } from '@/integrations/supabase/client';

interface Agendamento {
  id: string;
  date: string;
  modality: string;
  status: string;
  valor_total: number;
  created_at: string;
}

const ClientDashboard = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { client, loading: clientLoading, logout } = useClientAuth();
  
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'futuros' | 'passados'>('futuros');

  // Buscar dados do admin
  const { 
    data: adminData, 
    isLoading: loadingAdmin, 
    error: adminError 
  } = useAdminByUsername(username || '');

  // Buscar agendamentos do cliente
  const fetchAgendamentos = async () => {
    if (!client?.id || !adminData?.user?.user_id) {
      console.log('❌ clientId ou adminUserId não fornecidos:', { 
        clientId: client?.id, 
        adminUserId: adminData?.user?.user_id,
        client: client,
        adminData: adminData
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔍 Buscando agendamentos para:', { 
        clientId: client.id, 
        adminUserId: adminData.user.user_id,
        clientEmail: client.email,
        clientName: client.name
      });
      
      // Primeiro, verificar se o cliente existe na tabela booking_clients
      const { data: clientCheck, error: clientError } = await supabase
        .from('booking_clients')
        .select('id, name, email, user_id')
        .eq('id', client.id)
        .eq('user_id', adminData.user.user_id) // Verificar se o cliente pertence ao admin correto
        .maybeSingle();

      if (clientError) {
        console.error('❌ Erro ao verificar cliente:', clientError);
        return;
      }

      if (!clientCheck) {
        console.error('❌ Cliente não encontrado na tabela booking_clients para este admin:', {
          clientId: client.id,
          adminUserId: adminData.user.user_id,
          clientEmail: client.email
        });
        
        // Tentar buscar cliente por email para este admin
        console.log('🔍 Tentando buscar cliente por email...');
        const { data: clientByEmail, error: emailError } = await supabase
          .from('booking_clients')
          .select('id, name, email, user_id')
          .eq('email', client.email)
          .eq('user_id', adminData.user.user_id)
          .maybeSingle();
          
        if (emailError) {
          console.error('❌ Erro ao buscar cliente por email:', emailError);
          return;
        }
        
        if (clientByEmail) {
          console.log('✅ Cliente encontrado por email:', clientByEmail);
          // Atualizar o client.id para o ID correto
          client.id = clientByEmail.id;
        } else {
          console.error('❌ Cliente não encontrado nem por ID nem por email para este admin');
          return;
        }
      } else {
        console.log('✅ Cliente verificado:', clientCheck);
      }
      
      // Buscar agendamentos com JOIN para obter dados do cliente
      console.log('🔍 Executando consulta SQL:', {
        table: 'appointments',
        filters: {
          client_id: client.id,
          user_id: adminData.user.user_id
        }
      });
      
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:booking_clients(name, email, phone)
        `)
        .eq('client_id', client.id)
        .eq('user_id', adminData.user.user_id)
        .order('date', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar agendamentos:', error);
        console.error('❌ Detalhes do erro:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        return;
      }

      console.log('✅ Agendamentos encontrados:', data);
      console.log('📊 Total de agendamentos:', data?.length || 0);
      
      // Se não encontrou agendamentos, tentar consulta alternativa
      if (!data || data.length === 0) {
        console.log('🔍 Nenhum agendamento encontrado. Tentando consulta alternativa...');
        
        // Consulta alternativa: buscar por email
        const { data: altData, error: altError } = await supabase
          .from('appointments')
          .select(`
            *,
            client:booking_clients(name, email, phone)
          `)
          .eq('user_id', adminData.user.user_id)
          .order('date', { ascending: true });

        if (altError) {
          console.error('❌ Erro na consulta alternativa:', altError);
        } else {
          console.log('🔍 Consulta alternativa encontrou:', altData?.length || 0, 'agendamentos');
          
          // Filtrar apenas agendamentos do cliente atual por email
          const clientAppointments = altData?.filter(apt => 
            apt.client?.email === client.email
          ) || [];
          
          console.log('🔍 Agendamentos filtrados por email:', clientAppointments.length);
          console.log('🔍 Agendamentos do cliente:', clientAppointments);
          
          // Usar os agendamentos filtrados se encontrou algum
          if (clientAppointments.length > 0) {
            setAgendamentos(clientAppointments);
            return;
          }
        }
      }
      
      // Log detalhado de cada agendamento
      if (data && data.length > 0) {
        data.forEach((apt, index) => {
          console.log(`📅 Agendamento ${index + 1}:`, {
            id: apt.id,
            date: apt.date,
            status: apt.status,
            modality: apt.modality,
            valor_total: apt.valor_total,
            booking_source: apt.booking_source,
            client_name: apt.client?.name,
            client_email: apt.client?.email
          });
        });
      }
      
      setAgendamentos(data || []);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar agendamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cancelar agendamento
  const handleCancelar = async (agendamentoId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return;
    }

    setCancelingId(agendamentoId);
    try {
      console.log('🔍 Tentando cancelar agendamento:', agendamentoId);
      
      // Buscar agendamento usando a mesma lógica da consulta principal
      let agendamento = null;
      
      // Primeiro, tentar buscar por client_id
      const { data: dataByClientId, error: fetchError1 } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', agendamentoId)
        .eq('client_id', client?.id)
        .maybeSingle();

      if (!fetchError1 && dataByClientId) {
        agendamento = dataByClientId;
        console.log('✅ Agendamento encontrado por client_id');
      } else {
        console.log('🔍 Não encontrado por client_id, tentando por email...');
        
        // Se não encontrou por client_id, buscar por user_id e filtrar por email
        const { data: allAppointments, error: fetchError2 } = await supabase
          .from('appointments')
          .select(`
            *,
            client:booking_clients(name, email, phone)
          `)
          .eq('id', agendamentoId)
          .eq('user_id', adminData?.user?.user_id)
          .maybeSingle();

        if (!fetchError2 && allAppointments) {
          // Verificar se o agendamento pertence ao cliente atual
          if (allAppointments.client?.email === client?.email) {
            agendamento = allAppointments;
            console.log('✅ Agendamento encontrado por email');
          }
        }
      }

      if (!agendamento) {
        console.error('❌ Agendamento não encontrado ou não pertence ao cliente');
        alert('Erro ao verificar agendamento. Tente novamente.');
        return;
      }

      // Cancelar o agendamento
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelado',
          updated_at: new Date().toISOString()
        })
        .eq('id', agendamentoId);

      if (updateError) {
        console.error('❌ Erro ao cancelar agendamento:', updateError);
        alert(`Erro ao cancelar agendamento: ${updateError.message}`);
        return;
      }

      console.log('✅ Agendamento cancelado com sucesso');

      // Atualizar lista local
      setAgendamentos(prev => 
        prev.map(apt => 
          apt.id === agendamentoId 
            ? { ...apt, status: 'cancelado' }
            : apt
        )
      );

      alert('Agendamento cancelado com sucesso!');
    } catch (error) {
      console.error('❌ Erro inesperado ao cancelar agendamento:', error);
      alert('Erro inesperado ao cancelar agendamento. Tente novamente.');
    } finally {
      setCancelingId(null);
    }
  };

  // Verificar se o cliente está logado
  useEffect(() => {
    if (!clientLoading && !client) {
      navigate(`/cliente/login?redirect=${encodeURIComponent(`/cliente/dashboard/${username}`)}`);
    }
  }, [client, clientLoading, navigate, username]);

  // Buscar agendamentos quando o componente carregar
  useEffect(() => {
    if (client && adminData?.user?.user_id) {
      fetchAgendamentos();
    }
  }, [client, adminData?.user?.user_id]);

  // Prevenir perda de sessão ao usar botão voltar do navegador
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Não fazer nada, apenas manter a sessão
    };

    const handlePopState = (event: PopStateEvent) => {
      // Verificar se o cliente ainda está logado quando o usuário volta
      if (client) {
        // Manter a sessão ativa
        console.log('Cliente retornou à página, mantendo sessão ativa');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [client]);

  // Filtrar agendamentos
  const agendamentosFuturos = agendamentos.filter(apt => {
    const aptDate = parseISO(apt.date);
    const now = new Date();
    return isAfter(aptDate, now) && apt.status !== 'cancelado';
  });

  const agendamentosPassados = agendamentos.filter(apt => {
    const aptDate = parseISO(apt.date);
    const now = new Date();
    return isBefore(aptDate, now) || apt.status === 'cancelado';
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'agendado':
      case 'pago':
        return 'text-green-600 bg-green-100';
      case 'a_cobrar':
        return 'text-yellow-600 bg-yellow-100';
      case 'cancelado':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string, date?: string) => {
    // Se for agendamento futuro, sempre mostrar como "Agendado"
    if (date) {
      const appointmentDate = new Date(date);
      const now = new Date();
      if (appointmentDate > now) {
        return 'Agendado';
      }
    }
    
    switch (status) {
      case 'agendado':
      case 'pago':
        return 'Agendado';
      case 'a_cobrar':
        return 'Pendente';
      case 'cancelado':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'agendado':
      case 'pago':
        return <CheckCircle className="w-4 h-4" />;
      case 'a_cobrar':
        return <AlertCircle className="w-4 h-4" />;
      case 'cancelado':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleLogout = () => {
    logout();
    const adminUserId = adminData?.user?.user_id;
    const redirectUrl = adminUserId 
      ? `/cliente/login?redirect=${encodeURIComponent(`/cliente/dashboard/${username}`)}&adminUserId=${adminUserId}`
      : `/cliente/login?redirect=${encodeURIComponent(`/cliente/dashboard/${username}`)}`;
    navigate(redirectUrl);
  };

  const handleNovoAgendamento = () => {
    navigate(`/agendar/${username}`);
  };

  // Loading state
  if (loadingAdmin || clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-slate-600 font-medium text-sm sm:text-base">Carregando...</p>
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
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Perfil não encontrado</h1>
          <p className="text-slate-600 text-sm sm:text-base">O link de acesso não está disponível ou foi removido.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Header Principal */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                  {adminData?.user?.name} - Área do Cliente
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm hidden sm:block">Gerencie seus agendamentos</p>
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
                  onClick={handleNovoAgendamento}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                  title="Novo Agendamento"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                  title="Sair"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-lg p-6 mb-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Bem-vindo, {client?.name}!</h2>
            <p className="text-gray-600 mb-4">Gerencie seus agendamentos e faça novas reservas.</p>
            <button
              onClick={handleNovoAgendamento}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
            >
              <Plus className="w-5 h-5" />
              Novo Agendamento
            </button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Agendamentos Futuros</p>
                <p className="text-2xl font-bold text-gray-800">{agendamentosFuturos.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Confirmados</p>
                <p className="text-2xl font-bold text-gray-800">
                  {agendamentos.filter(apt => apt.status === 'agendado' || apt.status === 'pago').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold text-gray-800">
                  {agendamentos.filter(apt => apt.status === 'a_cobrar').length}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Agendamentos Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg overflow-hidden"
        >
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('futuros')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'futuros'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Futuros ({agendamentosFuturos.length})
              </button>
              <button
                onClick={() => setActiveTab('passados')}
                className={`flex-1 py-4 px-6 text-center font-medium transition-colors ${
                  activeTab === 'passados'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Passados ({agendamentosPassados.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Carregando agendamentos...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeTab === 'futuros' ? (
                  agendamentosFuturos.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Nenhum agendamento futuro encontrado.</p>
                      <button
                        onClick={handleNovoAgendamento}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      >
                        Fazer Primeiro Agendamento
                      </button>
                    </div>
                  ) : (
                    agendamentosFuturos.map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{agendamento.modality}</h3>
                              <p className="text-sm text-gray-600">
                                {format(parseISO(agendamento.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-gray-600">
                                R$ {agendamento.valor_total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(agendamento.status)}`}>
                              {getStatusIcon(agendamento.status)}
                              {getStatusText(agendamento.status, agendamento.date)}
                            </span>
                            {agendamento.status !== 'cancelado' && (
                              <button
                                onClick={() => handleCancelar(agendamento.id)}
                                disabled={cancelingId === agendamento.id}
                                className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium border border-red-200 hover:border-red-300"
                                title="Cancelar agendamento"
                              >
                                {cancelingId === agendamento.id ? (
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                                ) : (
                                  'Cancelar'
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  agendamentosPassados.length === 0 ? (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">Nenhum agendamento passado encontrado.</p>
                    </div>
                  ) : (
                    agendamentosPassados.map((agendamento) => (
                      <div
                        key={agendamento.id}
                        className="bg-gray-50 border border-gray-200 rounded-xl p-4 opacity-75"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-800">{agendamento.modality}</h3>
                              <p className="text-sm text-gray-600">
                                {format(parseISO(agendamento.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                              </p>
                              <p className="text-sm text-gray-600">
                                R$ {agendamento.valor_total.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(agendamento.status)}`}>
                              {getStatusIcon(agendamento.status)}
                              {getStatusText(agendamento.status, agendamento.date)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientDashboard;
