import { supabase } from '../config/supabase';
import { PaymentRecord, MercadoPagoPayment } from '../types/payment';
import { AdminKeysService } from './adminKeysService';
import axios from 'axios';

export class PaymentService {
  /**
   * Cria um registro de pagamento no banco
   */
  static async createPaymentRecord(data: {
    booking_id: string;
    owner_id: string;
    preference_id: string;
    init_point: string;
    external_reference: string;
    amount: number;
    currency?: string;
  }): Promise<PaymentRecord | null> {
    try {
      const { data: record, error } = await supabase
        .from('payment_records')
        .insert({
          booking_id: data.booking_id,
          owner_id: data.owner_id,
          preference_id: data.preference_id,
          init_point: data.init_point,
          external_reference: data.external_reference,
          amount: data.amount,
          currency: data.currency || 'BRL',
          status: 'pending_payment',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30 minutos
        })
        .select()
        .single();

      if (error) {
        console.error('❌ [PAYMENT-SERVICE] Erro ao criar registro de pagamento:', error);
        return null;
      }

      return record;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro inesperado:', error);
      return null;
    }
  }

  /**
   * Busca um registro de pagamento por preference_id
   */
  static async findPaymentByPreference(preferenceId: string): Promise<PaymentRecord | null> {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('preference_id', preferenceId)
        .single();

      if (error) {
        console.error('❌ [PAYMENT-SERVICE] Erro ao buscar pagamento:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro inesperado:', error);
      return null;
    }
  }

  /**
   * Busca todos os pagamentos pendentes
   */
  static async getPendingPayments(): Promise<PaymentRecord[]> {
    try {
      const { data, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('status', 'pending_payment')
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ [PAYMENT-SERVICE] Erro ao buscar pagamentos pendentes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro inesperado:', error);
      return [];
    }
  }

  /**
   * Confirma um agendamento após pagamento aprovado
   */
  static async confirmBooking(bookingId: string, payment: MercadoPagoPayment): Promise<boolean> {
    try {
      // Verificar se o horário ainda está disponível
      const { data: booking, error: bookingError } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', bookingId)
        .single();

      if (bookingError || !booking) {
        console.error('❌ [PAYMENT-SERVICE] Agendamento não encontrado:', bookingError);
        return false;
      }

      // Verificar se já existe outro agendamento no mesmo horário
      const { data: conflictingBooking } = await supabase
        .from('appointments')
        .select('id')
        .eq('user_id', booking.user_id)
        .eq('date', booking.date)
        .eq('time', booking.time)
        .eq('status', 'confirmed')
        .neq('id', bookingId)
        .single();

      if (conflictingBooking) {
        console.warn('⚠️ [PAYMENT-SERVICE] Conflito de horário detectado');
        
        // Atualizar status para conflict_payment
        await this.updatePaymentRecordStatus(bookingId, 'conflict_payment');
        await supabase
          .from('appointments')
          .update({ 
            status: 'conflict_payment',
            payment_data: payment,
            updated_at: new Date().toISOString()
          })
          .eq('id', bookingId);

        return false;
      }

      // Confirmar o agendamento
      const { error: updateError } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed',
          payment_status: 'approved',
          payment_data: payment,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) {
        console.error('❌ [PAYMENT-SERVICE] Erro ao confirmar agendamento:', updateError);
        return false;
      }

      // Atualizar status do registro de pagamento
      await this.updatePaymentRecordStatus(bookingId, 'confirmed');

      console.log('✅ [PAYMENT-SERVICE] Agendamento confirmado com sucesso:', bookingId);
      return true;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro inesperado:', error);
      return false;
    }
  }

  /**
   * Atualiza o status de um registro de pagamento
   */
  static async updatePaymentRecordStatus(bookingId: string, status: PaymentRecord['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('payment_records')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      if (error) {
        console.error('❌ [PAYMENT-SERVICE] Erro ao atualizar status do pagamento:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro inesperado:', error);
      return false;
    }
  }

  /**
   * Busca pagamentos aprovados via API do Mercado Pago
   */
  static async searchApprovedPayments(externalReference: string, ownerId: string): Promise<MercadoPagoPayment | null> {
    try {
      const adminKeys = await AdminKeysService.getAdminKeys(ownerId);
      if (!adminKeys) {
        console.error('❌ [PAYMENT-SERVICE] Chaves do admin não encontradas');
        return null;
      }

      const response = await axios.get('https://api.mercadopago.com/v1/payments/search', {
        params: { external_reference: externalReference },
        headers: { 
          'Authorization': `Bearer ${adminKeys.prod_access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const approvedPayment = (response.data.results || []).find((payment: MercadoPagoPayment) => 
        payment.status === 'approved'
      );

      return approvedPayment || null;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro ao buscar pagamentos:', error);
      return null;
    }
  }

  /**
   * Expira pagamentos pendentes que passaram do prazo
   */
  static async expirePendingPayments(): Promise<number> {
    try {
      const { data: expiredPayments, error } = await supabase
        .from('payment_records')
        .select('*')
        .eq('status', 'pending_payment')
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('❌ [PAYMENT-SERVICE] Erro ao buscar pagamentos expirados:', error);
        return 0;
      }

      let expiredCount = 0;
      for (const payment of expiredPayments || []) {
        // Atualizar status do registro
        await this.updatePaymentRecordStatus(payment.booking_id, 'expired');
        
        // Atualizar status do agendamento
        await supabase
          .from('appointments')
          .update({ 
            status: 'expired',
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.booking_id);

        expiredCount++;
      }

      console.log(`⏰ [PAYMENT-SERVICE] ${expiredCount} pagamentos expirados`);
      return expiredCount;
    } catch (error) {
      console.error('❌ [PAYMENT-SERVICE] Erro inesperado:', error);
      return 0;
    }
  }
}
