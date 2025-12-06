import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Loader2, AlertCircle, ExternalLink, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePayment } from '@/hooks/usePayment';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface PaymentCheckoutProductionProps {
  appointmentId?: string;
  userId: string;
  amount: number;
  modalityName: string;
  clientName: string;
  clientEmail: string;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
}

const PaymentCheckoutProduction = ({
  appointmentId,
  userId,
  amount,
  modalityName,
  clientName,
  clientEmail,
  onPaymentSuccess,
  onPaymentCancel
}: PaymentCheckoutProductionProps) => {
  const { createPaymentPreference, isLoading } = usePayment();
  const { toast } = useToast();
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);
  const [isWaitingForPayment, setIsWaitingForPayment] = useState(false);

  // Cleanup do Realtime quando componente for desmontado
  useEffect(() => {
    return () => {
      if ((window as any).realtimeCleanup) {
        (window as any).realtimeCleanup();
        delete (window as any).realtimeCleanup;
      }
    };
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para escutar mudanças na tabela appointments via Realtime
  const setupRealtimeListener = () => {
    console.log('🔍 Configurando listener do Realtime para agendamentos...');
    
    const channel = supabase
      .channel('realtime:appointments')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'appointments' 
        },
        (payload) => {
          console.log('🔔 Novo agendamento inserido via Realtime:', payload.new);
          
          // Verificar se é um agendamento recente (últimos 5 minutos) e aprovado
          const createdAt = new Date(payload.new.created_at);
          const now = new Date();
          const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
          
          if (diffMinutes <= 5 && payload.new.status === 'agendado' && payload.new.payment_status === 'approved') {
            console.log('✅ Agendamento confirmado via Realtime!', payload.new);
            toast({
              title: 'Pagamento Aprovado!',
              description: 'Seu agendamento foi confirmado com sucesso.',
              variant: 'default',
            });
            onPaymentSuccess();
          }
        }
      )
      .subscribe((status) => {
        console.log('🔍 Status da conexão Realtime:', status);
      });

    // Retornar função de cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreatePayment = async () => {
    setIsCreatingPayment(true);
    
    try {
      console.log('💳 Starting payment process...');

      // Buscar dados do pagamento do sessionStorage
      const storedPaymentData = sessionStorage.getItem('paymentData');
      if (!storedPaymentData) {
        console.error('❌ Payment data not found in sessionStorage');
        throw new Error('Dados do pagamento não encontrados');
      }

      const paymentData = JSON.parse(storedPaymentData);
      console.log('💳 Payment data from storage:', paymentData);

      // Criar preferência de pagamento sem appointment_id
      const paymentPreferenceData = {
        user_id: paymentData.user_id,
        amount: paymentData.amount,
        description: paymentData.description,
        client_name: paymentData.client_name,
        client_email: paymentData.client_email,
        // Não passar appointment_id - o agendamento será criado pelo webhook
        appointment_data: paymentData.appointment_data
      };

      console.log('💳 Payment preference data:', paymentPreferenceData);

      const result = await createPaymentPreference(paymentPreferenceData);

      console.log('💳 Payment result:', result);

      if (!result || (!result.init_point && !result.sandbox_init_point)) {
        throw new Error('URL de pagamento não foi retornada');
      }

      // FORCE PRODUCTION URL - never use sandbox
      const url = result.init_point || result.sandbox_init_point;
      setPaymentUrl(url);
      setPaymentCreated(true);

      console.log('🔗 Payment URL:', url);
      
      // Salvar o preference_id no sessionStorage para verificação posterior
      if (result.preference_id) {
        sessionStorage.setItem('lastPaymentPreferenceId', result.preference_id);
        console.log('💾 Preference ID salvo:', result.preference_id);
      }

      // Log the URL type for debugging
      if (url.includes('sandbox')) {
        console.log('⚠️ WARNING: Using sandbox URL - check production configuration');
        toast({
          title: '⚠️ URL de Sandbox',
          description: 'Usando URL de sandbox. Verifique as configurações de produção.',
          variant: 'destructive',
          duration: 5000,
        });
      } else {
        console.log('✅ Using production URL');
      }

      // Configurar listener do Realtime ANTES de abrir a janela
      const cleanup = setupRealtimeListener();
      
      // Armazenar função de cleanup para usar quando necessário
      (window as any).realtimeCleanup = cleanup;

      // Try to open payment window
      const paymentWindow = window.open(url, 'MercadoPago', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (paymentWindow) {
        console.log('✅ Payment window opened successfully');
        console.log('🔍 Aguardando confirmação via webhook...');
        setIsWaitingForPayment(true);
        
        // Mostrar mensagem de aguardando pagamento
        toast({
          title: 'Aguardando Pagamento',
          description: 'Estamos processando seu pagamento. Seu agendamento será confirmado automaticamente assim que o pagamento for aprovado.',
          variant: 'default',
        });
      } else {
        console.warn('⚠️ Could not open payment window - popup blocker detected');
        toast({
          title: 'Bloqueador de Pop-ups Detectado',
          description: 'Por favor, permita pop-ups para este site ou use o link direto abaixo.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      
      let errorMessage = 'Não foi possível processar o pagamento.';
      
      if (error.message) {
        if (error.message.includes('Mercado Pago not configured')) {
          errorMessage = 'Mercado Pago não está configurado para esta quadra.';
        } else if (error.message.includes('Mercado Pago not enabled')) {
          errorMessage = 'Mercado Pago não está habilitado.';
        } else if (error.message.includes('Missing required fields')) {
          errorMessage = 'Dados do pagamento incompletos.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Erro no Pagamento',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPayment(false);
    }
  };

  const handleOpenPaymentLink = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200/60 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">
                  Pagamento Seguro
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Processado pelo Mercado Pago
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Resumo do Pagamento */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Resumo do Pagamento</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Modalidade:</span>
                  <span className="font-medium">{modalityName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cliente:</span>
                  <span className="font-medium">{clientName}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-green-600">
                  <span>Total:</span>
                  <span>{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>

            {/* Status de Aguardando Pagamento */}
            {isWaitingForPayment && (
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Aguardando Pagamento</h4>
                    <p className="text-sm text-blue-700">
                      Complete o pagamento no Mercado Pago. O agendamento será confirmado automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Métodos Aceitos */}
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-semibold text-blue-800 mb-2">Métodos Aceitos</h4>
              <div className="flex gap-3">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Cartão</span>
                </div>
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">PIX</span>
                </div>
              </div>
            </div>

            {/* Pagamento Seguro */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-800 mb-1">Pagamento Seguro</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• Dados protegidos com criptografia SSL</li>
                    <li>• Processado pelo Mercado Pago</li>
                    <li>• Agendamento confirmado automaticamente</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="space-y-3">
              {!paymentCreated ? (
                <Button
                  onClick={handleCreatePayment}
                  disabled={isCreatingPayment}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {isCreatingPayment ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Pagar com Mercado Pago
                    </>
                  )}
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700 text-center">
                      ✅ Link de pagamento criado com sucesso!
                    </p>
                  </div>
                  
                  <Button
                    onClick={handleOpenPaymentLink}
                    className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Abrir Pagamento
                  </Button>
                </div>
              )}
              
              <Button
                onClick={onPaymentCancel}
                variant="outline"
                className="w-full border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Button>
            </div>

            {/* Link direto se disponível */}
            {paymentUrl && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-4 h-4 text-blue-600 mr-2" />
                  <p className="text-sm font-medium text-blue-800">
                    Link de Pagamento Direto
                  </p>
                </div>
                <p className="text-sm text-blue-700 mb-3">
                  Se a janela de pagamento não abriu, clique no botão acima ou use o link:
                </p>
                <details className="mt-3">
                  <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                    Ver URL completa
                  </summary>
                  <p className="text-xs text-blue-600 mt-1 break-all font-mono bg-blue-100 p-2 rounded">
                    {paymentUrl}
                  </p>
                </details>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export { PaymentCheckoutProduction };
