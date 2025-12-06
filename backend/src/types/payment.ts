// Tipos para criação de preferência de pagamento
export interface CreatePreferenceRequest {
  owner_id: string;
  booking_id: string;
  price: number;
  items?: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  return_url?: string;
}

export interface CreatePreferenceResponse {
  success: boolean;
  preference_id: string;
  init_point: string;
  error?: string;
}

// Tipos para configuração de chaves do admin
export interface AdminKeys {
  id: string;
  owner_id: string;
  prod_access_token: string;
  public_key: string;
  webhook_secret: string;
  created_at: string;
  updated_at: string;
}

export interface AdminKeysRequest {
  prod_access_token: string;
  public_key: string;
  webhook_secret: string;
}

// Tipos para registros de pagamento
export interface PaymentRecord {
  id: string;
  booking_id: string;
  owner_id: string;
  preference_id: string;
  init_point: string;
  external_reference: string;
  status: 'pending_payment' | 'confirmed' | 'expired' | 'conflict_payment';
  amount: number;
  currency: string;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

// Tipos para notificações de webhook
export interface WebhookNotification {
  type: string;
  data: {
    id: string;
    preference_id?: string;
  };
}

export interface WebhookNotificationRecord {
  id: string;
  payment_id: string;
  preference_id?: string;
  owner_id?: string;
  booking_id?: string;
  status: string;
  raw_data: any;
  processed_at: string;
  created_at: string;
}

// Tipos para verificação de pagamento
export interface VerifyPaymentResponse {
  status: 'confirmed' | 'not_confirmed' | 'expired' | 'error';
  payment_id?: string;
  booking_id?: string;
  error?: string;
}

// Tipos para status de agendamento
export interface BookingStatusResponse {
  booking_id: string;
  status: 'pending_payment' | 'confirmed' | 'expired' | 'conflict_payment' | 'agendado' | 'cancelado';
  payment_status?: string;
  payment_id?: string;
  preference_id?: string;
  created_at?: string;
  updated_at?: string;
}

// Tipos para dados do Mercado Pago
export interface MercadoPagoPayment {
  id: string;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  payment_method_id: string;
  payment_type_id: string;
  external_reference: string;
  preference_id: string;
  date_approved?: string;
  date_created: string;
  date_last_updated: string;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

export interface MercadoPagoPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  external_reference: string;
  items: Array<{
    title: string;
    quantity: number;
    unit_price: number;
  }>;
  payer: {
    name: string;
    email: string;
  };
  back_urls: {
    success: string;
    failure: string;
    pending: string;
  };
  auto_return: string;
  notification_url: string;
  metadata: {
    owner_id: string;
    booking_id: string;
  };
}
