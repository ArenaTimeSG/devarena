import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';

interface ClientLoginFormProps {
  onSuccess: () => void;
  onSwitchToSignUp: () => void;
  adminUserId?: string;
}

export const ClientLoginForm = ({ onSuccess, onSwitchToSignUp, adminUserId }: ClientLoginFormProps) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});

  const [showPassword, setShowPassword] = useState(false);
  const { loginClient, isLoggingIn, loginError } = useClientAuth();
  const { toast } = useToast();

  // Validar campo em tempo real
  const validateField = (field: 'email' | 'password', value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'email':
        if (!value) {
          newErrors.email = 'Email é obrigatório';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          newErrors.email = 'Email inválido';
        } else {
          delete newErrors.email;
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Senha é obrigatória';
        } else {
          delete newErrors.password;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Atualizar campo
  const handleFieldChange = (field: 'email' | 'password', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Validar campo
    validateField(field, value);
  };

  // Verificar se o formulário é válido
  const isFormValid = () => {
    return (
      formData.email &&
      formData.password &&
      Object.keys(errors).length === 0
    );
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos
    validateField('email', formData.email);
    validateField('password', formData.password);
    
    if (!isFormValid()) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, preencha todos os campos corretamente.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      await loginClient({
        email: formData.email,
        password: formData.password,
        user_id: adminUserId,
      });
      
      toast({
        title: 'Login realizado!',
        description: 'Bem-vindo de volta!',
      });
      
      onSuccess();
    } catch (error: any) {
      const errorMessage = error.message || 'Erro no login';
      setErrors({ general: errorMessage });
      
      toast({
        title: 'Erro no login',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full shadow-2xl border-0 bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Entrar na sua conta
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Acesse sua conta para agendar horários
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`h-12 px-4 border-2 rounded-xl transition-all duration-300 ${
                  errors.email 
                    ? 'border-red-300 focus:border-red-500' 
                    : 'border-slate-200 focus:border-blue-500'
                }`}
              />
              {errors.email && (
                <motion.p 
                  className="text-sm text-red-600 flex items-center gap-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.email}
                </motion.p>
              )}
            </div>

            {/* Senha */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Sua senha"
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  className={`h-12 px-4 pr-12 border-2 rounded-xl transition-all duration-300 ${
                    errors.password 
                      ? 'border-red-300 focus:border-red-500' 
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <motion.p 
                  className="text-sm text-red-600 flex items-center gap-1"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.password}
                </motion.p>
              )}
            </div>

            {/* Erro geral */}
            {errors.general && (
              <motion.div 
                className="p-3 bg-red-50 border border-red-200 rounded-xl"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="text-sm text-red-600">{errors.general}</p>
              </motion.div>
            )}

            {/* Botão de login */}
            <Button
              type="submit"
              disabled={!isFormValid() || isLoggingIn}
              className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Entrar
                </>
              )}
            </Button>
          </form>

          {/* Link para cadastro */}
          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-slate-600">
              Não tem uma conta?{' '}
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                Criar conta
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
