/**
 * Exemplo de teste do sistema de pagamentos Mercado Pago em produção
 * 
 * Este arquivo demonstra como usar todos os endpoints do sistema
 */

const axios = require('axios');

// Configuração
const BASE_URL = 'http://localhost:3000/api';
const ADMIN_ID = 'test-admin-id';
const BOOKING_ID = 'test-booking-id';

// Headers padrão
const headers = {
  'Content-Type': 'application/json',
  'x-user-id': ADMIN_ID
};

async function testProductionSystem() {
  console.log('🚀 Iniciando testes do sistema de pagamentos Mercado Pago\n');

  try {
    // 1. Verificar se admin tem chaves configuradas
    console.log('1️⃣ Verificando se admin tem chaves configuradas...');
    const hasKeysResponse = await axios.get(`${BASE_URL}/admin/keys/check`, { headers });
    console.log('✅ Resposta:', hasKeysResponse.data);
    console.log('');

    // 2. Configurar chaves do admin (se não tiver)
    if (!hasKeysResponse.data.has_keys) {
      console.log('2️⃣ Configurando chaves do admin...');
      const keysData = {
        prod_access_token: 'APP_USR-1234567890-TEST-TOKEN',
        public_key: 'APP_USR-1234567890-TEST-PUBLIC-KEY',
        webhook_secret: 'test-webhook-secret-123'
      };
      
      const saveKeysResponse = await axios.post(`${BASE_URL}/admin/keys`, keysData, { headers });
      console.log('✅ Chaves salvas:', saveKeysResponse.data);
      console.log('');
    }

    // 3. Criar preferência de pagamento
    console.log('3️⃣ Criando preferência de pagamento...');
    const preferenceData = {
      owner_id: ADMIN_ID,
      booking_id: BOOKING_ID,
      price: 50.00,
      items: [
        {
          title: 'Agendamento de Quadra',
          quantity: 1,
          unit_price: 50.00
        }
      ],
      return_url: 'https://your-app.com/payment/result'
    };

    const preferenceResponse = await axios.post(`${BASE_URL}/create-payment-preference`, preferenceData);
    console.log('✅ Preferência criada:', preferenceResponse.data);
    console.log('');

    // 4. Verificar status do agendamento
    console.log('4️⃣ Verificando status do agendamento...');
    const statusResponse = await axios.get(`${BASE_URL}/booking/${BOOKING_ID}/status`);
    console.log('✅ Status do agendamento:', statusResponse.data);
    console.log('');

    // 5. Simular verificação manual de pagamento
    if (preferenceResponse.data.preference_id) {
      console.log('5️⃣ Verificando pagamento manualmente...');
      const verifyResponse = await axios.get(`${BASE_URL}/verify-payment`, {
        params: { preference_id: preferenceResponse.data.preference_id }
      });
      console.log('✅ Status da verificação:', verifyResponse.data);
      console.log('');
    }

    // 6. Executar reconciliação manual
    console.log('6️⃣ Executando reconciliação manual...');
    const reconcileResponse = await axios.post(`${BASE_URL}/admin/reconcile`, {}, { headers });
    console.log('✅ Resultado da reconciliação:', reconcileResponse.data);
    console.log('');

    // 7. Verificar health do sistema
    console.log('7️⃣ Verificando health do sistema...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Status do sistema:', healthResponse.data);
    console.log('');

    console.log('🎉 Todos os testes concluídos com sucesso!');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.response?.data || error.message);
  }
}

// Função para testar webhook
async function testWebhook() {
  console.log('🔔 Testando webhook...\n');

  try {
    const webhookData = {
      type: 'payment',
      data: {
        id: 'test-payment-id',
        preference_id: 'test-preference-id'
      }
    };

    const webhookResponse = await axios.post(`${BASE_URL}/notification/webhook`, webhookData);
    console.log('✅ Webhook processado:', webhookResponse.data);

  } catch (error) {
    console.error('❌ Erro no webhook:', error.response?.data || error.message);
  }
}

// Executar testes
if (require.main === module) {
  testProductionSystem()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      return testWebhook();
    })
    .then(() => {
      console.log('\n✅ Todos os testes finalizados!');
    })
    .catch(console.error);
}

module.exports = {
  testProductionSystem,
  testWebhook
};
