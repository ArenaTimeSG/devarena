/**
 * Script para executar migração de múltiplas quadras via Supabase
 * Usa Service Role Key para executar SQL diretamente
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
  
  console.log('📄 Lendo arquivo de migração...');
  console.log(`   Arquivo: ${migrationPath}\n`);
  
  try {
    // Dividir SQL em comandos executáveis
    // Para comandos DDL complexos, precisamos executar via RPC ou conexão direta
    // Vamos tentar usar uma função auxiliar do Supabase se disponível
    
    console.log('⚠️  Executando migração via Supabase...');
    console.log('   Nota: Para comandos DDL complexos, pode ser necessário executar manualmente no SQL Editor\n');
    
    // Tentar executar via RPC exec_sql se disponível
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql: migrationSQL 
      });
      
      if (error) {
        throw error;
      }
      
      console.log('✅ Migração executada com sucesso via RPC!\n');
      return true;
      
    } catch (rpcError) {
      // Se RPC não estiver disponível, vamos dividir e executar comandos individuais
      console.log('⚠️  RPC exec_sql não disponível, tentando método alternativo...\n');
      
      // Para comandos DDL complexos com blocos DO $$, precisamos executar manualmente
      // Vamos apenas informar o usuário
      console.log('📝 Como a migração contém comandos DDL complexos (CREATE TABLE, ALTER TABLE, etc.),');
      console.log('   é necessário executá-la manualmente no Supabase SQL Editor.\n');
      console.log('📋 Instruções:');
      console.log('   1. Acesse: https://supabase.com/dashboard');
      console.log('   2. Selecione seu projeto');
      console.log('   3. Vá em "SQL Editor"');
      console.log('   4. Copie e cole o conteúdo do arquivo:');
      console.log(`      ${migrationPath}`);
      console.log('   5. Clique em "RUN"\n');
      
      return false;
    }
    
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error.message);
    console.error('\n📝 Execute manualmente no Supabase SQL Editor:\n');
    console.log('─'.repeat(80));
    console.log(migrationSQL);
    console.log('─'.repeat(80));
    return false;
  }
}

async function verifyMigration() {
  console.log('🔍 Verificando migração...\n');
  
  try {
    // Verificar se a tabela courts existe
    const { data: courtsCheck, error: courtsError } = await supabase
      .from('courts')
      .select('id')
      .limit(1);
    
    if (courtsError && !courtsError.message.includes('does not exist')) {
      console.log('✅ Tabela courts existe!');
    } else if (courtsError) {
      console.log('❌ Tabela courts não encontrada');
      return false;
    } else {
      console.log('✅ Tabela courts existe!');
    }
    
    // Verificar se o campo court_id existe em appointments
    const { data: appointmentsCheck, error: appointmentsError } = await supabase
      .from('appointments')
      .select('court_id')
      .limit(1);
    
    if (appointmentsError && appointmentsError.message.includes('column "court_id" does not exist')) {
      console.log('❌ Campo court_id não encontrado em appointments');
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
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao verificar:', error.message);
    return false;
  }
}

async function main() {
  const executed = await executeMigration();
  
  if (executed) {
    // Aguardar um pouco para garantir que a migração foi processada
    console.log('⏳ Aguardando processamento...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const verified = await verifyMigration();
    
    if (verified) {
      console.log('🎉 Migração executada e verificada com sucesso!');
      console.log('\n✅ Próximos passos:');
      console.log('   1. Recarregue a aplicação');
      console.log('   2. Acesse /settings → "Gerenciar Quadras"');
      console.log('   3. Verifique se a "Quadra 1" aparece');
      console.log('   4. Teste criando uma nova quadra\n');
    } else {
      console.log('⚠️  Migração pode não ter sido executada completamente.');
      console.log('   Execute manualmente no Supabase SQL Editor se necessário.\n');
    }
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { executeMigration, verifyMigration };
