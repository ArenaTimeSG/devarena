// Types for User Profile functionality
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  username: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserProfile {
  name: string;
  email: string;
  phone?: string;
  username: string;
  role?: 'admin' | 'user';
}

export interface UpdateUserProfile {
  name?: string;
  email?: string;
  phone?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface SignUpData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  username: string;
}

export interface SignUpValidation {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  username: string;
}

export interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  phone?: string;
  username?: string;
  general?: string;
}

// Validation functions
export const validateEmail = (email: string): string | null => {
  if (!email) {
    return 'Email é obrigatório';
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return 'Email inválido';
  }
  
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) {
    return 'Senha é obrigatória';
  }
  
  if (password.length < 6) {
    return 'Senha deve ter pelo menos 6 caracteres';
  }
  
  if (password.length > 50) {
    return 'Senha deve ter no máximo 50 caracteres';
  }
  
  return null;
};

export const validateConfirmPassword = (password: string, confirmPassword: string): string | null => {
  if (!confirmPassword) {
    return 'Confirmação de senha é obrigatória';
  }
  
  if (password !== confirmPassword) {
    return 'Senhas não coincidem';
  }
  
  return null;
};

export const validateName = (name: string): string | null => {
  if (!name) {
    return 'Nome é obrigatório';
  }
  
  if (name.length < 2) {
    return 'Nome deve ter pelo menos 2 caracteres';
  }
  
  if (name.length > 100) {
    return 'Nome deve ter no máximo 100 caracteres';
  }
  
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) {
    return null; // Telefone é opcional
  }
  
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  if (cleanPhone.length < 10) {
    return 'Telefone deve ter pelo menos 10 dígitos';
  }
  
  if (cleanPhone.length > 11) {
    return 'Telefone deve ter no máximo 11 dígitos';
  }
  
  return null;
};

export const validateUsername = (username: string): string | null => {
  if (!username) {
    return 'Username é obrigatório';
  }
  
  if (username.length < 3) {
    return 'Username deve ter pelo menos 3 caracteres';
  }
  
  if (username.length > 50) {
    return 'Username deve ter no máximo 50 caracteres';
  }
  
  // Apenas letras, números e hífens
  const usernameRegex = /^[a-zA-Z0-9-]+$/;
  if (!usernameRegex.test(username)) {
    return 'Username deve conter apenas letras, números e hífens';
  }
  
  // Não pode começar ou terminar com hífen
  if (username.startsWith('-') || username.endsWith('-')) {
    return 'Username não pode começar ou terminar com hífen';
  }
  
  // Não pode ter hífens consecutivos
  if (username.includes('--')) {
    return 'Username não pode ter hífens consecutivos';
  }
  
  return null;
};

export const validateSignUpData = (data: SignUpValidation): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  // Validar email
  const emailError = validateEmail(data.email);
  if (emailError) {
    errors.email = emailError;
  }
  
  // Validar senha
  const passwordError = validatePassword(data.password);
  if (passwordError) {
    errors.password = passwordError;
  }
  
  // Validar confirmação de senha
  const confirmPasswordError = validateConfirmPassword(data.password, data.confirmPassword);
  if (confirmPasswordError) {
    errors.confirmPassword = confirmPasswordError;
  }
  
  // Validar nome
  const nameError = validateName(data.name);
  if (nameError) {
    errors.name = nameError;
  }
  
  // Validar username
  const usernameError = validateUsername(data.username);
  if (usernameError) {
    errors.username = usernameError;
  }
  
  // Validar telefone
  const phoneError = validatePhone(data.phone);
  if (phoneError) {
    errors.phone = phoneError;
  }
  
  return errors;
};

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Formata o telefone
  if (cleanPhone.length === 11) {
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
  } else if (cleanPhone.length === 10) {
    return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 6)}-${cleanPhone.slice(6)}`;
  }
  
  return phone;
};

// Clean phone number (remove formatting)
export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

// Generate username from name
export const generateUsername = (name: string): string => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens consecutivos
    .replace(/^-|-$/g, ''); // Remove hífens no início e fim
};

// Check if username is available
export const checkUsernameAvailability = async (username: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('username', username)
      .single();
    
    return !data; // Se não retornou dados, username está disponível
  } catch (error) {
    return true; // Em caso de erro, assume que está disponível
  }
};

