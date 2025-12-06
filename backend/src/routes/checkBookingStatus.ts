import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { BookingStatusResponse } from '../types/payment';

export const checkBookingStatus = async (req: Request, res: Response) => {
  console.log('🔍 [CHECK-STATUS] Verificando status do agendamento');
  
  try {
    const { id: bookingId } = req.params;

    if (!bookingId) {
      console.error('❌ [CHECK-STATUS] ID do agendamento não fornecido');
      return res.status(400).json({ error: 'ID do agendamento é obrigatório' });
    }

    console.log('🔍 [CHECK-STATUS] Buscando agendamento:', bookingId);

    // Buscar agendamento no Supabase
    const { data: booking, error: bookingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [CHECK-STATUS] Agendamento não encontrado:', bookingError);
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    console.log('✅ [CHECK-STATUS] Agendamento encontrado:', booking.id);
    console.log('📊 [CHECK-STATUS] Status atual:', booking.status);
    console.log('💳 [CHECK-STATUS] Status do pagamento:', booking.payment_status);

    // Buscar dados do pagamento se existir
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('appointment_id', bookingId)
      .single();

    const response: BookingStatusResponse = {
      booking_id: booking.id,
      status: booking.status,
      payment_status: booking.payment_status,
      payment_id: payment?.mercado_pago_payment_id,
      created_at: booking.created_at,
      updated_at: booking.updated_at
    };

    console.log('📤 [CHECK-STATUS] Retornando status:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ [CHECK-STATUS] Erro ao verificar status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};
