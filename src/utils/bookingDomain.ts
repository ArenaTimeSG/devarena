// Função utilitária para determinar o domínio correto do link de agendamento
// src/utils/bookingDomain.ts

export const getBookingDomain = (): string => {
  // Se estiver em desenvolvimento local
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5173';
  }
  
  // Se estiver em produção (arenatime.com)
  if (window.location.hostname === 'arenatime.com' || window.location.hostname.includes('arenatime.com')) {
    return 'https://arenatime.com';
  }
  
  // Se estiver no Vercel (arenatimesind.vercel.app)
  if (window.location.hostname.includes('vercel.app')) {
    return 'https://arenatimesind.vercel.app';
  }
  
  // Fallback para o domínio atual
  return window.location.origin;
};

export const getBookingLink = (username: string): string => {
  const domain = getBookingDomain();
  return `${domain}/booking/${username}`;
};
