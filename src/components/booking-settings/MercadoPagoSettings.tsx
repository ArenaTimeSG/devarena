import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Save, AlertCircle, Info, Eye, EyeOff, TestTube, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePayment } from '@/hooks/usePayment';
import { useToast } from '@/hooks/use-toast';

interface MercadoPagoSettingsProps {
  mercadoPagoEnabled: boolean;
  accessToken: string;
  publicKey: string;
  webhookUrl: string;
  onUpdate: (settings: {
    mercado_pago_enabled: boolean;
    mercado_pago_access_token: string;
    mercado_pago_public_key: string;
    mercado_pago_webhook_url: string;
  }) => void;
}

const MercadoPagoSettings = ({
  mercadoPagoEnabled,
  accessToken,
  publicKey,
  webhookUrl,
  onUpdate
}: MercadoPagoSettingsProps) => {
  const [isEnabled, setIsEnabled] = useState(mercadoPagoEnabled);
  const [token, setToken] = useState(accessToken);
  const [key, setKey] = useState(publicKey);
  const [webhook, setWebhook] = useState(webhookUrl);
  const [showToken, setShowToken] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [testando, setTestando] = useState(false);
  
  const { createPaymentPreference } = usePayment();
  const { toast } = useToast();

  // Sincronizar estado local com props quando elas mudarem
  useEffect(() => {
    setIsEnabled(mercadoPagoEnabled);
    setToken(accessToken);
    setKey(publicKey);
    setWebhook(webhookUrl);
  }, [mercadoPagoEnabled, accessToken, publicKey, webhookUrl]);

  const handleSalvar = async () => {
    setSalvando(true);
    
    try {
      await onUpdate({
        mercado_pago_enabled: isEnabled,
        mercado_pago_access_token: token,
        mercado_pago_public_key: key,
        mercado_pago_webhook_url: webhook
      });
      
      setSalvo(true);
      setTimeout(() => setSalvo(false), 3000);
    } catch (error) {
      console.error('❌ Erro ao salvar configurações do Mercado Pago:', error);
    } finally {
      setSalvando(false);
    }
  };

  const handleTestarConfiguracao = async () => {
    if (!isEnabled || !token) {
      toast({
        title: 'Configuração Incompleta',
        description: 'Habilite o Mercado Pago e configure o Access Token antes de testar.',
        variant: 'destructive',
      });
      return;
    }

    setTestando(true);
    
    try {
      // Primeiro salvar as configurações atuais
      await onUpdate({
        mercado_pago_enabled: isEnabled,
        mercado_pago_access_token: token,
        mercado_pago_public_key: key,
        mercado_pago_webhook_url: webhook
      });

      // Aguardar um pouco para as configurações serem salvas
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Testar criando uma preferência de pagamento de teste
      const testData = {
        owner_id: '49014464-6ed9-4fee-af45-06105f31698b', // UUID válido para teste
        booking_id: 'test-booking-' + Date.now(), // ID de teste único
        price: 10.00,
        items: [{
          title: 'Teste de Configuração',
          quantity: 1,
          unit_price: 10.00
        }],
        return_url: window.location.origin + '/payment/success'
      };

      console.log('🧪 Testando configuração do Mercado Pago...');
      const result = await createPaymentPreference(testData);
      
      if (result && (result.sandbox_init_point || result.init_point)) {
        toast({
          title: '✅ Configuração Funcionando!',
          description: 'Sua configuração do Mercado Pago está correta e funcionando.',
          duration: 5000,
        });
      } else {
        throw new Error('URL de pagamento não foi retornada');
      }
    } catch (error) {
      console.error('❌ Erro no teste de configuração:', error);
      
      let errorMessage = 'Erro ao testar configuração.';
      
      if (error.message) {
        if (error.message.includes('Mercado Pago não está habilitado')) {
          errorMessage = 'Mercado Pago não está habilitado.';
        } else if (error.message.includes('Access Token')) {
          errorMessage = 'Access Token inválido ou não configurado.';
        } else if (error.message.includes('Configuração do servidor')) {
          errorMessage = 'Problema na configuração do servidor.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: '❌ Erro na Configuração',
        description: errorMessage,
        variant: 'destructive',
        duration: 8000,
      });
    } finally {
      setTestando(false);
    }
  };

  const hasChanges = 
    isEnabled !== mercadoPagoEnabled ||
    token !== accessToken ||
    key !== publicKey ||
    webhook !== webhookUrl;

  const maskToken = (token: string) => {
    if (!token) return '';
    if (token.length <= 8) return token;
    return token.substring(0, 4) + '•'.repeat(token.length - 8) + token.substring(token.length - 4);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
          <CreditCard className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Configurações do Mercado Pago</h3>
          <p className="text-sm text-gray-600">Configure suas credenciais para processar pagamentos</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Toggle de habilitação */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-800">Habilitar Mercado Pago</h4>
            <p className="text-sm text-gray-600">Ativar processamento de pagamentos via Mercado Pago</p>
          </div>
          <Switch
            checked={isEnabled}
            onCheckedChange={setIsEnabled}
            className="data-[state=checked]:bg-blue-600"
          />
        </div>

        {isEnabled && (
          <>
            {/* Access Token */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Access Token</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="APP_USR_1234567890123456-123456-12345678901234567890123456789012-123456"
                className="border-gray-200 focus:border-blue-300"
              />
              <p className="text-sm text-gray-600">
                Token de acesso do Mercado Pago (produção)
              </p>
            </div>

            {/* Public Key */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Public Key</Label>
              <Input
                type="text"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="APP_USR_12345678-1234-1234-1234-123456789012"
                className="border-gray-200 focus:border-blue-300"
              />
              <p className="text-sm text-gray-600">
                Chave pública do Mercado Pago (produção)
              </p>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Webhook URL</Label>
              <Input
                type="text"
                value={webhook}
                onChange={(e) => setWebhook(e.target.value)}
                placeholder="https://xtufbfvrgpzqbvdfmtiy.supabase.co/functions/v1/mercado-pago-webhook"
                className="border-gray-200 focus:border-blue-300"
              />
              <p className="text-sm text-gray-600">
                URL do webhook para receber notificações de pagamento
              </p>
            </div>

            {/* Informações de configuração */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-blue-800 mb-2">Configuração do Webhook</h4>
                  <p className="text-sm text-blue-700 mb-2">
                    No painel do Mercado Pago, configure o webhook para:
                  </p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• URL: <code className="bg-blue-100 px-1 rounded">{webhook || 'URL do webhook'}</code></li>
                    <li>• Eventos: <code className="bg-blue-100 px-1 rounded">payment</code></li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                onClick={handleTestarConfiguracao}
                disabled={testando || !token}
                variant="outline"
                className="flex-1"
              >
                {testando ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Testar Configuração
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => onUpdate({
                  mercado_pago_enabled: isEnabled,
                  mercado_pago_access_token: token,
                  mercado_pago_public_key: key,
                  mercado_pago_webhook_url: webhook
                })}
                disabled={!hasChanges}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </Button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export { MercadoPagoSettings };
