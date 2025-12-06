import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, User, Mail, Phone, Lock, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  SignUpValidation, 
  ValidationErrors, 
  validateSignUpData, 
  formatPhoneNumber,
  cleanPhoneNumber,
  generateUsername,
  validateUsername
} from '@/types/user';

interface SignUpFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export const SignUpForm = ({ onSuccess, onSwitchToLogin }: SignUpFormProps) => {
  const [formData, setFormData] = useState<SignUpValidation>({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    username: ''
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signUp } = useAuth();
  const { toast } = useToast();

  // Validar campo em tempo real
  const validateField = (field: keyof SignUpValidation, value: string) => {
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
        
      case 'username':
        const usernameError = validateUsername(value);
        if (usernameError) {
          newErrors.username = usernameError;
        } else {
          delete newErrors.username;
        }
        break;
        
      case 'password':
        if (!value) {
          newErrors.password = 'Senha é obrigatória';
        } else if (value.length < 6) {
          newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
        } else if (value.length > 50) {
          newErrors.password = 'Senha deve ter no máximo 50 caracteres';
        } else {
          delete newErrors.password;
        }
        
        // Validar confirmação de senha também
        if (formData.confirmPassword && value !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Senhas não coincidem';
        } else if (formData.confirmPassword) {
          delete newErrors.confirmPassword;
        }
        break;
        
      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Confirmação de senha é obrigatória';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Senhas não coincidem';
        } else {
          delete newErrors.confirmPassword;
        }
        break;
        
      case 'name':
        if (!value) {
          newErrors.name = 'Nome é obrigatório';
        } else if (value.length < 2) {
          newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
        } else if (value.length > 100) {
          newErrors.name = 'Nome deve ter no máximo 100 caracteres';
        } else {
          delete newErrors.name;
          // Gerar username automaticamente baseado no nome
          const generatedUsername = generateUsername(value);
          setFormData(prev => ({ ...prev, username: generatedUsername }));
        }
        break;
        
      case 'phone':
        if (!value) {
          newErrors.phone = 'Telefone é obrigatório';
        } else {
          const cleanPhone = cleanPhoneNumber(value);
          if (cleanPhone.length < 10) {
            newErrors.phone = 'Telefone deve ter pelo menos 10 dígitos';
          } else if (cleanPhone.length > 11) {
            newErrors.phone = 'Telefone deve ter no máximo 11 dígitos';
          } else {
            delete newErrors.phone;
          }
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Atualizar campo
  const handleFieldChange = (field: keyof SignUpValidation, value: string) => {
    let processedValue = value;
    
    // Formatar telefone
    if (field === 'phone' && value) {
      processedValue = formatPhoneNumber(value);
    }
    
    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));
    
    // Validar campo
    validateField(field, processedValue);
  };

