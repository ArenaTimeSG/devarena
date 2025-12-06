import { PaymentService } from './paymentService';
import cron from 'node-cron';

export class ReconcileService {
  private static isRunning = false;

  /**
   * Inicia o serviço de reconciliação
   */
  static start(): void {
    console.log('🔄 [RECONCILE-SERVICE] Iniciando serviço de reconciliação');

    // Executar a cada 5 minutos
    cron.schedule('*/5 * * * *', async () => {
      await this.reconcilePending();
    });

    // Executar imediatamente na inicialização
    setTimeout(() => {
      this.reconcilePending();
    }, 10000); // 10 segundos após inicialização

    console.log('✅ [RECONCILE-SERVICE] Serviço de reconciliação iniciado');
  }

  /**
   * Reconcilia pagamentos pendentes
   */
  static async reconcilePending(): Promise<void> {
    if (this.isRunning) {
      console.log('⏳ [RECONCILE-SERVICE] Reconciliação já em execução, pulando...');
      return;
    }

    this.isRunning = true;
    console.log('🔄 [RECONCILE-SERVICE] Iniciando reconciliação de pagamentos pendentes...');

    try {
      // Buscar todos os pagamentos pendentes
      const pendingPayments = await PaymentService.getPendingPayments();
      console.log(`🔍 [RECONCILE-SERVICE] Encontrados ${pendingPayments.length} pagamentos pendentes`);

      let reconciledCount = 0;
      let expiredCount = 0;

      for (const record of pendingPayments) {
        try {
          console.log(`🔍 [RECONCILE-SERVICE] Verificando pagamento: ${record.preference_id}`);

          // Buscar pagamentos aprovados via API do Mercado Pago
          const approvedPayment = await PaymentService.searchApprovedPayments(
            record.external_reference,
            record.owner_id
          );

          if (approvedPayment) {
            console.log(`✅ [RECONCILE-SERVICE] Pagamento aprovado encontrado: ${approvedPayment.id}`);
            
            // Confirmar agendamento
            const confirmed = await PaymentService.confirmBooking(record.booking_id, approvedPayment);
            
            if (confirmed) {
              reconciledCount++;
              console.log(`✅ [RECONCILE-SERVICE] Agendamento confirmado: ${record.booking_id}`);
            } else {
              console.log(`⚠️ [RECONCILE-SERVICE] Erro ao confirmar agendamento: ${record.booking_id}`);
            }
          } else {
            // Verificar se o pagamento expirou
            const now = new Date();
            const expiresAt = new Date(record.expires_at);
            
            if (now > expiresAt) {
              console.log(`⏰ [RECONCILE-SERVICE] Pagamento expirado: ${record.preference_id}`);
              
              // Atualizar status para expirado
              await PaymentService.updatePaymentRecordStatus(record.booking_id, 'expired');
              expiredCount++;
            }
          }
        } catch (error) {
          console.error(`❌ [RECONCILE-SERVICE] Erro ao processar pagamento ${record.preference_id}:`, error);
        }
      }

      console.log(`🎉 [RECONCILE-SERVICE] Reconciliação concluída:`);
      console.log(`   - Pagamentos reconciliados: ${reconciliedCount}`);
      console.log(`   - Pagamentos expirados: ${expiredCount}`);
      console.log(`   - Total processados: ${pendingPayments.length}`);

    } catch (error) {
      console.error('❌ [RECONCILE-SERVICE] Erro durante reconciliação:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Executa reconciliação manual (para testes ou execução sob demanda)
   */
  static async runManualReconcile(): Promise<{ reconciled: number; expired: number; total: number }> {
    console.log('🔄 [RECONCILE-SERVICE] Executando reconciliação manual...');

    const pendingPayments = await PaymentService.getPendingPayments();
    let reconciledCount = 0;
    let expiredCount = 0;

    for (const record of pendingPayments) {
      try {
        const approvedPayment = await PaymentService.searchApprovedPayments(
          record.external_reference,
          record.owner_id
        );

        if (approvedPayment) {
          const confirmed = await PaymentService.confirmBooking(record.booking_id, approvedPayment);
          if (confirmed) {
            reconciledCount++;
          }
        } else {
          const now = new Date();
          const expiresAt = new Date(record.expires_at);
          
          if (now > expiresAt) {
            await PaymentService.updatePaymentRecordStatus(record.booking_id, 'expired');
            expiredCount++;
          }
        }
      } catch (error) {
        console.error(`❌ [RECONCILE-SERVICE] Erro ao processar ${record.preference_id}:`, error);
      }
    }

    return {
      reconciled: reconciledCount,
      expired: expiredCount,
      total: pendingPayments.length
    };
  }

  /**
   * Para o serviço de reconciliação
   */
  static stop(): void {
    console.log('🛑 [RECONCILE-SERVICE] Parando serviço de reconciliação');
    // O cron job será parado automaticamente quando o processo terminar
  }
}
