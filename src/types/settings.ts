// Types for Settings functionality

export interface ModalityConfig {
  active: boolean;
  color: string;
}

export interface NotificationAlerts {
  booking: boolean;
  cancellation: boolean;
  payment: boolean;
}

export interface DaySchedule {
  start: string;
  end: string;
  enabled: boolean;
}

export interface Schedule {
  [day: string]: DaySchedule;
}

export interface NotificationConfig {
  email: boolean;
  push: boolean;
  alerts: {
    booking: boolean;
    cancellation: boolean;
    payment: boolean;
  };
}

export interface UserProfile {
  name: string;
  email: string;
  phone?: string;
}

export interface Modalities {
  volei: ModalityConfig;
  futsal: ModalityConfig;
  basquete: ModalityConfig;
}

export interface OnlineBookingConfig {
  auto_agendar: boolean;
  tempo_minimo_antecedencia: number;
  duracao_padrao: number;
}

export interface Settings {
  id?: string;
  user_id?: string;
  modalities_enabled: Record<string, boolean>;
  modalities_colors: Record<string, string>;
  working_hours: Schedule;
  default_interval: number;
  time_format_interval: 30 | 60; // 30 for half-hour slots, 60 for full-hour slots
  notifications_enabled: NotificationConfig;
  theme: 'light' | 'dark' | 'custom';
  personal_data: UserProfile;
  online_enabled: boolean;
  online_booking: OnlineBookingConfig;
  payment_policy: 'sem_pagamento' | 'opcional';
  mercado_pago_access_token?: string;
  mercado_pago_public_key?: string;
  mercado_pago_webhook_url?: string;
  mercado_pago_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SettingsUpdate = Partial<Omit<Settings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

// Default settings configuration
export const DEFAULT_SETTINGS: Omit<Settings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  modalities_enabled: {
    volei: true,
    futsal: true,
    basquete: true
  },
  modalities_colors: {
    volei: '#3b82f6', // blue
    futsal: '#10b981', // green
    basquete: '#f59e0b' // amber
  },
  working_hours: {
    sunday: { start: '08:00', end: '18:00', enabled: false },
    monday: { start: '08:00', end: '22:00', enabled: true },
    tuesday: { start: '08:00', end: '22:00', enabled: true },
    wednesday: { start: '08:00', end: '22:00', enabled: true },
    thursday: { start: '08:00', end: '22:00', enabled: true },
    friday: { start: '08:00', end: '22:00', enabled: true },
    saturday: { start: '08:00', end: '18:00', enabled: true }
  },
  default_interval: 60,
  time_format_interval: 60, // Default to full-hour slots
  notifications_enabled: {
    email: true,
    push: false,
    alerts: {
      booking: true,
      cancellation: true,
      payment: true
    }
  },
  personal_data: {
    name: '',
    email: '',
    phone: ''
  },
  theme: 'light',
  online_enabled: false,
  online_booking: {
    auto_agendar: false,
    tempo_minimo_antecedencia: 24,
    duracao_padrao: 60
  },
  payment_policy: 'sem_pagamento',
  mercado_pago_enabled: false
};

// Modality names mapping
export const MODALITY_NAMES: Record<string, string> = {
  volei: 'Vôlei',
  futsal: 'Futsal',
  basquete: 'Basquete'
};

// Interval options
export const INTERVAL_OPTIONS = [
  { value: 30, label: '30 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1 hora e 30 minutos' },
  { value: 120, label: '2 horas' }
];

// Theme options
export const THEME_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Escuro' },
  { value: 'custom', label: 'Personalizado' }
] as const;

// Payment policy options
export const PAYMENT_POLICY_OPTIONS = [
  { value: 'sem_pagamento', label: 'Sem Pagamento' },
  { value: 'opcional', label: 'Pagamento Opcional' },
  { value: 'obrigatorio', label: 'Pagamento Obrigatório' }
] as const;

export const DAY_NAMES: Record<string, string> = {
  sunday: 'Domingo',
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado'
};

// Ordem correta dos dias da semana (domingo a sábado)
export const DAY_ORDER: string[] = [
  'sunday',
  'monday', 
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday'
];


