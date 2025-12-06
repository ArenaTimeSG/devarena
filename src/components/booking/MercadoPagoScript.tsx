import { useEffect } from 'react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface MercadoPagoScriptProps {
  publicKey: string;
}

const MercadoPagoScript: React.FC<MercadoPagoScriptProps> = ({ publicKey }) => {
  useEffect(() => {
    console.log('🚀 [FRONTEND] Iniciando carregamento do SDK do Mercado Pago...');
    console.log('🔑 [FRONTEND] Chave pública:', publicKey);

    // Verificar se o script já foi carregado
    if (window.MercadoPago) {
      console.log('✅ [FRONTEND] SDK do Mercado Pago já carregado');
      // Tentar configurar mesmo se já estiver carregado
      try {
        if (typeof window.MercadoPago.setPublishableKey === 'function') {
          window.MercadoPago.setPublishableKey(publicKey);
          console.log('✅ [FRONTEND] Mercado Pago reconfigurado com chave pública');
        }
      } catch (error) {
        console.error('❌ [FRONTEND] Erro ao reconfigurar Mercado Pago:', error);
      }
      return;
    }

    // Carregar o script do Mercado Pago
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ [FRONTEND] Script do Mercado Pago carregado');
      
      // Aguardar mais tempo para garantir que o SDK esteja totalmente carregado
      setTimeout(() => {
        console.log('🔍 [FRONTEND] Verificando disponibilidade do SDK...');
        console.log('🔍 [FRONTEND] window.MercadoPago:', window.MercadoPago);
        console.log('🔍 [FRONTEND] typeof setPublishableKey:', typeof window.MercadoPago?.setPublishableKey);
        
        if (window.MercadoPago) {
          try {
            // A nova API do Mercado Pago não usa setPublishableKey
            // A chave é passada diretamente no construtor
            console.log('✅ [FRONTEND] SDK do Mercado Pago disponível');
            console.log('✅ [FRONTEND] Mercado Pago pronto para uso com chave:', publicKey);
          } catch (error) {
            console.error('❌ [FRONTEND] Erro ao verificar SDK:', error);
          }
        } else {
          console.error('❌ [FRONTEND] SDK do Mercado Pago não está disponível');
          console.error('❌ [FRONTEND] window.MercadoPago:', window.MercadoPago);
        }
      }, 500); // Aumentar timeout para 500ms
    };
    
    script.onerror = (error) => {
      console.error('❌ [FRONTEND] Erro ao carregar SDK do Mercado Pago:', error);
    };

    document.head.appendChild(script);
    console.log('📝 [FRONTEND] Script do Mercado Pago adicionado ao DOM');

    // Cleanup
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
        console.log('🧹 [FRONTEND] Script do Mercado Pago removido');
      }
    };
  }, [publicKey]);

  return null; // Este componente não renderiza nada
};

export default MercadoPagoScript;
