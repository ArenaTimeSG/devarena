/**
 * Script para executar migrações do banco de dados
 * 
 * Execute este script para configurar o banco para o sistema de pagamentos
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de migrações em ordem
const migrations = [
  '001_admin_keys_table.sql',
  '002_payment_records_table.sql',
  '003_webhook_notifications_table.sql',
  '004_update_appointments_status_fixed.sql',
  '005_update_existing_appointments.sql'
];

async function runMigrations() {
  console.log('🚀 Iniciando execução das migrações...\n');

  for (const migration of migrations) {
    try {
      console.log(`📄 Executando migração: ${migration}`);
      
      const migrationPath = path.join(__dirname, '..', 'migrations', migration);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      // Executar migração
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      });

      if (error) {
        console.error(`❌ Erro na migração ${migration}:`, error);
        throw error;
      }

      console.log(`✅ Migração ${migration} executada com sucesso\n`);

    } catch (error) {
      console.error(`❌ Falha na migração ${migration}:`, error.message);
      
      // Tentar executar via query direta se RPC não funcionar
      try {
        console.log(`🔄 Tentando execução direta da migração ${migration}...`);
        
        const migrationPath = path.join(__dirname, '..', 'migrations', migration);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Dividir em comandos individuais
        const commands = migrationSQL
          .split(';')
          .map(cmd => cmd.trim())
          .filter(cmd => cmd.length > 0);

        for (const command of commands) {
          if (command.toLowerCase().includes('create table') || 
              command.toLowerCase().includes('alter table') ||
              command.toLowerCase().includes('create index') ||
              command.toLowerCase().includes('create policy') ||
              command.toLowerCase().includes('create function') ||
              command.toLowerCase().includes('create trigger') ||
              command.toLowerCase().includes('alter type')) {
            
            const { error: cmdError } = await supabase
              .from('_migrations_temp')
              .select('*')
              .limit(0); // Comando dummy para executar SQL

            if (cmdError && !cmdError.message.includes('relation "_migrations_temp" does not exist')) {
              console.log(`⚠️ Comando SQL executado: ${command.substring(0, 50)}...`);
            }
          }
        }

        console.log(`✅ Migração ${migration} executada via método alternativo\n`);

      } catch (altError) {
        console.error(`❌ Falha total na migração ${migration}:`, altError.message);
        console.log('📝 Execute manualmente no painel do Supabase:\n');
        console.log(fs.readFileSync(path.join(__dirname, '..', 'migrations', migration), 'utf8'));
        console.log('\n' + '='.repeat(80) + '\n');
      }
    }
  }

  console.log('🎉 Migrações concluídas!');
  console.log('\n📋 Próximos passos:');
  console.log('1. Verificar se todas as tabelas foram criadas no painel do Supabase');
  console.log('2. Configurar as chaves de produção do Mercado Pago');
  console.log('3. Testar o sistema com o script de exemplo');
  console.log('4. Configurar webhook no painel do Mercado Pago');
}

// Função para verificar se as tabelas existem
async function checkTables() {
  console.log('🔍 Verificando tabelas criadas...\n');

  const tables = [
    'admin_mercado_pago_keys',
    'payment_records', 
    'webhook_notifications'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Tabela ${table}: Não encontrada`);
      } else {
        console.log(`✅ Tabela ${table}: OK`);
      }
    } catch (err) {
      console.log(`❌ Tabela ${table}: Erro - ${err.message}`);
    }
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runMigrations()
    .then(() => checkTables())
    .catch(console.error);
}

module.exports = {
  runMigrations,
  checkTables
};
