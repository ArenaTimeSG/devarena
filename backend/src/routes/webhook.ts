import { Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';

export const webhook = async (req: Request, res: Response) => {
  console.log('🚀 [WEBHOOK] Webhook recebido do Mercado Pago');
  console.log('📥 [WEBHOOK] Method:', req.method);
  console.log('📥 [WEBHOOK] Query:', req.query);
  console.log('📥 [WEBHOOK] Body:', JSON.stringify(req.body, null, 2));
  console.log('📥 [WEBHOOK] Headers:', JSON.stringify(req.headers, null, 2));

  try {
    // Processar webhook usando o serviço
    const result = await WebhookService.processWebhook(req);
    
    if (result.success) {
      console.log('✅ [WEBHOOK] Webhook processado com sucesso:', result.message);
      return res.status(200).json(result);
    } else {
      console.error('❌ [WEBHOOK] Erro ao processar webhook:', result.message);
      return res.status(400).json(result);
    }

  } catch (error) {
    console.error('❌ [WEBHOOK] Erro no webhook:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor' 
    });
  }
};
