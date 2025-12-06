import { useState } from 'react';
import { motion } from 'framer-motion';
import { ClientLoginForm } from '@/components/booking/ClientLoginForm';
import { ClientSignUpForm } from '@/components/booking/ClientSignUpForm';
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react';

interface ClientAuthProps {
  onAuthSuccess: () => void;
  adminName?: string;
  adminUserId?: string;
}

const ClientAuth = ({ onAuthSuccess, adminName, adminUserId }: ClientAuthProps) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');

  const handleSwitchToSignUp = () => {
    setActiveTab('signup');
  };

  const handleSwitchToLogin = () => {
    setActiveTab('login');
  };

  const handleAuthSuccess = () => {
    onAuthSuccess();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Sidebar Informativa */}
      <motion.div 
        className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-12 flex-col justify-center"
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="max-w-md mx-auto space-y-8">
          {/* Logo/Título */}
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto backdrop-blur-xl">
              <Calendar className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold">
              {adminName ? `Agendar com ${adminName}` : 'Agendamento Online'}
            </h1>
            <p className="text-blue-100 text-lg">
              Faça login ou crie sua conta para agendar horários
            </p>
          </div>

          {/* Benefícios */}
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xl">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Agendamento Rápido</h3>
                <p className="text-blue-100">Reserve horários em poucos cliques</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xl">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Horários Disponíveis</h3>
                <p className="text-blue-100">Veja em tempo real os horários livres</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Conta Permanente</h3>
                <p className="text-blue-100">Seus dados ficam salvos para futuros agendamentos</p>
              </div>
            </div>
          </div>

          {/* Informações adicionais */}
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6">
            <h3 className="font-semibold text-lg mb-2">Como funciona?</h3>
            <ol className="text-blue-100 space-y-2 text-sm">
              <li>1. Faça login ou crie sua conta</li>
              <li>2. Escolha a modalidade desejada</li>
              <li>3. Selecione data e horário disponível</li>
              <li>4. Confirme sua reserva</li>
            </ol>
          </div>
        </div>
      </motion.div>

      {/* Formulário de Autenticação */}
      <motion.div 
        className="flex-1 flex items-center justify-center p-8"
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="w-full max-w-md">
          {/* Tabs para alternar entre login e cadastro */}
          <motion.div 
            className="flex bg-white/80 backdrop-blur-xl rounded-2xl p-1 shadow-xl border border-slate-200/60 mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <button
              onClick={handleSwitchToLogin}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === 'login'
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
            {activeTab === 'login' ? (
              <ClientLoginForm 
                onSuccess={handleAuthSuccess}
                onSwitchToSignUp={handleSwitchToSignUp}
                adminUserId={adminUserId}
              />
            ) : (
              <ClientSignUpForm 
                onSuccess={handleAuthSuccess}
                onSwitchToLogin={handleSwitchToLogin}
              />
            )}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ClientAuth;
