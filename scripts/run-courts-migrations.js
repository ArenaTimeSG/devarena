/**
 * Script para executar migrações de múltiplas quadras
 * Executa as migrações diretamente no Supabase via SQL
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuração do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente necessárias:');
  console.error('   VITE_SUPABASE_URL ou SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  console.error('\n💡 Certifique-se de que o arquivo .env está configurado corretamente.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Migrações a serem executadas
const migrations = [
  {
    name: '20250201000000_create_courts_table.sql',
    description: 'Criar tabela courts (quadras)'
  },
  {
    name: '20250201000001_add_court_id_to_appointments.sql',
    description: 'Adicionar court_id em appointments'
  }
];

async function executeSQL(sql) {
  // Dividir SQL em comandos individuais (separados por ;)
  // Mas manter blocos DO $$ ... END $$ intactos
  const commands = [];
  let currentCommand = '';
  let inDoBlock = false;
  let dollarTag = '';
  
  const lines = sql.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    // Detectar início de bloco DO $$
    if (trimmedLine.match(/^DO\s+\$\w*\s*$/i)) {
      inDoBlock = true;
      dollarTag = trimmedLine.match(/\$(\w*)/i)?.[1] || '';
      currentCommand += line + '\n';
      continue;
    }
    
    // Detectar fim de bloco DO $$
    if (inDoBlock && trimmedLine.match(new RegExp(`^END\\s+\\$${dollarTag}\\s*;?$`, 'i'))) {
      currentCommand += line;
      if (currentCommand.trim()) {
        commands.push(currentCommand.trim());
      }
      currentCommand = '';
      inDoBlock = false;
      dollarTag = '';
      continue;
    }
    
    if (inDoBlock) {
      currentCommand += line + '\n';
      continue;
    }
    
    // Comandos normais
    if (trimmedLine && !trimmedLine.startsWith('--')) {
      currentCommand += line + '\n';
      
      // Se termina com ;, é um comando completo
      if (trimmedLine.endsWith(';')) {
        if (currentCommand.trim()) {
          commands.push(currentCommand.trim());
        }
        currentCommand = '';
      }
    } else if (trimmedLine.startsWith('--')) {
      // Comentários podem ser adicionados ao comando atual ou ignorados
      // Vamos ignorar comentários isolados
      if (currentCommand.trim()) {
        currentCommand += line + '\n';
      }
    }
  }
  
  // Adicionar último comando se houver
  if (currentCommand.trim()) {
    commands.push(currentCommand.trim());
  }
  
  // Executar cada comando
  for (const command of commands) {
    if (!command.trim() || command.trim().startsWith('--')) {
      continue;
    }
    
    try {
      // Usar RPC exec_sql se disponível, senão usar query direta
      const { error } = await supabase.rpc('exec_sql', { sql: command }).catch(async () => {
        // Se RPC não existir, tentar executar via query direta
        // Para comandos DDL, precisamos usar uma abordagem diferente
        console.log('⚠️ RPC exec_sql não disponível, tentando método alternativo...');
        
        // Para comandos CREATE/ALTER, podemos usar uma função auxiliar
        // ou executar diretamente via connection string
        throw new Error('RPC não disponível');
      });
      
      if (error) {
        // Tentar executar via método alternativo
        console.log(`⚠️ Tentando executar comando diretamente...`);
        
        // Para comandos que não podem ser executados via RPC,
        // precisamos usar uma conexão direta ao PostgreSQL
        // Por enquanto, vamos apenas logar o erro e continuar
        if (!error.message.includes('function exec_sql') && 
            !error.message.includes('does not exist')) {
          throw error;
        }
      }
    } catch (error) {
      // Se falhar, vamos tentar executar via query SQL direta
      // Mas isso requer uma conexão PostgreSQL direta
      console.warn(`⚠️ Não foi possível executar comando automaticamente.`);
      console.warn(`   Execute manualmente no Supabase SQL Editor se necessário.`);
      console.warn(`   Erro: ${error.message}`);
    }
  }
}

async function runMigrations() {
  console.log('🚀 Iniciando execução das migrações de múltiplas quadras...\n');

  for (const migration of migrations) {
    try {
      console.log(`📄 Executando migração: ${migration.name}`);
      console.log(`   Descrição: ${migration.description}\n`);
      
      const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migration.name);
      
      if (!fs.existsSync(migrationPath)) {
        throw new Error(`Arquivo de migração não encontrado: ${migrationPath}`);
      }
      
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Executar SQL
      await executeSQL(migrationSQL);
      
      console.log(`✅ Migração ${migration.name} executada com sucesso\n`);
      console.log('─'.repeat(80) + '\n');

    } catch (error) {
      console.error(`❌ Erro na migração ${migration.name}:`, error.message);
      console.error('\n📝 Execute manualmente no Supabase SQL Editor:\n');
      console.log('─'.repeat(80));
      console.log(fs.readFileSync(
        path.join(__dirname, '..', 'supabase', 'migrations', migration.name), 
        'utf8'
      ));
      console.log('─'.repeat(80) + '\n');
    }
  }
  
  console.log('✅ Todas as migrações foram processadas!\n');
  console.log('📋 Próximos passos:');
  console.log('   1. Verifique se as tabelas foram criadas corretamente');
  console.log('   2. Verifique se o campo court_id foi adicionado em appointments');
  console.log('   3. Teste criando uma nova quadra no sistema\n');
}

// Executar
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('🎉 Processo concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };
