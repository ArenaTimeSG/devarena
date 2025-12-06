import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { XCircle, Loader2 } from 'lucide-react';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  useEffect(() => {
    const processPaymentFailure = async () => {
      try {
        // Obter parâmetros da URL
        const paymentId = searchParams.get('payment_id');
        const status = searchParams.get('status');
        const externalReference = searchParams.get('external_reference');

        console.log('❌ Payment Failure - Parâmetros:', {
          paymentId,
          status,
          externalReference
        });

        // Se há um external_reference, remover o agendamento temporário
        if (externalReference) {
          const { error: deleteError } = await supabase
            .from('appointments')
            .delete()
            .eq('id', externalReference)
            .eq('status', 'pending');

          if (deleteError) {
            console.error('❌ Erro ao remover agendamento temporário:', deleteError);
          } else {
            console.log('✅ Agendamento temporário removido');
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Erro ao processar falha do pagamento:', err);
        setLoading(false);
      }
    };

    processPaymentFailure();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Processando...
          </h2>
          <p className="text-gray-600">
            Aguarde enquanto processamos a informação
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <XCircle className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Pagamento Não Realizado
        </h2>
        <p className="text-gray-600 mb-6">
          O pagamento não foi processado. Seu agendamento não foi confirmado.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar Novamente
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
