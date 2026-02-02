/**
 * Script para executar migração de múltiplas quadras via Supabase
 * Execute: node scripts/execute-courts-migration.mjs
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente necessárias:');
  console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Certifique-se de que o arquivo .env está configurado.');
  console.error('   Você pode encontrar a SERVICE_ROLE_KEY em:');
  console.error('   Supabase Dashboard → Settings → API → service_role key\n');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeMigration() {
  console.log('🚀 Iniciando execução da migração de múltiplas quadras...\n');
  
  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'COMBINED_COURTS_MIGRATION.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Arquivo de migração não encontrado: ${migrationPath}`);
    process.exit(1);
  }
  
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log('📄 Arquivo de migração encontrado!');
  console.log(`   ${migrationPath}\n`);
  
  // Para comandos DDL complexos, precisamos executar via SQL direto
  // O Supabase JS client não suporta execução direta de DDL
  // Vamos tentar usar uma abordagem alternativa ou fornecer instruções
  
  console.log('⚠️  IMPORTANTE:');
  console.log('   Comandos DDL (CREATE TABLE, ALTER TABLE, etc.) precisam ser executados');
  console.log('   diretamente no Supabase SQL Editor ou via Supabase CLI.\n');
  
  console.log('📋 OPÇÃO 1: Executar via Supabase SQL Editor (Recomendado)');
  console.log('   1. Acesse: https://supabase.com/dashboard');
  console.log('   2. Selecione seu projeto');
  console.log('   3. Vá em "SQL Editor"');
  console.log('   4. Copie e cole o conteúdo do arquivo:');
  console.log(`      ${migrationPath}`);
  console.log('   5. Clique em "RUN"\n');
  
  console.log('📋 OPÇÃO 2: Executar via Supabase CLI');
  console.log('   Se você tem o Supabase CLI instalado:');
  console.log('   supabase db push\n');
  
  // Tentar verificar se já foi executada
  console.log('🔍 Verificando se a migração já foi executada...\n');
  await verifyMigration();
  
  return false;
}

async function verifyMigration() {
  try {
    // Verificar se a tabela courts existe
    const { data: courtsCheck, error: courtsError } = await supabase
      .from('courts')
      .select('id')
      .limit(1);
    
    if (courtsError) {
      if (courtsError.message.includes('does not exist') || 
          courtsError.message.includes('relation') ||
          courtsError.code === 'PGRST116') {
        console.log('❌ Tabela courts ainda não existe');
        console.log('   Execute a migração primeiro.\n');
        return false;
      } else {
        console.log('⚠️  Erro ao verificar:', courtsError.message);
        return false;
      }
    } else {
      console.log('✅ Tabela courts existe!');
    }
    
    // Verificar se o campo court_id existe em appointments
    const { data: appointmentsCheck, error: appointmentsError } = await supabase
      .from('appointments')
      .select('court_id')
      .limit(1);
    
    if (appointmentsError && appointmentsError.message.includes('column "court_id" does not exist')) {
      console.log('❌ Campo court_id ainda não existe em appointments');
      console.log('   Execute a migração primeiro.\n');
      return false;
    } else if (appointmentsError) {
      console.log('⚠️  Erro ao verificar:', appointmentsError.message);
      return false;
    } else {
      console.log('✅ Campo court_id existe em appointments!');
    }
    
    // Contar quadras criadas
    const { count: courtsCount } = await supabase
      .from('courts')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Total de quadras: ${courtsCount || 0}`);
    
    // Contar agendamentos com court_id
    const { count: appointmentsWithCourt } = await supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .not('court_id', 'is', null);
    
    console.log(`✅ Agendamentos com court_id: ${appointmentsWithCourt || 0}\n`);
    
    if (courtsCount > 0 && appointmentsWithCourt !== null) {
      console.log('🎉 Migração já foi executada com sucesso!\n');
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error('❌ Erro ao verificar:', error.message);
    return false;
  }
}

async function main() {
  const verified = await verifyMigration();
  
  if (!verified) {
    await executeMigration();
    console.log('\n📝 Após executar a migração manualmente, execute novamente este script');
    console.log('   para verificar se foi executada com sucesso.\n');
  } else {
    console.log('✅ Sistema está pronto para múltiplas quadras!');
    console.log('\n📋 Próximos passos:');
    console.log('   1. Recarregue a aplicação');
    console.log('   2. Acesse /settings → Aba "Modalidades" → "Gerenciar Quadras"');
    console.log('   3. Verifique se a "Quadra 1" aparece');
    console.log('   4. Teste criando uma nova quadra\n');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
