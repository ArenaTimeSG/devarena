import { Request, Response } from 'express';
import { WebhookService } from '../services/webhookService';
import { sanitizeForLogging } from '../middleware/sanitizeLogs';

export const webhook = async (req: Request, res: Response) => {
  console.log('🚀 [WEBHOOK] Webhook recebido do Mercado Pago');
  console.log('📥 [WEBHOOK] Method:', req.method);
  
  // Sanitizar dados antes de logar
  const sanitizedQuery = sanitizeForLogging(req.query);
  const sanitizedBody = sanitizeForLogging(req.body);
  const sanitizedHeaders = sanitizeForLogging(req.headers, ['x-signature', 'authorization']);
  
  console.log('📥 [WEBHOOK] Query:', JSON.stringify(sanitizedQuery, null, 2));
  console.log('📥 [WEBHOOK] Body:', JSON.stringify(sanitizedBody, null, 2));
  console.log('📥 [WEBHOOK] Headers:', JSON.stringify(sanitizedHeaders, null, 2));

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
