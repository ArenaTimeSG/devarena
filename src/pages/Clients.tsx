import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Users, Search, ArrowLeft, Mail, Phone, Calendar, Eye, Edit, Trash2 } from 'lucide-react';
import ResponsiveFilters from '@/components/ui/responsive-filters';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

const Clients = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentsForClient, setAppointmentsForClient] = useState<Array<{ id: string; date: string; modality: string | null; status: string }>>([]);
  const [confirmClientName, setConfirmClientName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('booking_clients')
        .select('*')
        .eq('user_id', user?.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar clientes',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm)
  );

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);

      // Se houver agendamentos, excluir primeiro
      if (appointmentsForClient.length > 0) {
        const { error: deleteAppointmentsError } = await supabase
          .from('appointments')
          .delete()
          .eq('client_id', clientToDelete.id)
          .eq('user_id', user?.id);

        if (deleteAppointmentsError) throw deleteAppointmentsError;
      }

      // Excluir o cliente
      const { error } = await supabase
        .from('booking_clients')
        .delete()
        .eq('id', clientToDelete.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Atualizar a lista de clientes
      setClients(clients.filter(client => client.id !== clientToDelete.id));

      toast({
        title: 'Cliente excluído',
        description: appointmentsForClient.length > 0
          ? `${clientToDelete.name} e ${appointmentsForClient.length} agendamento(s) foram excluídos.`
          : `${clientToDelete.name} foi excluído com sucesso.`,
      });

      setClientToDelete(null);
      setAppointmentsForClient([]);
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir cliente',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Ao selecionar um cliente para excluir, buscar seus agendamentos
  const openDeleteModal = async (client: Client) => {
    setClientToDelete(client);
    setLoadingAppointments(true);
    setAppointmentsForClient([]);
    setConfirmClientName('');

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, modality, modality_id, status')
        .eq('client_id', client.id)
        .eq('user_id', user?.id)
        .order('date', { ascending: false });

      if (error) throw error;

      const appointments = data || [];

      // Montar mapa de modalidades quando modality (nome) vier vazio
      const missingModalities = Array.from(new Set(
        appointments
          .filter((a: any) => !a.modality && a.modality_id)
          .map((a: any) => a.modality_id)
      ));

      let modalityMap = new Map<string, string>();
      if (missingModalities.length > 0) {
        const { data: modalitiesData, error: modalitiesError } = await supabase
          .from('modalities')
          .select('id, name')
          .in('id', missingModalities)
          .eq('user_id', user?.id);
        if (modalitiesError) throw modalitiesError;
        (modalitiesData || []).forEach((m: any) => modalityMap.set(m.id, m.name));
      }

      const normalized = appointments.map((a: any) => ({
        id: a.id,
        date: a.date,
        status: a.status,
        modality: a.modality || (a.modality_id ? modalityMap.get(a.modality_id) || null : null)
      }));

      setAppointmentsForClient(normalized);
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar agendamentos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoadingAppointments(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-slate-600 font-medium">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Modern Header */}
      <motion.header 
        className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-30 shadow-sm"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-slate-100 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span>Clientes</span>
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm font-medium hidden sm:block">Gerencie seus clientes</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  onClick={() => navigate('/clients/new')}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4 py-2"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Novo Cliente</span>
                  <span className="sm:hidden">Novo</span>
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Filtros Responsivos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <ResponsiveFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filters={[]}
            actions={[
              {
                label: "Novo Cliente",
                icon: <Plus className="h-4 w-4 mr-2" />,
                onClick: () => navigate('/clients/new'),
                variant: 'default'
              }
            ]}
          />
        </motion.div>

        {/* Stats */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Total de Clientes</p>
                  <p className="text-2xl font-bold text-slate-800">{clients.length}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Com Email</p>
                  <p className="text-2xl font-bold text-green-600">
                    {clients.filter(c => c.email).length}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-xl">
                  <Mail className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-600 tracking-wide uppercase">Com Telefone</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {clients.filter(c => c.phone).length}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Phone className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Clients List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b border-slate-200/60 p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl font-bold text-slate-800">
                Lista de Clientes ({filteredClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {filteredClients.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-16 w-16 mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 mb-2">
                    {clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente encontrado'}
                  </p>
                  <p className="text-slate-500 mb-6">
                    {clients.length === 0 
                      ? 'Comece cadastrando seu primeiro cliente' 
                      : 'Tente ajustar os filtros de busca'
                    }
                  </p>
                  {clients.length === 0 && (
                    <Button 
                      onClick={() => navigate('/clients/new')}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Cliente
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredClients.map((client, index) => (
                    <motion.div 
                      key={client.id} 
                      className="border border-slate-200 rounded-xl p-4 sm:p-6 bg-white/50 hover:bg-white/80 transition-all duration-300"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-3 w-full">
                          <h3 className="font-semibold text-slate-800 text-base sm:text-lg break-words">{client.name}</h3>
                          <div className="grid grid-cols-1 gap-2 text-sm">
                            {client.email && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Mail className="h-4 w-4" />
                                <span className="truncate max-w-[220px] sm:max-w-none">{client.email}</span>
                              </div>
                            )}
                            {client.phone && (
                              <div className="flex items-center gap-2 text-slate-600">
                                <Phone className="h-4 w-4" />
                                <span>{client.phone}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="h-3 w-3" />
                            <span>Cadastrado em: {new Date(client.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-row sm:items-center sm:gap-3 w-full sm:w-auto">
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}`)}
                              className="border-slate-200 hover:bg-slate-50 hover:border-slate-300 w-full sm:w-auto text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center"
                            >
                              <Eye className="h-4 w-4 sm:mr-2 mb-0.5 sm:mb-0" />
                              <span className="hidden sm:inline">Ver Detalhes</span>
                              <span className="sm:hidden">Ver</span>
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/clients/${client.id}?edit=true`)}
                              className="border-blue-200 hover:bg-blue-50 hover:border-blue-300 text-blue-700 w-full sm:w-auto text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center"
                            >
                              <Edit className="h-4 w-4 sm:mr-2 mb-0.5 sm:mb-0" />
                              <span className="hidden sm:inline">Editar</span>
                              <span className="sm:hidden">Editar</span>
                            </Button>
                          </motion.div>
                          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openDeleteModal(client)}
                              className="border-red-200 hover:bg-red-50 hover:border-red-300 text-red-700 w-full sm:w-auto text-[11px] sm:text-sm flex flex-col sm:flex-row items-center justify-center"
                            >
                              <Trash2 className="h-4 w-4 sm:mr-2 mb-0.5 sm:mb-0" />
                              <span className="hidden sm:inline">Excluir</span>
                              <span className="sm:hidden">Excluir</span>
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!clientToDelete} onOpenChange={() => { setClientToDelete(null); setConfirmClientName(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-red-600" />
              Confirmar exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{clientToDelete?.name}</strong>?
              {loadingAppointments && (
                <div className="text-slate-600 text-sm mt-2">Carregando agendamentos...</div>
              )}
              {!loadingAppointments && appointmentsForClient.length > 0 && (
                <div className="mt-3">
                  <span className="text-red-600 text-sm block mb-2">
                    ⚠️ Este cliente possui {appointmentsForClient.length} agendamento(s). Eles serão excluídos junto com o cliente.
                  </span>
                  <div className="max-h-48 overflow-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                    {appointmentsForClient.slice(0, 8).map(a => (
                      <div key={a.id} className="text-xs text-slate-700 py-1 flex items-center justify-between">
                        <span>{new Date(a.date).toLocaleString('pt-BR')}</span>
                        <span className="ml-2">{a.modality || 'Sem modalidade'}</span>
                        <Badge variant="outline" className="ml-2">{a.status}</Badge>
                      </div>
                    ))}
                    {appointmentsForClient.length > 8 && (
                      <div className="text-xs text-slate-500 mt-1">... e mais {appointmentsForClient.length - 8}</div>
                    )}
                  </div>
                </div>
              )}
              {!loadingAppointments && appointmentsForClient.length === 0 && (
                <span className="text-slate-600 text-sm mt-2 block">Este cliente não possui agendamentos.</span>
              )}

              {/* Segunda etapa de segurança - somente quando existir agendamento */}
              {appointmentsForClient.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs text-slate-600 block mb-1">Para confirmar, digite o nome do cliente exatamente como abaixo:</label>
                  <div className="text-sm font-semibold text-slate-800 mb-2">{clientToDelete?.name}</div>
                  <Input
                    value={confirmClientName}
                    onChange={(e) => setConfirmClientName(e.target.value)}
                    placeholder="Digite o nome do cliente para confirmar"
                  />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClient}
              className="bg-red-600 hover:bg-red-700"
              disabled={
                isDeleting ||
                !clientToDelete ||
                (appointmentsForClient.length > 0 && (
                  confirmClientName.trim().toLowerCase() !== clientToDelete.name.trim().toLowerCase()
                ))
              }
            >
              {isDeleting ? 'Excluindo...' : appointmentsForClient.length > 0 ? 'Excluir Cliente e Agendamentos' : 'Excluir Cliente'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;