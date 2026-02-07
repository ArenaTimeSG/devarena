import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { CreatePreferenceRequest, CreatePreferenceResponse } from '../types/payment';
import { AdminKeysService } from '../services/adminKeysService';
import { PaymentService } from '../services/paymentService';
import mercadopago from 'mercadopago';
import { validateCreatePreference, validate } from '../middleware/validators';
import { sanitizeForLogging } from '../middleware/sanitizeLogs';

const createPreferenceHandler = async (req: Request, res: Response) => {
    console.log('🚀 [CREATE-PREFERENCE] Iniciando criação de preferência');
    
    // Sanitizar dados antes de logar
    const sanitizedBody = sanitizeForLogging(req.body);
    console.log('📥 [CREATE-PREFERENCE] Dados recebidos:', JSON.stringify(sanitizedBody, null, 2));

  try {
    const { owner_id, booking_id, price, items, return_url }: CreatePreferenceRequest = req.body;

    // Validar campos obrigatórios
    if (!owner_id || !booking_id || !price) {
      console.error('❌ [CREATE-PREFERENCE] Campos obrigatórios ausentes');
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: owner_id, booking_id, price'
      } as CreatePreferenceResponse);
    }

    // Buscar chaves de produção do admin
    console.log('🔑 [CREATE-PREFERENCE] Buscando chaves do admin:', owner_id);
    const adminKeys = await AdminKeysService.getAdminKeys(owner_id);
    if (!adminKeys) {
      console.error('❌ [CREATE-PREFERENCE] Admin não configurado com chaves de produção');
      return res.status(400).json({
        success: false,
        error: 'Owner não configurado com chaves de produção'
      } as CreatePreferenceResponse);
    }

    // Verificar se o agendamento existe
    console.log('🔍 [CREATE-PREFERENCE] Verificando se agendamento existe:', booking_id);
    const { data: booking, error: bookingError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('❌ [CREATE-PREFERENCE] Agendamento não encontrado:', bookingError);
      return res.status(404).json({
        success: false,
        error: 'Agendamento não encontrado'
      } as CreatePreferenceResponse);
    }

    console.log('✅ [CREATE-PREFERENCE] Agendamento encontrado:', booking.id);

    // Configurar Mercado Pago com as chaves do admin
    (mercadopago as any).configure({
      access_token: adminKeys.prod_access_token,
    });

    // Criar preferência do Mercado Pago
    console.log('💳 [CREATE-PREFERENCE] Criando preferência no Mercado Pago...');
    
    const preference = {
      items: items || [{ 
        title: 'Agendamento', 
        quantity: 1, 
        unit_price: parseFloat(price.toString()) 
      }],
      external_reference: booking_id,
      back_urls: { 
        success: return_url || `${process.env.FRONTEND_URL || 'https://arenatimesind.vercel.app'}/payment/success`, 
        failure: return_url || `${process.env.FRONTEND_URL || 'https://arenatimesind.vercel.app'}/payment/failure`, 
        pending: return_url || `${process.env.FRONTEND_URL || 'https://arenatimesind.vercel.app'}/payment/pending` 
      },
      auto_return: 'approved',
      notification_url: `${process.env.WEBHOOK_URL || 'https://arenatimesind.vercel.app'}/api/webhook`,
      metadata: { owner_id, booking_id }
    };

    // Sanitizar preferência antes de logar (remove access_token)
    const sanitizedPreference = sanitizeForLogging(preference);
    console.log('💳 [CREATE-PREFERENCE] Dados da preferência:', JSON.stringify(sanitizedPreference, null, 2));

    const mpResp = await (mercadopago as any).preferences.create(preference);
    const preferenceData = mpResp.body;

    console.log('✅ [CREATE-PREFERENCE] Preferência criada com sucesso!');
    console.log('🆔 [CREATE-PREFERENCE] Preference ID:', preferenceData.id);
    console.log('🔗 [CREATE-PREFERENCE] External Reference (Booking ID):', booking_id);
    console.log('💰 [CREATE-PREFERENCE] Valor:', price);

    // Criar registro de pagamento no banco
    const paymentRecord = await PaymentService.createPaymentRecord({
      booking_id,
      owner_id,
      preference_id: preferenceData.id,
      init_point: preferenceData.init_point,
      external_reference: booking_id,
      amount: parseFloat(price.toString())
    });

    if (!paymentRecord) {
      console.error('❌ [CREATE-PREFERENCE] Erro ao criar registro de pagamento');
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar registro de pagamento'
      } as CreatePreferenceResponse);
    }

    // Atualizar agendamento com status pending_payment
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'pending_payment',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id);

    if (updateError) {
      console.error('⚠️ [CREATE-PREFERENCE] Erro ao atualizar agendamento:', updateError);
    } else {
      console.log('✅ [CREATE-PREFERENCE] Agendamento atualizado com status pending_payment');
    }

    const responseData: CreatePreferenceResponse = {
      success: true,
      preference_id: preferenceData.id,
      init_point: preferenceData.init_point
    };

    console.log('📤 [CREATE-PREFERENCE] Retornando resposta:', responseData);
    res.json(responseData);

  } catch (error: any) {
    const sanitizedError = sanitizeForLogging(error);
    console.error('❌ [CREATE-PREFERENCE] Erro ao criar preferência:', sanitizedError);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    } as CreatePreferenceResponse);
  }
};

// Exportar com validação
export const createPreference = [
  ...validateCreatePreference,
  validate,
  createPreferenceHandler
] as any;
