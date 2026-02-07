import { supabase } from '../config/supabase';
import { WebhookNotificationRecord, MercadoPagoPayment } from '../types/payment';
import { AdminKeysService } from './adminKeysService';
import { PaymentService } from './paymentService';
import axios from 'axios';
import crypto from 'crypto';

export class WebhookService {
  /**
   * Verifica a assinatura do webhook
   */
  static verifySignature(req: any, secret: string): boolean {
    try {
      const signature = req.headers['x-signature'];
      if (!signature || !secret) {
        console.warn('⚠️ [WEBHOOK-SERVICE] Assinatura ou secret não fornecidos');
        return false;
      }

      const payload = JSON.stringify(req.body);
      const computed = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(computed),
        Buffer.from(signature)
      );
    } catch (error) {
      console.error('❌ [WEBHOOK-SERVICE] Erro ao verificar assinatura:', error);
      return false;
    }
  }

  /**
   * Busca detalhes do pagamento na API do Mercado Pago
   */
  static async getPaymentDetails(paymentId: string, ownerId: string): Promise<MercadoPagoPayment | null> {
    try {
      const adminKeys = await AdminKeysService.getAdminKeys(ownerId);
      if (!adminKeys) {
        console.error('❌ [WEBHOOK-SERVICE] Chaves do admin não encontradas');
        return null;
      }

      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { 
          'Authorization': `Bearer ${adminKeys.prod_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('❌ [WEBHOOK-SERVICE] Erro ao buscar detalhes do pagamento:', error);
      return null;
    }
  }

  /**
   * Salva uma notificação de webhook (para idempotência)
   */
  static async saveNotification(data: {
    payment_id: string;
    preference_id?: string;
    owner_id?: string;
    booking_id?: string;
    status: string;
    raw_data: any;
  }): Promise<WebhookNotificationRecord | null> {
    try {
      const { data: notification, error } = await supabase
        .from('webhook_notifications')
        .insert({
          payment_id: data.payment_id,
          preference_id: data.preference_id,
          owner_id: data.owner_id,
          booking_id: data.booking_id,
          status: data.status,
          raw_data: data.raw_data,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [WEBHOOK-SERVICE] Erro ao salvar notificação:', error);
        return null;
      }

      return notification;
    } catch (error) {
      console.error('❌ [WEBHOOK-SERVICE] Erro inesperado:', error);
      return null;
    }
  }

  /**
   * Verifica se uma notificação já foi processada
   */
  static async findNotification(paymentId: string): Promise<WebhookNotificationRecord | null> {
    try {
      const { data, error } = await supabase
        .from('webhook_notifications')
        .select('*')
        .eq('payment_id', paymentId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ [WEBHOOK-SERVICE] Erro ao buscar notificação:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [WEBHOOK-SERVICE] Erro inesperado:', error);
      return null;
    }
  }

  /**
   * Processa uma notificação de webhook
   */
  static async processWebhook(req: any): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      const paymentId = req.body?.data?.id;
      if (!paymentId) {
        return { success: false, message: 'Payment ID não encontrado' };
      }

      console.log('💳 [WEBHOOK-SERVICE] Processando pagamento ID:', paymentId);

      // Identificar o dono da preferência
      const preferenceId = req.body?.data?.preference_id;
      const paymentRecord = preferenceId ? await PaymentService.findPaymentByPreference(preferenceId) : null;
      const ownerId = paymentRecord?.owner_id;

      if (!ownerId) {
        return { success: false, message: 'Owner não encontrado' };
      }

      // Buscar chaves do admin
      const adminKeys = await AdminKeysService.getAdminKeys(ownerId);
      if (!adminKeys) {
        return { success: false, message: 'Chaves do admin não encontradas' };
      }

      // Verificar se já foi processado (idempotência)
      const existingNotification = await this.findNotification(paymentId);
      if (existingNotification) {
        console.log('ℹ️ [WEBHOOK-SERVICE] Notificação já processada:', paymentId);
        return { success: true, message: 'Notificação já processada' };
      }

      // Validar assinatura (OBRIGATÓRIO em produção)
      const isValidSignature = this.verifySignature(req, adminKeys.webhook_secret);
      if (!isValidSignature) {
        console.warn('⚠️ [WEBHOOK-SERVICE] Assinatura inválida para pagamento:', paymentId);
        
        // Em produção, rejeitar webhooks sem assinatura válida
        if (process.env.NODE_ENV === 'production') {
          return { 
            success: false, 
            message: 'Assinatura de webhook inválida' 
          };
        }
        // Em desenvolvimento, apenas avisar mas continuar
      }

      // Buscar detalhes do pagamento
      const payment = await this.getPaymentDetails(paymentId, ownerId);
      if (!payment) {
        return { success: false, message: 'Erro ao buscar detalhes do pagamento' };
      }

      // Salvar notificação
      await this.saveNotification({
        payment_id: paymentId,
        preference_id: preferenceId,
        owner_id: ownerId,
        booking_id: paymentRecord?.booking_id,
        status: payment.status,
        raw_data: payment
      });

      // Processar baseado no status
      if (payment.status === 'approved') {
        console.log('✅ [WEBHOOK-SERVICE] Pagamento aprovado - Confirmando agendamento');
        
        const confirmed = await PaymentService.confirmBooking(paymentRecord!.booking_id, payment);
        if (confirmed) {
          return { 
            success: true, 
            message: 'Pagamento aprovado e agendamento confirmado',
            data: {
              booking_id: paymentRecord!.booking_id,
              payment_id: paymentId,
              status: 'approved'
            }
          };
        } else {
          return { 
            success: false, 
            message: 'Erro ao confirmar agendamento',
            data: {
              booking_id: paymentRecord!.booking_id,
              payment_id: paymentId,
              status: 'conflict_payment'
            }
          };
        }
      } else {
        console.log(`ℹ️ [WEBHOOK-SERVICE] Status do pagamento: ${payment.status}`);
        return { 
          success: true, 
          message: `Pagamento com status: ${payment.status}`,
          data: {
            payment_id: paymentId,
            status: payment.status
          }
        };
      }

    } catch (error) {
      console.error('❌ [WEBHOOK-SERVICE] Erro ao processar webhook:', error);
      return { success: false, message: 'Erro interno do servidor' };
    }
  }
}
