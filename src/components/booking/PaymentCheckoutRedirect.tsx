import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, ExternalLink, CheckCircle, Clock } from 'lucide-react';

interface PaymentCheckoutRedirectProps {
  appointmentId: string;
  userId: string;
  amount: number;
  modalityName: string;
  clientName: string;
  clientEmail: string;
  onPaymentSuccess: () => void;
  mercadoPagoPublicKey?: string;
}

const PaymentCheckoutRedirect: React.FC<PaymentCheckoutRedirectProps> = ({
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
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
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
        throw new Error('Dados do pagamento não encontrados');
      }

      const paymentData = JSON.parse(storedPaymentData);
      console.log('🔍 [FRONTEND] Dados do pagamento:', paymentData);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/create-payment-preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
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
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar preferência de pagamento');
      }

      const data = await response.json();
      console.log('✅ [FRONTEND] Preferência criada:', data);

      setPreferenceId(data.preference_id);
      setPaymentCreated(true);

      toast({
        title: "Link de pagamento criado com sucesso!",
        description: "Clique no botão abaixo para abrir o checkout do Mercado Pago",
      });

    } catch (error) {
      console.error('❌ [FRONTEND] Erro ao criar preferência:', error);
      toast({
        title: "Erro ao criar pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Função para abrir checkout do Mercado Pago
  const openMercadoPagoCheckout = () => {
    if (!preferenceId) {
      toast({
        title: "Erro",
        description: "ID da preferência não encontrado",
        variant: "destructive"
      });
      return;
    }

    console.log('🔗 [FRONTEND] Abrindo checkout do Mercado Pago...');
    
    // URL do checkout do Mercado Pago
    const checkoutUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`;
    
    // Abrir em nova aba
    window.open(checkoutUrl, '_blank');
    
    toast({
      title: "Checkout aberto!",
      description: "Complete o pagamento no Mercado Pago. O agendamento será confirmado automaticamente.",
    });
  };

  if (!paymentCreated) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-6 shadow-sm border">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold">Pagamento</h3>
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

        <Button
          onClick={createPaymentPreference}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando Pagamento...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pagar e Confirmar Reserva
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-green-800">Link de pagamento criado com sucesso!</h3>
        </div>
        
        <p className="text-green-700 mb-4">
          Clique no botão abaixo para abrir o checkout do Mercado Pago
        </p>

        <div className="bg-white rounded-lg p-4 mb-4">
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
              <span className="font-bold text-green-600">
                {formatCurrency(amount)}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={openMercadoPagoCheckout}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir Pagamento
          </Button>
          
          <p className="text-xs text-gray-500 text-center">
            Se a janela de pagamento não abriu, clique no botão acima
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaymentCheckoutRedirect;
