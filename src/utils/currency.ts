/**
 * Utilitários para formatação de moeda brasileira
 */

/**
 * Formata um valor numérico para o formato brasileiro de moeda
 * @param value - Valor numérico a ser formatado
 * @returns String formatada no formato "R$ XX,XX"
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Formata um valor numérico para o formato brasileiro de moeda sem símbolo
 * @param value - Valor numérico a ser formatado
 * @returns String formatada no formato "XX,XX"
 */
export const formatCurrencyValue = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

/**
 * Converte uma string de valor para número
 * @param value - String contendo valor (ex: "120,50")
 * @returns Número convertido
 */
export const parseCurrencyValue = (value: string): number => {
  // Remove todos os caracteres exceto números e vírgula
  const cleanValue = value.replace(/[^\d,]/g, '');
  
  // Substitui vírgula por ponto para conversão
  const numericValue = cleanValue.replace(',', '.');
  
  return parseFloat(numericValue) || 0;
};

/**
 * Formata modalidade com valor
 * @param modalityName - Nome da modalidade
 * @param value - Valor da modalidade
 * @returns String formatada (ex: "Futsal – R$ 120,00")
 */
export const formatModalityWithValue = (modalityName: string, value: number): string => {
  return `${modalityName} – ${formatCurrency(value)}`;
};

/**
 * Formata modalidade com valor (versão compacta)
 * @param modalityName - Nome da modalidade
 * @param value - Valor da modalidade
 * @returns String formatada (ex: "Futsal (R$ 120,00)")
 */
export const formatModalityWithValueCompact = (modalityName: string, value: number): string => {
  return `${modalityName} (${formatCurrency(value)})`;
};

