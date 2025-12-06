import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, CheckCircle } from 'lucide-react';

interface PaymentCheckoutNewProps {
  appointmentId: string;
  userId: string;
  amount: number;
  modalityName: string;
  clientName: string;
  clientEmail: string;
  onPaymentSuccess: () => void;
  mercadoPagoPublicKey?: string;
}

const PaymentCheckoutNew: React.FC<PaymentCheckoutNewProps> = ({
  appointmentId,
  userId,
  amount,
  modalityName,
  clientName,
  clientEmail,
  onPaymentSuccess,
  mercadoPagoPublicKey
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para criar preferência de pagamento
  const createPaymentPreference = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 [FRONTEND] Criando preferência de pagamento...');

      // Buscar dados do pagamento do sessionStorage
      console.log('🔍 [FRONTEND] Buscando dados do sessionStorage...');
      const storedPaymentData = sessionStorage.getItem('paymentData');
      console.log('🔍 [FRONTEND] Dados encontrados no sessionStorage:', storedPaymentData);
      
      if (!storedPaymentData) {
        console.error('❌ Payment data not found in sessionStorage');
        console.error('❌ Available sessionStorage keys:', Object.keys(sessionStorage));
        throw new Error('Dados do pagamento não encontrados');
      }

      const paymentData = JSON.parse(storedPaymentData);
      console.log('💳 Payment data from storage:', paymentData);

      const requestData = {
        owner_id: paymentData.user_id,
        booking_id: appointmentId,
        price: paymentData.amount,
        items: [{
          title: paymentData.description || `Agendamento de ${modalityName}`,
          quantity: 1,
          unit_price: paymentData.amount
        }],
        return_url: window.location.origin + '/payment/success'
      };

      console.log('📤 [FRONTEND] Dados sendo enviados:', requestData);
      console.log('📤 [FRONTEND] appointment_data:', paymentData.appointment_data);
      console.log('📤 [FRONTEND] appointment_data type:', typeof paymentData.appointment_data);
      console.log('📤 [FRONTEND] appointment_data keys:', paymentData.appointment_data ? Object.keys(paymentData.appointment_data) : 'null');
      
      // Usar chave anon do ambiente
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      console.log('🔑 [FRONTEND] Chave anon:', anonKey ? 'Presente' : 'Ausente');

      const response = await fetch('https://ogzlvdpdngwbgqeiayec.supabase.co/functions/v1/create-payment-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar preferência');
      }

      const result = await response.json();
      console.log('✅ [FRONTEND] Preferência criada:', result);
      
      setPreferenceId(result.preference_id);
      setPaymentCreated(true);
      
      toast({
        title: 'Link de pagamento criado com sucesso!',
        description: 'Clique em "Abrir Pagamento" para finalizar.',
        variant: 'default',
      });

    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao criar preferência:', error);
      toast({
        title: 'Erro ao criar pagamento',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para abrir checkout do Mercado Pago
  const openMercadoPagoCheckout = () => {
    if (!preferenceId) {
      toast({
        title: 'Erro',
        description: 'Preferência não encontrada',
        variant: 'destructive',
      });
      return;
    }

    try {
      console.log('💳 [FRONTEND] Abrindo checkout do Mercado Pago...');
      console.log('🔑 [FRONTEND] Preference ID:', preferenceId);
      
      // Abrir checkout diretamente usando a URL do Mercado Pago
      // Não precisamos do SDK para isso
      const initPointUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`;
      console.log('🔗 [FRONTEND] URL do checkout:', initPointUrl);
      
      const paymentWindow = window.open(initPointUrl, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (paymentWindow) {
        console.log('✅ [FRONTEND] Checkout aberto com sucesso');
        
        // Iniciar polling automático do status
        startStatusPolling();
        
        // Mostrar mensagem de aguardo
        toast({
          title: 'Checkout aberto!',
          description: 'Complete o pagamento no Mercado Pago. O agendamento será confirmado automaticamente.',
          variant: 'default',
        });
      } else {
        console.warn('⚠️ [FRONTEND] Popup bloqueado, mas URL está disponível');
        toast({
          title: 'Popup Bloqueado',
          description: 'Permita pop-ups para este site ou use o link direto.',
          variant: 'destructive',
        });
      }
      
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao abrir checkout:', error);
      toast({
        title: 'Erro ao abrir pagamento',
        description: 'Tente novamente',
        variant: 'destructive',
      });
    }
  };

  // Função para verificar status do pagamento via preference_id
  const checkPaymentStatus = async () => {
    try {
      console.log('🔍 [FRONTEND] Verificando status do pagamento...');
      console.log('🔍 [FRONTEND] Preference ID:', preferenceId);
      
      // Verificar se temos um preferenceId válido
      if (!preferenceId || preferenceId.trim() === '') {
        console.warn('⚠️ [FRONTEND] Preference ID não disponível');
        toast({
          title: 'Erro',
          description: 'ID da preferência não encontrado.',
          variant: 'destructive',
        });
        return;
      }
      
      // Verificar status do pagamento na tabela payments
      const response = await fetch(`https://ogzlvdpdngwbgqeiayec.supabase.co/functions/v1/check-payment-status-simple`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          preference_id: preferenceId
        })
      });
      
      if (!response.ok) {
        throw new Error('Erro ao verificar status do pagamento');
      }
      
      const status = await response.json();
      console.log('📊 [FRONTEND] Status do pagamento:', status);
      
      if (status.status === 'approved' && status.appointment_id) {
        toast({
          title: 'Pagamento confirmado!',
          description: 'Seu agendamento foi confirmado com sucesso.',
          variant: 'default',
        });
        onPaymentSuccess();
      } else if (status.status === 'failed' || status.status === 'rejected') {
        toast({
          title: 'Pagamento não aprovado',
          description: 'O pagamento não foi processado. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Aguardando confirmação...',
          description: 'O agendamento será confirmado automaticamente após o pagamento.',
          variant: 'default',
        });
      }
      
      return status;
    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao verificar status do pagamento:', error);
      toast({
        title: 'Aguardando confirmação...',
        description: 'O agendamento será confirmado automaticamente após o pagamento.',
        variant: 'default',
      });
    }
  };

  // Função para iniciar polling automático do status
  const startStatusPolling = () => {
    if (!preferenceId) return;
    
    console.log('🔄 [FRONTEND] Iniciando polling automático do status...');
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`https://ogzlvdpdngwbgqeiayec.supabase.co/functions/v1/check-payment-status-simple`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            preference_id: preferenceId
          })
        });
        
        if (response.ok) {
          const status = await response.json();
          console.log('🔄 [FRONTEND] Polling - Status:', status);
          
          if (status.status === 'approved' && status.appointment_id) {
            console.log('✅ [FRONTEND] Pagamento aprovado via polling!');
            clearInterval(pollInterval);
            toast({
              title: 'Pagamento confirmado!',
              description: 'Seu agendamento foi confirmado com sucesso.',
              variant: 'default',
            });
            onPaymentSuccess();
          } else if (status.status === 'failed' || status.status === 'rejected') {
            console.log('❌ [FRONTEND] Pagamento rejeitado via polling');
            clearInterval(pollInterval);
            toast({
              title: 'Pagamento não aprovado',
              description: 'O pagamento não foi processado. Tente novamente.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Erro no polling:', error);
      }
    }, 5000); // Verificar a cada 5 segundos
    
    // Parar polling após 5 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
      console.log('⏰ [FRONTEND] Polling automático finalizado');
    }, 300000);
  };

  if (paymentCreated) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Link de pagamento criado com sucesso!
          </h3>
          <p className="text-gray-600 text-sm">
            Clique no botão abaixo para abrir o checkout do Mercado Pago
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Resumo do Pagamento</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <div>Modalidade: {modalityName}</div>
              <div>Cliente: {clientName}</div>
              <div>Total: {formatCurrency(amount)}</div>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={openMercadoPagoCheckout}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Abrir Pagamento
            </Button>
            
                <Button
                  onClick={checkPaymentStatus}
                  variant="outline"
                  className="w-full"
                >
                  Verificar Status
                </Button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>Se a janela de pagamento não abriu, clique no botão acima</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md mx-auto">
      <div className="text-center mb-6">
        <CreditCard className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Pagamento Seguro
        </h3>
        <p className="text-gray-600 text-sm">
          Processado pelo Mercado Pago
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Resumo do Pagamento</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Modalidade: {modalityName}</div>
            <div>Cliente: {clientName}</div>
            <div>Total: {formatCurrency(amount)}</div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={createPaymentPreference}
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Criando Pagamento...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4 mr-2" />
                Agendar e Pagar
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex items-center">
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
            Dados protegidos com criptografia SSL
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
            Processado pelo Mercado Pago
          </div>
          <div className="flex items-center">
            <CheckCircle className="h-3 w-3 text-green-500 mr-1" />
            Agendamento confirmado automaticamente
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckoutNew;
