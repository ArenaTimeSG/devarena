import { Request, Response } from 'express';
import { AdminKeysRequest } from '../types/payment';
import { AdminKeysService } from '../services/adminKeysService';

export const saveAdminKeys = async (req: any, res: Response) => {
  console.log('🔑 [ADMIN-KEYS] Salvando chaves do admin');
  console.log('📥 [ADMIN-KEYS] Dados recebidos:', JSON.stringify(req.body, null, 2));

  try {
    const { prod_access_token, public_key, webhook_secret }: AdminKeysRequest = req.body;
    const owner_id = req.user?.id; // Assumindo que o middleware de auth define req.user

    if (!owner_id) {
      console.error('❌ [ADMIN-KEYS] Usuário não autenticado');
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    // Validar campos obrigatórios
    if (!prod_access_token || !public_key || !webhook_secret) {
      console.error('❌ [ADMIN-KEYS] Campos obrigatórios ausentes');
      return res.status(400).json({
        success: false,
        error: 'Campos obrigatórios: prod_access_token, public_key, webhook_secret'
      });
    }

    // Validar se as chaves são válidas
    console.log('🔍 [ADMIN-KEYS] Validando chaves...');
    const isValid = await AdminKeysService.validateKeys({
      prod_access_token,
      public_key,
      webhook_secret
    });

    if (!isValid) {
      console.error('❌ [ADMIN-KEYS] Chaves inválidas');
      return res.status(400).json({
        success: false,
        error: 'Chaves do Mercado Pago inválidas'
      });
    }

    // Salvar chaves
    const savedKeys = await AdminKeysService.saveAdminKeys(owner_id, {
      prod_access_token,
      public_key,
      webhook_secret
    });

    if (!savedKeys) {
      console.error('❌ [ADMIN-KEYS] Erro ao salvar chaves');
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar chaves'
      });
    }

    console.log('✅ [ADMIN-KEYS] Chaves salvas com sucesso');
    res.json({
      success: true,
      message: 'Chaves salvas com sucesso',
      data: {
        id: savedKeys.id,
        public_key: savedKeys.public_key,
        created_at: savedKeys.created_at,
        updated_at: savedKeys.updated_at
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-KEYS] Erro ao salvar chaves:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

export const getAdminKeys = async (req: any, res: Response) => {
  console.log('🔑 [ADMIN-KEYS] Buscando chaves do admin');

  try {
    const owner_id = req.user?.id; // Assumindo que o middleware de auth define req.user

    if (!owner_id) {
      console.error('❌ [ADMIN-KEYS] Usuário não autenticado');
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const keys = await AdminKeysService.getAdminKeys(owner_id);

    if (!keys) {
      console.log('ℹ️ [ADMIN-KEYS] Chaves não encontradas');
      return res.json({
        success: true,
        has_keys: false,
        message: 'Chaves não configuradas'
      });
    }

    console.log('✅ [ADMIN-KEYS] Chaves encontradas');
    res.json({
      success: true,
      has_keys: true,
      data: {
        id: keys.id,
        public_key: keys.public_key,
        created_at: keys.created_at,
        updated_at: keys.updated_at
      }
    });

  } catch (error) {
    console.error('❌ [ADMIN-KEYS] Erro ao buscar chaves:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};

export const checkAdminKeys = async (req: any, res: Response) => {
  console.log('🔑 [ADMIN-KEYS] Verificando se admin tem chaves configuradas');

  try {
    const owner_id = req.user?.id; // Assumindo que o middleware de auth define req.user

    if (!owner_id) {
      console.error('❌ [ADMIN-KEYS] Usuário não autenticado');
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado'
      });
    }

    const hasKeys = await AdminKeysService.hasAdminKeys(owner_id);

    console.log(`ℹ️ [ADMIN-KEYS] Admin ${owner_id} tem chaves: ${hasKeys}`);
    res.json({
      success: true,
      has_keys: hasKeys
    });

  } catch (error) {
    console.error('❌ [ADMIN-KEYS] Erro ao verificar chaves:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
};
