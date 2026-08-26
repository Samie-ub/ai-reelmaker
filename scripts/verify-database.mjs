import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = ['projects', 'project_versions', 'ai_generations', 'generation_feedback', 'reel_memories'];
const EMBEDDING_DIMENSIONS = 768;
const apiOnly = process.argv.includes('--api-only');

const parseEnv = (text) => Object.fromEntries(text
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith('#') && line.includes('='))
  .map((line) => {
    const separator = line.indexOf('=');
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    const quoted = (raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"));
    return [key, quoted ? raw.slice(1, -1) : raw];
  }));

const loadConfiguration = async () => {
  const fileValues = {};
  for (const filename of ['.env', '.env.local']) {
    try { Object.assign(fileValues, parseEnv(await readFile(resolve(filename), 'utf8'))); }
    catch (error) { if (error?.code !== 'ENOENT') throw error; }
  }
  return {
    url: process.env.VITE_SUPABASE_URL?.trim() || fileValues.VITE_SUPABASE_URL?.trim(),
    key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || fileValues.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  };
};

const pass = (message) => console.log(`\u001B[32m✓\u001B[0m ${message}`);
const info = (message) => console.log(`\u001B[36m•\u001B[0m ${message}`);
const fail = (message) => console.error(`\u001B[31m✗\u001B[0m ${message}`);
const timedFetch = (input, init = {}) => fetch(input, {
  ...init,
  signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
});

const main = async () => {
  console.log('\nReelMaker database verification\n');
  const { url, key } = await loadConfiguration();
  if (!url || !key || url.includes('your-project-ref') || key.includes('your_key')) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local.');
  }

  const projectUrl = new URL(url);
  if (projectUrl.protocol !== 'https:') throw new Error('VITE_SUPABASE_URL must use HTTPS.');
  pass('Browser-safe Supabase configuration found');
  info(`Project host: ${projectUrl.host}`);

  const authResponse = await fetch(new URL('/auth/v1/settings', projectUrl), {
    headers: { apikey: key }, signal: AbortSignal.timeout(10_000),
  });
  if (!authResponse.ok) throw new Error(`Supabase Auth is unreachable or rejected the publishable key (${authResponse.status}).`);
  pass('Supabase Auth endpoint is reachable');

  const restResponse = await fetch(new URL('/rest/v1/', projectUrl), {
    headers: { apikey: key, Accept: 'application/openapi+json' }, signal: AbortSignal.timeout(10_000),
  });
  if (restResponse.ok) pass('PostgreSQL REST API is reachable');
  else if (restResponse.status === 401 || restResponse.status === 403) pass('PostgreSQL REST API is reachable and blocks unauthenticated access');
  else throw new Error(`Supabase database API returned an unexpected response (${restResponse.status}).`);

  if (apiOnly) {
    info('API-only mode skipped authentication and schema queries');
    return;
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: timedFetch },
  });
  const { data: authData, error: authError } = await client.auth.signInAnonymously();
  if (authError || !authData.user) {
    const reason = authError?.message ?? 'no user returned';
    const guidance = reason.toLowerCase().includes('anonymous sign-ins are disabled')
      ? ' Enable “Allow anonymous sign-ins” in Supabase Authentication settings.'
      : '';
    throw new Error(`Anonymous authentication failed: ${reason}.${guidance}`);
  }
  pass('Anonymous application authentication works');

  try {
    for (const table of REQUIRED_TABLES) {
      const { error } = await client.from(table).select('id', { head: true, count: 'exact' });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    pass(`Database migration is available (${REQUIRED_TABLES.length} owner-scoped tables)`);

    const { error: memoryError } = await client.rpc('match_reel_memories', {
      query_embedding: Array(EMBEDDING_DIMENSIONS).fill(0), query_model: 'embeddinggemma:latest', match_count: 1,
    });
    if (memoryError) throw new Error(`match_reel_memories: ${memoryError.message}`);
    pass(`pgvector memory search accepts ${EMBEDDING_DIMENSIONS}-dimension embeddings`);
    pass('Row Level Security allowed the authenticated owner-scoped checks');
  } finally {
    await client.auth.signOut();
  }
};

main()
  .then(() => {
    console.log(apiOnly
      ? '\n\u001B[32mREACHABLE\u001B[0m — The configured Supabase services respond correctly.\n'
      : '\n\u001B[32mCONNECTED\u001B[0m — ReelMaker can authenticate and use the configured database.\n');
  })
  .catch((error) => {
    fail(error instanceof Error ? error.message : String(error));
    console.error('\n\u001B[31mNOT READY\u001B[0m — Fix the reported issue and run the command again.\n');
    process.exitCode = 1;
  });
