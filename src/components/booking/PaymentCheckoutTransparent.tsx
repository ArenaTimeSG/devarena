import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface PaymentCheckoutTransparentProps {
  appointmentId: string;
  userId: string;
  amount: number;
  modalityName: string;
  clientName: string;
  clientEmail: string;
  onPaymentSuccess: () => void;
}

const PaymentCheckoutTransparent: React.FC<PaymentCheckoutTransparentProps> = ({
  appointmentId,
  userId,
  amount,
  modalityName,
  clientName,
  clientEmail,
  onPaymentSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentCreated, setPaymentCreated] = useState(false);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para processar pagamento diretamente via API do Mercado Pago
  const processPayment = async (paymentMethod: 'pix' | 'credit_card') => {
    try {
      setIsLoading(true);
      console.log('💳 [FRONTEND] Processando pagamento transparente...');

      // Buscar dados do pagamento do sessionStorage
      const storedPaymentData = sessionStorage.getItem('paymentData');
      if (!storedPaymentData) {
        throw new Error('Dados do pagamento não encontrados');
      }

      const appointmentData = JSON.parse(storedPaymentData);
      console.log('🔍 [FRONTEND] Dados do agendamento:', appointmentData);

      // Gerar ID único para o agendamento
      const appointmentId = `appointment_${Date.now()}_${appointmentData.appointment_data.client_id}`;

      // Dados do pagamento para o Mercado Pago
      const paymentData = {
        transaction_amount: amount,
        description: `Agendamento de ${modalityName}`,
        payment_method_id: paymentMethod,
        payer: {
          email: clientEmail,
          identification: {
            type: "CPF",
            number: "12345678901" // CPF fictício para teste
          }
        },
        external_reference: appointmentId,
        installments: 1,
        capture: true
      };

      console.log('💳 [FRONTEND] Enviando pagamento para Mercado Pago...', paymentData);

      // Fazer requisição via nossa Edge Function (que funciona)
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          owner_id: userId,
          booking_id: appointmentId,
          price: amount,
          items: [{
            title: `Agendamento de ${modalityName}`,
            quantity: 1,
            unit_price: amount
          }],
          return_url: window.location.origin + '/payment/success'
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [FRONTEND] Erro do Mercado Pago:', errorText);
        throw new Error(`Erro do Mercado Pago: ${errorText}`);
      }

      const preference = await response.json();
      console.log('✅ [FRONTEND] Preferência criada:', preference);

      if (preference.success && preference.checkout_url) {
        // Abrir checkout do Mercado Pago
        console.log('🔗 [FRONTEND] Abrindo checkout do Mercado Pago...');
        window.open(preference.checkout_url, '_blank');
        
        setPaymentCreated(true);
        
        toast({
          title: "Checkout Aberto!",
          description: "Complete o pagamento no Mercado Pago. O agendamento será confirmado automaticamente.",
        });
      } else {
        throw new Error('Erro ao criar preferência de pagamento');
      }

    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao processar pagamento:', error);
      toast({
        title: "Erro no Pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (paymentCreated) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">Checkout Aberto!</h3>
          </div>
          
          <p className="text-green-700 mb-4">
            Complete o pagamento no Mercado Pago. O agendamento será confirmado automaticamente após o pagamento.
          </p>

          <div className="bg-white rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Resumo do Pagamento:</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Modalidade:</span>
                <span className="font-medium">{modalityName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-medium">{clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-green-600">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold">Pagamento Transparente</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Modalidade:</span>
            <span className="font-medium">{modalityName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cliente:</span>
            <span className="font-medium">{clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total:</span>
            <span className="font-bold text-lg text-green-600">
              {formatCurrency(amount)}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => processPayment('pix')}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando Pagamento...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pagar com Pix
            </>
          )}
        </Button>

        <Button
          onClick={() => processPayment('credit_card')}
          disabled={isLoading}
          variant="outline"
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando Pagamento...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pagar com Cartão
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PaymentCheckoutTransparent;
