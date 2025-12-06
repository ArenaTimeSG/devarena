import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, User, Edit, Save, Loader2, Calendar, Phone, Mail } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

const ClientDetail = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && id) {
      fetchClient();
      // Verificar se deve abrir em modo de edição
      const shouldEdit = searchParams.get('edit') === 'true';
      if (shouldEdit) {
        setIsEditing(true);
      }
    }
  }, [user, id, searchParams]);

  const fetchClient = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('booking_clients')
        .select('*')
        .eq('id', id)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      
      setClient(data);
      setFormData({
        name: data.name,
        email: data.email || '',
        phone: data.phone || '',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar cliente',
        description: error.message,
        variant: 'destructive',
      });
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Erro ao salvar',
        description: 'O nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('booking_clients')
        .update({
          name: formData.name.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
        })
        .eq('id', id)
        .eq('user_id', user?.id);

      if (error) throw error;

      // Atualizar o estado local
      setClient(prev => prev ? {
        ...prev,
        name: formData.name.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
      } : null);

      setIsEditing(false);
      // Limpar o parâmetro edit da URL
      navigate(`/clients/${id}`, { replace: true });
      toast({
        title: 'Cliente atualizado!',
        description: 'As informações foram salvas com sucesso.',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: client?.name || '',
      email: client?.email || '',
      phone: client?.phone || '',
    });
    // Limpar o parâmetro edit da URL
    navigate(`/clients/${id}`, { replace: true });
  };

  if (loading || isLoading) {
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

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <motion.div 
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="text-lg font-medium text-slate-700">Cliente não encontrado</p>
          <Button 
            onClick={() => navigate('/clients')} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Voltar para Clientes
          </Button>
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
                onClick={() => navigate('/clients')}
                className="hover:bg-slate-100 p-2 sm:p-2"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <User className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    {isEditing ? 'Editar Cliente' : client.name}
                  </span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 hidden sm:block">
                  {isEditing ? 'Edite as informações do cliente' : 'Detalhes do cliente'}
                </p>
              </div>
            </div>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Editar Cliente</span>
              </Button>
            )}
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
              <CardTitle className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <User className="h-5 w-5 sm:h-6 sm:w-6" />
                Informações do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            {isEditing ? (
              // Formulário de edição
              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-sm font-semibold text-slate-700">
                    Nome *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nome completo do cliente"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@exemplo.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    className="flex-1 h-12 text-base font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Save className="h-4 w-4" />
                    Salvar
                  </Button>
                </div>
              </form>
            ) : (
              // Visualização dos dados
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700">Nome</Label>
                  <p className="text-lg sm:text-xl font-semibold text-slate-900">{client.name}</p>
                </div>

                {client.email && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <p className="text-lg sm:text-xl text-slate-800">{client.email}</p>
                  </div>
                )}

                {client.phone && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone
                    </Label>
                    <p className="text-lg sm:text-xl text-slate-800">{client.phone}</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data de Cadastro
                  </Label>
                  <p className="text-lg sm:text-xl text-slate-800">
                    {new Date(client.created_at).toLocaleDateString('pt-BR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                <div className="pt-4">
                  <Badge variant="secondary" className="text-sm bg-slate-100 text-slate-700 border-slate-200">
                    ID: {client.id}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default ClientDetail;
