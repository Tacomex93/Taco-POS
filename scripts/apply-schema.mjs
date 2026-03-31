/**
 * Aplica supabase/schema.sql contra Postgres (Supabase).
 *
 * Requiere en .env.local o entorno:
 *   DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
 * (URI en Project Settings → Database → Connection string → URI)
 *
 * Uso: npm run db:sync
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env.local');

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error(
    'Falta DATABASE_URL. Añade en .env.local la cadena Postgres (modo sesión o directa) de Supabase.'
  );
  process.exit(1);
}

const schemaPath = path.join(root, 'supabase', 'schema.sql');
if (!fs.existsSync(schemaPath)) {
  console.error('No se encontró:', schemaPath);
  process.exit(1);
}

const sql = fs.readFileSync(schemaPath, 'utf8');

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
});

async function main() {
  console.log('Conectando a Postgres…');
  await client.connect();
  console.log('Aplicando supabase/schema.sql …');
  await client.query(sql);
  console.log('Listo: tablas, índices, triggers y políticas RLS aplicados (idempotente donde aplica).');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
