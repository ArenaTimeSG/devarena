// Tipos para o sistema de clientes

export interface Client {
  id: string;
  name: string;
  email: string;
  password?: string; // Opcional pois não retornamos a senha
  phone?: string;
  created_at: string;
}

export interface CreateClientData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateClientData {
  name?: string;
  email?: string;
  phone?: string;
}

export interface LoginClientData {
  email: string;
  password: string;
}

export interface Agendamento {
  id: string;
  agenda_id: string;
  client_id: string;
  modalidade: string;
  horario: string;
  status: 'pendente' | 'confirmado' | 'cancelado';
  created_at: string;
  updated_at: string;
}

export interface CreateAgendamentoData {
  agenda_id: string;
  client_id: string;
  modalidade: string;
  horario: string;
}

export interface UpdateAgendamentoData {
  status?: 'pendente' | 'confirmado' | 'cancelado';
}
