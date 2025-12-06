import { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Save, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PAYMENT_POLICY_OPTIONS } from '@/types/settings';

interface PaymentPolicySettingsProps {
  paymentPolicy: 'sem_pagamento' | 'obrigatorio' | 'opcional';
  onUpdate: (paymentPolicy: 'sem_pagamento' | 'obrigatorio' | 'opcional') => void;
}

const PaymentPolicySettings = ({ paymentPolicy, onUpdate }: PaymentPolicySettingsProps) => {
  // Usar localStorage como fallback se o campo não existir no banco
  const [selectedPolicy, setSelectedPolicy] = useState(() => {
    const stored = localStorage.getItem('payment_policy');
    return stored || paymentPolicy;
  });
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const handlePolicyChange = (value: string) => {
    setSelectedPolicy(value as 'sem_pagamento' | 'obrigatorio' | 'opcional');
  };

  const handleSalvar = async () => {
    setSalvando(true);
    
    try {
      console.log('💾 Salvando política de pagamento:', selectedPolicy);
      
      // Salvar no localStorage como fallback
      localStorage.setItem('payment_policy', selectedPolicy);
      
      // Tentar salvar no banco
      try {
        await onUpdate(selectedPolicy);
      } catch (error) {
        console.warn('⚠️ Erro ao salvar no banco, usando localStorage:', error);
        // Se der erro no banco, pelo menos salvamos no localStorage
      }
      
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (error) {
      console.error('❌ Erro ao salvar política de pagamento:', error);
    } finally {
      setSalvando(false);
    }
  };

  const hasChanges = selectedPolicy !== paymentPolicy;

  const getPolicyDescription = (policy: string) => {
    switch (policy) {
      case 'sem_pagamento':
        return 'Clientes podem agendar sem necessidade de pagamento';
      case 'obrigatorio':
        return 'Clientes devem pagar antecipadamente para confirmar o agendamento';
      case 'opcional':
        return 'Clientes podem escolher se querem pagar ou não ao agendar';
      default:
        return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Política de Pagamento</h3>
          <p className="text-sm text-gray-600">Configure como os clientes devem pagar para agendamentos online</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-gray-700 font-medium">Política de Pagamento</Label>
          <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
            <SelectTrigger className="border-gray-200 focus:border-green-300">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_POLICY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-gray-600">
            {getPolicyDescription(selectedPolicy)}
          </p>
        </div>

        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="w-4 h-4 text-blue-600" />
          <p className="text-sm text-blue-700">
            Esta configuração afeta apenas agendamentos online. Agendamentos feitos diretamente pelo administrador não são afetados.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            onClick={() => onUpdate(selectedPolicy)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Política
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export { PaymentPolicySettings };