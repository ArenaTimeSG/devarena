import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Clock, Loader2 } from 'lucide-react';

export default function PaymentPending() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [appointmentData, setAppointmentData] = useState<any>(null);

  useEffect(() => {
    const processPaymentPending = async () => {
      try {
        // Obter parâmetros da URL
        const paymentId = searchParams.get('payment_id');
        const status = searchParams.get('status');
        const externalReference = searchParams.get('external_reference');

        console.log('⏳ Payment Pending - Parâmetros:', {
          paymentId,
          status,
          externalReference
        });

        // Se há um external_reference, manter o agendamento como pending
        if (externalReference) {
          const { data: appointment, error: appointmentError } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', externalReference)
            .single();

          if (appointmentError) {
            console.error('❌ Erro ao buscar agendamento:', appointmentError);
          } else {
            setAppointmentData(appointment);
          }
        }

        setLoading(false);
      } catch (err) {
        console.error('❌ Erro ao processar pagamento pendente:', err);
        setLoading(false);
      }
    };

    processPaymentPending();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-600 mx-auto mb-4" />
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
        <div className="bg-yellow-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Clock className="w-8 h-8 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Pagamento Pendente
        </h2>
        <p className="text-gray-600 mb-6">
          Seu pagamento está sendo processado. Você receberá uma confirmação por email quando for aprovado.
        </p>
        
        {appointmentData && (
          <div className="bg-white rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Detalhes do Agendamento:</h3>
            <p className="text-sm text-gray-600">
              <strong>Data:</strong> {new Date(appointmentData.date).toLocaleDateString('pt-BR')}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Horário:</strong> {appointmentData.time}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Modalidade:</strong> {appointmentData.modality_name || 'Vôlei'}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Status:</strong> Pendente de confirmação
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    </div>
  );
}
