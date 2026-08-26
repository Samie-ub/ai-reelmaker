import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_TABLES = ['projects', 'project_versions', 'ai_generations', 'generation_feedback', 'reel_memories'];
const EMBEDDING_DIMENSIONS = 768;
const apiOnly = process.argv.includes('--api-only');
const writeTest = process.argv.includes('--write-test');

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

const verifyWrites = async (client, ownerId) => {
  const document = {
    version: 2, templateId: 'signal', updatedAt: Date.now(),
    scenes: [{ id: 'database-smoke-test', title: 'Database smoke test', subtitle: 'Temporary verification record', accent: '#faff69', background: '#0a0a0a', alignment: 'left', duration: 2, animation: 'fade' }],
  };
  let projectId;
  try {
    const { data: project, error: projectError } = await client.from('projects').insert({
      owner_id: ownerId, title: 'ReelMaker database smoke test', template_id: 'signal', schema_version: 2, document,
    }).select('id').single();
    if (projectError) throw new Error(`projects write: ${projectError.message}`);
    projectId = project.id;

    const { data: version, error: versionError } = await client.from('project_versions').insert({
      project_id: projectId, owner_id: ownerId, schema_version: 2, document, source: 'export',
    }).select('id').single();
    if (versionError) throw new Error(`project_versions write: ${versionError.message}`);

    const { data: generation, error: generationError } = await client.from('ai_generations').insert({
      project_id: projectId, owner_id: ownerId, mode: 'project', model: 'llama3.2:latest', prompt: 'Temporary database verification prompt', response: { scenes: document.scenes },
    }).select('id').single();
    if (generationError) throw new Error(`ai_generations write: ${generationError.message}`);

    const { error: feedbackError } = await client.from('generation_feedback').insert({
      generation_id: generation.id, owner_id: ownerId, outcome: 'exported', edited_fields: [], rating: null,
    });
    if (feedbackError) throw new Error(`generation_feedback write: ${feedbackError.message}`);

    const { error: memoryError } = await client.from('reel_memories').insert({
      project_id: projectId, project_version_id: version.id, owner_id: ownerId,
      content: 'Temporary ReelMaker database verification memory', embedding: Array(EMBEDDING_DIMENSIONS).fill(0),
      embedding_model: 'embeddinggemma:latest', quality_score: 1,
    });
    if (memoryError) throw new Error(`reel_memories write: ${memoryError.message}`);
    pass('Owner-scoped writes succeeded across projects, versions, AI generations, feedback, and memories');
  } finally {
    if (projectId) {
      const { error } = await client.from('projects').delete().eq('id', projectId).eq('owner_id', ownerId);
      if (error) throw new Error(`Temporary write-test cleanup failed: ${error.message}`);
      pass('Temporary write-test records were removed');
    }
  }
};

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
    if (writeTest) await verifyWrites(client, authData.user.id);
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