  // Verificar se o formulário é válido
  const isFormValid = () => {
    return (
      formData.email &&
      formData.password &&
      formData.confirmPassword &&
      formData.name &&
      formData.username &&
      formData.password === formData.confirmPassword &&
      Object.keys(errors).length === 0
    );
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar todos os campos
    const validationErrors = validateSignUpData(formData);
    setErrors(validationErrors);
    
    if (Object.keys(validationErrors).length > 0) {
      toast({
        title: 'Erro de validação',
        description: 'Por favor, corrija os erros no formulário.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('🔄 Iniciando processo de cadastro...');
      
      const { data, error } = await signUp({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        phone: cleanPhoneNumber(formData.phone),
        username: formData.username
      });
      
      if (error) {
        console.error('❌ Erro no cadastro:', error);
        
        let errorMessage = 'Erro ao criar conta';
        
        if (error.message.includes('already registered') || error.message.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou use a opção "Esqueci minha senha".';
        } else if (error.message.includes('password')) {
          errorMessage = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        } else if (error.message.includes('email')) {
          errorMessage = 'Email inválido.';
        } else if (error.message.includes('username')) {
          errorMessage = 'Este username já está em uso. Escolha outro username.';
        } else {
          errorMessage = error.message;
        }
        
        toast({
          title: '❌ Erro no cadastro',
          description: errorMessage,
          variant: 'destructive',
        });
      } else {
        console.log('✅ Cadastro realizado com sucesso');
        
        toast({
          title: '✅ Cadastro realizado com sucesso',
          description: 'Sua conta foi criada e você está logado automaticamente.',
        });
        
        // Manter a sessão ativa e redirecionar
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error: any) {
      console.error('❌ Erro inesperado:', error);
      
      toast({
        title: '❌ Erro inesperado',
        description: 'Ocorreu um erro inesperado. Tente novamente.',
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
          <UserPlus className="h-8 w-8 text-white" />
        </div>
        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Criar Conta
        </CardTitle>
        <CardDescription className="text-lg text-slate-600">
          Preencha os dados para criar sua conta
        </CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome */}
          <div className="space-y-3">
            <Label htmlFor="name" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Nome Completo *
            </Label>
            <div className="relative">
              <Input
                id="name"
                type="text"
                placeholder="Seu nome completo"
                value={formData.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={`h-12 px-4 pl-12 text-base border-2 transition-all duration-300 ${
                  errors.name 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                } rounded-xl bg-white/80 backdrop-blur-sm`}
                disabled={isSubmitting}
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              {formData.name && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {errors.name ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {errors.name && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.name}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Username */}
          <div className="space-y-3">
            <Label htmlFor="username" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Username *
            </Label>
            <div className="relative">
              <Input
                id="username"
                type="text"
                placeholder="seu-username"
                value={formData.username}
                onChange={(e) => handleFieldChange('username', e.target.value)}
                className={`h-12 px-4 pl-12 text-base border-2 transition-all duration-300 ${
                  errors.username 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                } rounded-xl bg-white/80 backdrop-blur-sm`}
                disabled={isSubmitting}
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              {formData.username && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {errors.username ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {errors.username && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.username}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Email */}
          <div className="space-y-3">
            <Label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-600" />
              Email *
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
              />
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              {formData.email && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {errors.email ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {errors.email && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.email}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Telefone */}
          <div className="space-y-3">
            <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Phone className="h-4 w-4 text-blue-600" />
              Telefone *
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className={`h-12 px-4 pl-12 text-base border-2 transition-all duration-300 ${
                  errors.phone 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                } rounded-xl bg-white/80 backdrop-blur-sm`}
                disabled={isSubmitting}
                required
              />
              <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              {formData.phone && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
                  {errors.phone ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  )}
                </div>
              )}
            </div>
            {errors.phone && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.phone}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Senha */}
          <div className="space-y-3">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Senha *
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
                minLength={6}
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

          {/* Confirmar Senha */}
          <div className="space-y-3">
            <Label htmlFor="confirmPassword" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Lock className="h-4 w-4 text-blue-600" />
              Confirmar Senha *
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                className={`h-12 px-4 pl-12 pr-12 text-base border-2 transition-all duration-300 ${
                  errors.confirmPassword 
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-200' 
                    : 'border-slate-200 focus:border-blue-500 focus:ring-blue-200'
                } rounded-xl bg-white/80 backdrop-blur-sm`}
                disabled={isSubmitting}
                minLength={6}
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-blue-600 transition-colors"
                disabled={isSubmitting}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <Alert variant="destructive" className="py-3 border-red-200 bg-red-50">
                <AlertDescription className="text-sm font-medium">{errors.confirmPassword}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Botão de Cadastro */}
          <Button 
            type="submit" 
            className="w-full h-12 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1" 
            disabled={isSubmitting || !isFormValid()}
          >
            {isSubmitting && <Loader2 className="mr-3 h-5 w-5 animate-spin" />}
            {isSubmitting ? 'Criando conta...' : 'Criar Conta'}
          </Button>

          {/* Link para Login */}
          {onSwitchToLogin && (
            <div className="text-center pt-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-slate-500 font-medium">Já tem uma conta?</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="mt-4 w-full py-3 px-4 border-2 border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 font-semibold rounded-xl transition-all duration-300"
                disabled={isSubmitting}
              >
                Fazer login
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};
