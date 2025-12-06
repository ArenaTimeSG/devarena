import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CreditCard, CheckCircle, AlertCircle } from 'lucide-react';

interface PaymentCheckoutDirectProps {
  appointmentId: string;
  userId: string;
  amount: number;
  modalityName: string;
  clientName: string;
  clientEmail: string;
  onPaymentSuccess: () => void;
}

const PaymentCheckoutDirect: React.FC<PaymentCheckoutDirectProps> = ({
  appointmentId,
  userId,
  amount,
  modalityName,
  clientName,
  clientEmail,
  onPaymentSuccess
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'approved' | 'rejected' | null>(null);
  const [paymentData, setPaymentData] = useState<any>(null);
  const { toast } = useToast();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para processar pagamento diretamente
  const processPayment = async (paymentMethod: 'pix' | 'credit_card') => {
    try {
      setIsLoading(true);
      console.log('💳 [FRONTEND] Processando pagamento direto...');

      // Buscar dados do pagamento do sessionStorage
      const storedPaymentData = sessionStorage.getItem('paymentData');
      if (!storedPaymentData) {
        throw new Error('Dados do pagamento não encontrados');
      }

      const appointmentData = JSON.parse(storedPaymentData);
      console.log('🔍 [FRONTEND] Dados do agendamento:', appointmentData);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/process-payment-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount,
          description: `Agendamento de ${modalityName}`,
          client_name: clientName,
          client_email: clientEmail,
          payment_method_id: paymentMethod,
          appointment_data: appointmentData.appointment_data
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao processar pagamento');
      }

      const data = await response.json();
      console.log('✅ [FRONTEND] Pagamento processado:', data);

      setPaymentData(data);
      setPaymentStatus(data.payment_status);

      if (data.payment_status === 'approved') {
        toast({
          title: "Pagamento Aprovado!",
          description: "Seu agendamento foi confirmado com sucesso.",
        });
        onPaymentSuccess();
      } else if (data.payment_status === 'pending') {
        toast({
          title: "Pagamento Pendente",
          description: "Aguarde a confirmação do pagamento. Você receberá uma notificação quando for aprovado.",
        });
      } else {
        toast({
          title: "Pagamento Rejeitado",
          description: "O pagamento não foi aprovado. Tente novamente.",
          variant: "destructive"
        });
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

  if (paymentStatus === 'approved') {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-green-800">Pagamento Aprovado!</h3>
          </div>
          
          <p className="text-green-700 mb-4">
            Seu agendamento foi confirmado com sucesso.
          </p>

          {paymentData?.appointment && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Detalhes do Agendamento:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Data:</span>
                  <span className="font-medium">{new Date(paymentData.appointment.date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Horário:</span>
                  <span className="font-medium">{paymentData.appointment.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Modalidade:</span>
                  <span className="font-medium">{paymentData.appointment.modality_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total:</span>
                  <span className="font-bold text-green-600">{formatCurrency(paymentData.appointment.valor_total)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (paymentStatus === 'pending') {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-800">Pagamento Pendente</h3>
          </div>
          
          <p className="text-yellow-700 mb-4">
            Seu pagamento está sendo processado. Você receberá uma notificação quando for aprovado.
          </p>

          {paymentData?.payment && (
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Detalhes do Pagamento:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID do Pagamento:</span>
                  <span className="font-medium">{paymentData.payment.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-medium">{paymentData.payment.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor:</span>
                  <span className="font-bold text-green-600">{formatCurrency(amount)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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

export default PaymentCheckoutDirect;
