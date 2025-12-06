import mercadopago from 'mercadopago';

const accessToken = process.env.MP_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error('❌ Token de acesso do Mercado Pago não configurado');
}

// Configurar Mercado Pago
(mercadopago as any).configure({
  access_token: accessToken,
});

console.log('✅ Mercado Pago configurado com sucesso');

export { mercadopago };
