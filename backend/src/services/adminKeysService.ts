import { supabase } from '../config/supabase';
import { AdminKeys, AdminKeysRequest } from '../types/payment';
import crypto from 'crypto';

export class AdminKeysService {
  /**
   * Busca as chaves de produção do admin
   */
  static async getAdminKeys(ownerId: string): Promise<AdminKeys | null> {
    try {
      const { data, error } = await supabase
        .from('admin_mercado_pago_keys')
        .select('*')
        .eq('owner_id', ownerId)
        .single();

      if (error) {
        console.error('❌ [ADMIN-KEYS] Erro ao buscar chaves:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [ADMIN-KEYS] Erro inesperado:', error);
      return null;
    }
  }

  /**
   * Salva ou atualiza as chaves de produção do admin
   */
  static async saveAdminKeys(ownerId: string, keys: AdminKeysRequest): Promise<AdminKeys | null> {
    try {
      // Criptografar o access token antes de salvar
      const encryptedAccessToken = this.encryptToken(keys.prod_access_token);
      const encryptedWebhookSecret = this.encryptToken(keys.webhook_secret);

      const { data, error } = await supabase
        .from('admin_mercado_pago_keys')
        .upsert({
          owner_id: ownerId,
          prod_access_token: encryptedAccessToken,
          public_key: keys.public_key,
          webhook_secret: encryptedWebhookSecret,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [ADMIN-KEYS] Erro ao salvar chaves:', error);
        return null;
      }

      // Descriptografar para retorno
      return {
        ...data,
        prod_access_token: this.decryptToken(data.prod_access_token),
        webhook_secret: this.decryptToken(data.webhook_secret)
      };
    } catch (error) {
      console.error('❌ [ADMIN-KEYS] Erro inesperado:', error);
      return null;
    }
  }

  /**
   * Verifica se o admin tem chaves configuradas
   */
  static async hasAdminKeys(ownerId: string): Promise<boolean> {
    const keys = await this.getAdminKeys(ownerId);
    return keys !== null;
  }

  /**
   * Criptografa um token usando AES-256-GCM
   */
  private static encryptToken(token: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('admin-keys', 'utf8'));
    
    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Descriptografa um token usando AES-256-GCM
   */
  private static decryptToken(encryptedToken: string): string {
    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
    
    const parts = encryptedToken.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('admin-keys', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Valida se as chaves fornecidas são válidas
   */
  static async validateKeys(keys: AdminKeysRequest): Promise<boolean> {
    try {
      // Testar o access token fazendo uma requisição simples para a API do MP
      const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
        headers: {
          'Authorization': `Bearer ${keys.prod_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.ok;
    } catch (error) {
      console.error('❌ [ADMIN-KEYS] Erro ao validar chaves:', error);
      return false;
    }
  }
}
