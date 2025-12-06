import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SignInForm } from '@/components/SignInForm';
import { SignUpForm } from '@/components/SignUpForm';
import { Loader2, Calendar, Users, DollarSign, Settings } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { motion } from 'framer-motion';

const Auth = () => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleSwitchToSignUp = () => {
    setActiveTab('signup');
  };

  const handleSwitchToSignIn = () => {
    setActiveTab('signin');
  };

  const handleAuthSuccess = () => {
    // O usuário será redirecionado automaticamente pelo useEffect
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar com informações do sistema */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-700 p-8 items-center justify-center relative overflow-hidden"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/5"></div>
        </div>
        
        <motion.div 
          className="text-white text-center space-y-8 max-w-md relative z-10"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="space-y-6">
            {/* Logo */}
            <motion.div 
              className="flex justify-center"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 border border-white/30">
                <Logo 
                  size={120} 
                  className="text-white drop-shadow-2xl filter brightness-110" 
                />
              </div>
            </motion.div>
            
            <div className="space-y-4">
              <h1 className="text-6xl font-extrabold drop-shadow-2xl bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                ArenaTime
              </h1>
              <p className="text-2xl font-semibold text-blue-50 drop-shadow-md">
                Sistema de Gestão Inteligente
              </p>
              <p className="text-blue-100 text-lg leading-relaxed">
                Gerencie seus agendamentos esportivos de forma simples e eficiente
              </p>
            </div>
          </div>
          
          <motion.div 
            className="grid grid-cols-2 gap-6 pt-8"
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <motion.div 
              className="text-center space-y-2"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4 mx-auto w-16 h-16 flex items-center justify-center border border-white/30">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold">Agendamentos</p>
              <p className="text-sm text-blue-100">Controle total</p>
            </motion.div>
            
            <motion.div 
              className="text-center space-y-2"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4 mx-auto w-16 h-16 flex items-center justify-center border border-white/30">
                <Users className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold">Clientes</p>
              <p className="text-sm text-blue-100">Gestão completa</p>
            </motion.div>
            
            <motion.div 
              className="text-center space-y-2"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4 mx-auto w-16 h-16 flex items-center justify-center border border-white/30">
                <DollarSign className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold">Financeiro</p>
              <p className="text-sm text-blue-100">Relatórios detalhados</p>
            </motion.div>
            
            <motion.div 
              className="text-center space-y-2"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-xl p-4 mx-auto w-16 h-16 flex items-center justify-center border border-white/30">
                <Settings className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold">Configurações</p>
              <p className="text-sm text-blue-100">Personalização total</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Formulário de autenticação */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="w-full max-w-md">
          {/* Logo para mobile */}
          <motion.div 
            className="lg:hidden text-center mb-8"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div 
              className="flex justify-center mb-4"
              whileHover={{ scale: 1.05 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-4 border border-slate-200/30">
                <Logo 
                  size={80} 
                  className="text-blue-600 drop-shadow-lg" 
                />
              </div>
            </motion.div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              ArenaTime
            </h1>
            <p className="text-slate-600 text-sm">
              Sistema de Gestão Inteligente
            </p>
          </motion.div>
          
          {/* Tabs para alternar entre login e cadastro */}
          <motion.div 
            className="flex bg-white/80 backdrop-blur-xl rounded-2xl p-1 shadow-xl border border-slate-200/60 mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <button
              onClick={handleSwitchToSignIn}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'signin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              Entrar
            </button>
            <button
              onClick={handleSwitchToSignUp}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'signup'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
            >
              Criar Conta
            </button>
          </motion.div>

          {/* Formulário ativo */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {activeTab === 'signin' ? (
              <SignInForm 
                onSuccess={handleAuthSuccess}
                onSwitchToSignUp={handleSwitchToSignUp}
              />
            ) : (
              <SignUpForm 
                onSuccess={handleAuthSuccess}
                onSwitchToLogin={handleSwitchToSignIn}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;