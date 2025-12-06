import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, ArrowLeft, Loader2 } from 'lucide-react';

const NewClient = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [isClientWithoutEmail, setIsClientWithoutEmail] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: 'Erro no cadastro',
        description: 'O nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.phone.trim()) {
      toast({
        title: 'Erro no cadastro',
        description: 'O telefone é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    // Validar email se não for cliente sem email
    if (!isClientWithoutEmail && !formData.email.trim()) {
      toast({
        title: 'Erro no cadastro',
        description: 'Email é obrigatório ou marque "Cliente sem email"',
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

      // Gerar email único para clientes sem email
      let emailToInsert: string;
      if (isClientWithoutEmail) {
        // Gerar email padronizado: nomedocliente@cliente.local
        const nameSlug = formData.name.trim().toLowerCase().replace(/\s+/g, '');
        emailToInsert = `${nameSlug}@cliente.local`;
      } else {
        emailToInsert = formData.email.trim().toLowerCase() || null;
      }

      const { error } = await supabase
        .from('booking_clients')
        .insert({
          name: formData.name.trim(),
          email: emailToInsert,
          phone: formData.phone.trim() || null,
          // cliente criado pelo admin/agenda não deve ter senha de login
          password_hash: null,
          user_id: user?.id
        });

      if (error) throw error;

      toast({
        title: 'Cliente cadastrado!',
        description: 'Cliente foi cadastrado com sucesso.',
      });

      navigate('/clients');
    } catch (error: any) {
      toast({
        title: 'Erro no cadastro',
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
                onClick={() => navigate('/clients')}
                className="hover:bg-slate-100 p-2 sm:p-2"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
                  <span className="hidden sm:inline">Novo Cliente</span>
                  <span className="sm:hidden">Novo</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-600 hidden sm:block">
                  Cadastre um novo cliente
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
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit} className="space-y-6">
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
                    disabled={isClientWithoutEmail}
                    className={`h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl ${
                      isClientWithoutEmail ? 'opacity-50' : ''
                    }`}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="noEmail"
                    checked={isClientWithoutEmail}
                    onChange={(e) => setIsClientWithoutEmail(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="noEmail" className="text-sm font-medium text-slate-700">
                    Cliente sem email
                  </Label>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                    Telefone *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    className="h-12 text-base border-slate-200 focus:border-blue-300 focus:ring-blue-200 rounded-xl"
                    required
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/clients')}
                    className="flex-1 h-12 text-base font-semibold border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <span className="hidden sm:inline">Cadastrar Cliente</span>
                    <span className="sm:hidden">Cadastrar</span>
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

export default NewClient;