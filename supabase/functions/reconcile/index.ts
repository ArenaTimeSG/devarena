// SUPABASE EDGE FUNCTION - RECONCILE
// -----------------------------------------------------------

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface ReconcileResponse {
  success: boolean
  message: string
  data: {
    reconciled: number
    expired: number
    total: number
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔄 [RECONCILE] Iniciando reconciliação de pagamentos pendentes...')

    // Inicializar Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Buscar todos os pagamentos pendentes
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payment_records')
      .select('*')
      .eq('status', 'pending_payment')

    if (pendingError) {
      console.error('❌ [RECONCILE] Erro ao buscar pagamentos pendentes:', pendingError)
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Erro ao buscar pagamentos pendentes',
          data: { reconciled: 0, expired: 0, total: 0 }
        } as ReconcileResponse),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔍 [RECONCILE] Encontrados ${pendingPayments?.length || 0} pagamentos pendentes`)

    let reconciledCount = 0
    let expiredCount = 0

    for (const record of pendingPayments || []) {
      try {
        console.log(`🔍 [RECONCILE] Verificando pagamento: ${record.preference_id}`)

        // Buscar chaves do admin
        const { data: adminKeys, error: keysError } = await supabase
          .from('admin_mercado_pago_keys')
          .select('*')
          .eq('owner_id', record.owner_id)
          .single()

        if (keysError || !adminKeys) {
          console.error(`❌ [RECONCILE] Chaves do admin não encontradas para ${record.owner_id}`)
          continue
        }

        // Buscar pagamentos aprovados via API do Mercado Pago
        const searchResponse = await fetch('https://api.mercadopago.com/v1/payments/search', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${adminKeys.prod_access_token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!searchResponse.ok) {
          console.error(`❌ [RECONCILE] Erro ao buscar pagamentos para ${record.preference_id}:`, searchResponse.status)
          continue
        }

        const searchData = await searchResponse.json()
        const approvedPayment = (searchData.results || []).find((payment: any) => 
          payment.external_reference === record.external_reference && payment.status === 'approved'
        )

        if (approvedPayment) {
          console.log(`✅ [RECONCILE] Pagamento aprovado encontrado: ${approvedPayment.id}`)
          
          // Verificar se o horário ainda está disponível
          const { data: booking } = await supabase
            .from('appointments')
            .select('*')
            .eq('id', record.booking_id)
            .single()

          if (!booking) {
            console.error(`❌ [RECONCILE] Agendamento não encontrado: ${record.booking_id}`)
            continue
          }

          // Verificar se já existe outro agendamento no mesmo horário
          const { data: conflictingBooking } = await supabase
            .from('appointments')
            .select('id')
            .eq('user_id', booking.user_id)
            .eq('date', booking.date)
            .eq('time', booking.time)
            .eq('status', 'confirmed')
            .neq('id', record.booking_id)
            .single()

          if (conflictingBooking) {
            console.warn(`⚠️ [RECONCILE] Conflito de horário detectado: ${record.booking_id}`)
            
            // Atualizar status para conflict_payment
            await supabase
              .from('payment_records')
              .update({ 
                status: 'conflict_payment',
                updated_at: new Date().toISOString()
              })
              .eq('booking_id', record.booking_id)

            await supabase
              .from('appointments')
              .update({ 
                status: 'conflict_payment',
                payment_data: approvedPayment,
                updated_at: new Date().toISOString()
              })
              .eq('id', record.booking_id)

            continue
          }

          // Confirmar agendamento
          const { error: updateError } = await supabase
            .from('appointments')
            .update({
              status: 'confirmed',
              payment_status: 'approved',
              payment_data: approvedPayment,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.booking_id)

          if (updateError) {
            console.error(`❌ [RECONCILE] Erro ao confirmar agendamento ${record.booking_id}:`, updateError)
            continue
          }

          // Atualizar status do registro de pagamento
          await supabase
            .from('payment_records')
            .update({ 
              status: 'confirmed',
              updated_at: new Date().toISOString()
            })
            .eq('booking_id', record.booking_id)

          reconciledCount++
          console.log(`✅ [RECONCILE] Agendamento confirmado: ${record.booking_id}`)

        } else {
          // Verificar se o pagamento expirou
          const now = new Date()
          const expiresAt = new Date(record.expires_at)
          
          if (now > expiresAt) {
            console.log(`⏰ [RECONCILE] Pagamento expirado: ${record.preference_id}`)
            
            // Atualizar status para expirado
            await supabase
              .from('payment_records')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('booking_id', record.booking_id)

            await supabase
              .from('appointments')
              .update({ 
                status: 'expired',
                updated_at: new Date().toISOString()
              })
              .eq('id', record.booking_id)

            expiredCount++
          }
        }
      } catch (error) {
        console.error(`❌ [RECONCILE] Erro ao processar pagamento ${record.preference_id}:`, error)
      }
    }

    console.log(`🎉 [RECONCILE] Reconciliação concluída:`)
    console.log(`   - Pagamentos reconciliados: ${reconciliedCount}`)
    console.log(`   - Pagamentos expirados: ${expiredCount}`)
    console.log(`   - Total processados: ${pendingPayments?.length || 0}`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reconciliação executada com sucesso',
        data: {
          reconciled: reconciledCount,
          expired: expiredCount,
          total: pendingPayments?.length || 0
        }
      } as ReconcileResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ [RECONCILE] Erro durante reconciliação:', error)
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Erro interno do servidor',
        data: { reconciled: 0, expired: 0, total: 0 }
      } as ReconcileResponse),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
