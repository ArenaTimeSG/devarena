import { useState, useEffect } from 'react';

export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      // Detectar por userAgent
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      
      // Detectar por largura da tela
      const isMobileWidth = window.innerWidth < 768;
      
      // Considerar mobile se for userAgent mobile OU largura menor que 768px
      setIsMobile(isMobileUserAgent || isMobileWidth);
    };

    // Verificar na inicialização
    checkIsMobile();

    // Escutar mudanças de tamanho da janela
    window.addEventListener('resize', checkIsMobile);

    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  return isMobile;
};
