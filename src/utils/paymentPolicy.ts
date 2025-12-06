// Utilitários para política de pagamento

export type PaymentPolicy = 'sem_pagamento' | 'opcional';

export const PAYMENT_POLICY_VALUES: PaymentPolicy[] = ['sem_pagamento', 'opcional'];

export const PAYMENT_POLICY_OPTIONS = [
  { value: 'sem_pagamento' as PaymentPolicy, label: 'Sem Pagamento' },
  { value: 'opcional' as PaymentPolicy, label: 'Pagamento Opcional' }
] as const;

export const PAYMENT_POLICY_LABELS: Record<PaymentPolicy, string> = {
  sem_pagamento: 'Sem Pagamento',
  opcional: 'Pagamento Opcional'
};

export const PAYMENT_POLICY_DESCRIPTIONS: Record<PaymentPolicy, string> = {
  sem_pagamento: 'Os clientes não precisam pagar para fazer agendamentos',
  opcional: 'Os clientes podem escolher se querem pagar ou não'
};

/**
 * Valida se um valor é uma política de pagamento válida
 * @param value - Valor a ser validado
 * @returns true se for válido, false caso contrário
 */
export function isValidPaymentPolicy(value: any): value is PaymentPolicy {
  return typeof value === 'string' && PAYMENT_POLICY_VALUES.includes(value as PaymentPolicy);
}

/**
 * Valida e retorna uma política de pagamento, com fallback para valor padrão
 * @param value - Valor a ser validado
 * @param defaultValue - Valor padrão caso o valor seja inválido
 * @returns Política de pagamento válida
 */
export function validatePaymentPolicy(
  value: any, 
  defaultValue: PaymentPolicy = 'sem_pagamento'
): PaymentPolicy {
  return isValidPaymentPolicy(value) ? value : defaultValue;
}

/**
 * Obtém o label de uma política de pagamento
 * @param policy - Política de pagamento
 * @returns Label formatado
 */
export function getPaymentPolicyLabel(policy: PaymentPolicy): string {
  return PAYMENT_POLICY_LABELS[policy] || 'Desconhecido';
}

/**
 * Obtém a descrição de uma política de pagamento
 * @param policy - Política de pagamento
 * @returns Descrição da política
 */
export function getPaymentPolicyDescription(policy: PaymentPolicy): string {
  return PAYMENT_POLICY_DESCRIPTIONS[policy] || 'Política não definida';
}


/**
 * Verifica se o pagamento é opcional baseado na política
 * @param policy - Política de pagamento
 * @returns true se o pagamento for opcional
 */
export function isPaymentOptional(policy: PaymentPolicy): boolean {
  return policy === 'opcional';
}

/**
 * Verifica se não há pagamento baseado na política
 * @param policy - Política de pagamento
 * @returns true se não há pagamento
 */
export function isNoPayment(policy: PaymentPolicy): boolean {
  return policy === 'sem_pagamento';
}
