import React from 'react';
import PaymentCheckoutNew from '@/components/booking/PaymentCheckoutNew';
import MercadoPagoScript from '@/components/booking/MercadoPagoScript';

const PaymentExample: React.FC = () => {
  const handlePaymentSuccess = () => {
    console.log('🎉 [FRONTEND] Pagamento realizado com sucesso!');
    // Aqui você pode redirecionar ou atualizar a interface
    // Por exemplo: router.push('/success') ou atualizar estado
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      {/* Carregar SDK do Mercado Pago */}
      <MercadoPagoScript publicKey="TEST-12345678-1234-1234-1234-123456789012" />
      
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              PEDRO JUNIOR GREEF FLORES - Agendamento
            </h1>
            <p className="text-gray-600">
              Reserve seu horário de volei
            </p>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Seus Dados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  value="testepgto"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value="testepagamento@gmail.com"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone
                </label>
                <input
                  type="tel"
                  value="(51) 92929-29299"
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                />
              </div>
            </div>
          </div>

          {/* Componente de Pagamento */}
          <PaymentCheckoutNew
            appointmentId="test-appointment-id"
            userId="49014464-6ed9-4fee-af45-06105f31698b"
            amount={1.00}
            modalityName="volei"
            clientName="testepgto"
            clientEmail="testepagamento@gmail.com"
            onPaymentSuccess={handlePaymentSuccess}
          />

          {/* Informações Adicionais */}
          <div className="mt-8 bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">
              Como funciona o pagamento?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Clique em "Agendar e Pagar" para criar o link de pagamento</li>
              <li>• Abra o checkout do Mercado Pago</li>
              <li>• Realize o pagamento (cartão, PIX, etc.)</li>
              <li>• O agendamento será confirmado automaticamente</li>
              <li>• Não é necessário verificar manualmente</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentExample;
