import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

export const SignInForm = ({ onSuccess, onSwitchToSignUp }: SignInFormProps) => {
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn } = useAuth();
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
    
    // Limpar erro geral quando o usuário começar a digitar
    if (errors.general) {
      setErrors(prev => ({ ...prev, general: undefined }));
    }
    
    // Validar campo
    validateField(field, value);
  };

  // Verificar se o formulário é válido
  const isFormValid = () => {
    return (
      formData.email &&
      formData.password &&
      !errors.email &&
      !errors.password
    );
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Limpar erros anteriores para permitir nova tentativa
    setErrors({});
    
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
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        let errorMessage = 'Erro no login';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas. Tente novamente em alguns minutos.';
        } else {
          errorMessage = error.message;
        }
        
        setErrors({ general: errorMessage });
        
        toast({
          title: 'Erro no login',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Login realizado!',
          description: 'Bem-vindo de volta!',
        });
        
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      const errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      setErrors({ general: errorMessage });
      
      toast({
        title: 'Erro inesperado',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full shadow-2xl border-0 bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-slate-500/10 border-b border-blue-200/40 p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <LogIn className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Bem-vindo de volta!
        </CardTitle>
        <CardDescription className="text-lg text-slate-600">
          Acesse sua conta para gerenciar agendamentos
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Email
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className={`h-12 px-4 pl-12 text-base border-2 transition-all duration-300 ${
                  errors.email 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                } rounded-xl bg-white/80 backdrop-blur-sm`}
                disabled={isSubmitting}
                required
              />
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            </div>
            {errors.email && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.email}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Senha */}
          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Senha
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={`h-12 px-4 pl-12 pr-12 text-base border-2 transition-all duration-300 ${
                  errors.password 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                } rounded-xl bg-white/80 backdrop-blur-sm`}
                disabled={isSubmitting}
                required
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors"
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.password}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Erro Geral */}
          {errors.general && (
            <Alert variant="destructive" className="py-4 border-red-200 bg-red-50">
              <AlertDescription className="font-medium">{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Botão de Login */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1" 
            disabled={isSubmitting || !isFormValid()}
          >
            {isSubmitting && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
            {isSubmitting ? 'Entrando...' : 'Entrar na Conta'}
          </Button>

          {/* Link para Cadastro */}
          {onSwitchToSignUp && (
            <div className="text-center pt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-medium">Não tem uma conta?</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="mt-4 w-full py-3 px-4 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-semibold rounded-xl transition-all duration-300"
                disabled={isSubmitting}
              >
                Criar nova conta
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

