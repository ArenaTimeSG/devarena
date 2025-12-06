import { Request, Response } from 'express';
import { ReconcileService } from '../services/reconcileService';

export const runReconcile = async (req: Request, res: Response) => {
  console.log('🔄 [RECONCILE] Executando reconciliação manual');

  try {
    const result = await ReconcileService.runManualReconcile();

    console.log('✅ [RECONCILE] Reconciliação manual concluída:', result);
    res.json({
      success: true,
      message: 'Reconciliação executada com sucesso',
      data: result
    });

  } catch (error) {
    console.error('❌ [RECONCILE] Erro ao executar reconciliação:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
