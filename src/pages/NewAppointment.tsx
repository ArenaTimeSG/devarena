import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CalendarPlus, ArrowLeft, Loader2 } from 'lucide-react';

interface Client {
  id: string;
  name: string;
}

const NewAppointment = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    client_id: '',
    date: '',
    time: '',
    modality: '',
  });

  const modalities = ['Vôlei', 'Futsal', 'Basquete', 'Tênis', 'Padel'];

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
      const { data, error } = await supabase
        .from('booking_clients')
        .select('id, name')
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
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_id || !formData.date || !formData.time || !formData.modality) {
      toast({
        title: 'Erro no agendamento',
        description: 'Todos os campos são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Combine date and time
      const appointmentDateTime = new Date(`${formData.date}T${formData.time}`);

      const { error } = await supabase
        .from('appointments')
        .insert({
          client_id: formData.client_id,
          date: appointmentDateTime.toISOString(),
          modality: formData.modality,
          status: 'agendado',
          user_id: user.id
        });

      if (error) throw error;

      toast({
        title: 'Agendamento criado!',
        description: 'O agendamento foi criado com sucesso.',
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Erro no agendamento',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <motion.div 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-lg font-medium text-slate-700">Carregando...</p>
        </motion.div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="hover:bg-slate-100 p-2 sm:p-2"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <CalendarPlus className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">Novo Agendamento</span>
                  <span className="sm:hidden">Novo</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 hidden sm:block">
                  Criar um novo agendamento
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-xl rounded-2xl overflow-hidden">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900">
                Dados do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="client" className="text-sm font-semibold text-slate-700">
                    Cliente *
                  </Label>
                  <Select value={formData.client_id} onValueChange={(value) => handleChange('client_id', value)}>
                    <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl">
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl">
                      {clients.length === 0 ? (
                        <SelectItem value="empty" disabled>
                          Nenhum cliente cadastrado
                        </SelectItem>
                      ) : (
                        clients.map((client) => (
                          <SelectItem key={client.id} value={client.id} className="py-3">
                            {client.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {clients.length === 0 && (
                    <p className="text-sm text-slate-600">
                      <Button
                        type="button"
                        variant="link"
                        className="h-auto p-0 text-blue-600 hover:text-blue-700 font-medium"
                        onClick={() => navigate('/clients/new')}
                      >
                        Cadastre um cliente primeiro
                      </Button>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="date" className="text-sm font-semibold text-slate-700">
                      Data *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleChange('date', e.target.value)}
                      required
                      className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="time" className="text-sm font-semibold text-slate-700">
                      Horário *
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => handleChange('time', e.target.value)}
                      required
                      className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="modality" className="text-sm font-semibold text-slate-700">
                    Modalidade *
                  </Label>
                  <Select value={formData.modality} onValueChange={(value) => handleChange('modality', value)}>
                    <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl">
                      <SelectValue placeholder="Selecione uma modalidade" />
                    </SelectTrigger>
                    <SelectContent className="bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl">
                      {modalities.map((modality) => (
                        <SelectItem key={modality} value={modality} className="py-3">
                          {modality}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard')}
                    className="flex-1 h-12 text-base font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || clients.length === 0}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <span className="hidden sm:inline">Criar Agendamento</span>
                    <span className="sm:hidden">Criar</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default NewAppointment;