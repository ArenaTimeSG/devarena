import { Request, Response } from 'express';
import { VerifyPaymentResponse } from '../types/payment';
import { PaymentService } from '../services/paymentService';

export const verifyPayment = async (req: Request, res: Response) => {
  console.log('🔍 [VERIFY-PAYMENT] Verificando pagamento manualmente');
  console.log('📥 [VERIFY-PAYMENT] Query params:', req.query);

  try {
    const { preference_id } = req.query;

    if (!preference_id) {
      console.error('❌ [VERIFY-PAYMENT] Preference ID não fornecido');
      return res.status(400).json({
        status: 'error',
        error: 'Preference ID é obrigatório'
      } as VerifyPaymentResponse);
    }

    console.log('🔍 [VERIFY-PAYMENT] Buscando registro de pagamento:', preference_id);

    // Buscar registro de pagamento
    const record = await PaymentService.findPaymentByPreference(preference_id as string);
    if (!record) {
      console.error('❌ [VERIFY-PAYMENT] Registro de pagamento não encontrado');
      return res.status(404).json({
        status: 'error',
        error: 'Registro de pagamento não encontrado'
      } as VerifyPaymentResponse);
    }

    console.log('✅ [VERIFY-PAYMENT] Registro encontrado:', record.id);
    console.log('📊 [VERIFY-PAYMENT] Status atual:', record.status);

    // Se já está confirmado, retornar status
    if (record.status === 'confirmed') {
      console.log('✅ [VERIFY-PAYMENT] Pagamento já confirmado');
      return res.json({
        status: 'confirmed',
        payment_id: record.id,
        booking_id: record.booking_id
      } as VerifyPaymentResponse);
    }

    // Se expirado, retornar status
    if (record.status === 'expired') {
      console.log('⏰ [VERIFY-PAYMENT] Pagamento expirado');
      return res.json({
        status: 'expired',
        payment_id: record.id,
        booking_id: record.booking_id
      } as VerifyPaymentResponse);
    }

    // Se há conflito, retornar status
    if (record.status === 'conflict_payment') {
      console.log('⚠️ [VERIFY-PAYMENT] Conflito de pagamento');
      return res.json({
        status: 'error',
        error: 'Conflito de horário - pagamento não pode ser confirmado',
        payment_id: record.id,
        booking_id: record.booking_id
      } as VerifyPaymentResponse);
    }

    // Buscar pagamentos aprovados via API do Mercado Pago
    console.log('🔍 [VERIFY-PAYMENT] Buscando pagamentos aprovados na API do MP...');
    const approvedPayment = await PaymentService.searchApprovedPayments(
      record.external_reference,
      record.owner_id
    );

    if (approvedPayment) {
      console.log('✅ [VERIFY-PAYMENT] Pagamento aprovado encontrado:', approvedPayment.id);
      
      // Confirmar agendamento
      const confirmed = await PaymentService.confirmBooking(record.booking_id, approvedPayment);
      
      if (confirmed) {
        console.log('✅ [VERIFY-PAYMENT] Agendamento confirmado com sucesso');
        return res.json({
          status: 'confirmed',
          payment_id: approvedPayment.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse);
      } else {
        console.error('❌ [VERIFY-PAYMENT] Erro ao confirmar agendamento');
        return res.json({
          status: 'error',
          error: 'Erro ao confirmar agendamento',
          payment_id: approvedPayment.id,
          booking_id: record.booking_id
        } as VerifyPaymentResponse);
      }
    } else {
      console.log('⏳ [VERIFY-PAYMENT] Nenhum pagamento aprovado encontrado');
      return res.json({
        status: 'not_confirmed',
        payment_id: record.id,
        booking_id: record.booking_id
      } as VerifyPaymentResponse);
    }

  } catch (error) {
    console.error('❌ [VERIFY-PAYMENT] Erro ao verificar pagamento:', error);
    return res.status(500).json({
      status: 'error',
      error: 'Erro interno do servidor'
    } as VerifyPaymentResponse);
  }
};
