import migration from '../../supabase/migrations/20260826000000_reelmaker_learning.sql?raw';
import aiWorkflowMigration from '../../supabase/migrations/20260827000000_ai_workflow_foundation.sql?raw';

describe('database migration', () => {
  it('creates the project, history, feedback, and vector memory tables', () => {
    for (const table of ['projects', 'project_versions', 'ai_generations', 'generation_feedback', 'reel_memories']) {
      expect(migration).toContain(`create table public.${table}`);
    }
    expect(migration).toContain('create extension if not exists vector');
    expect(migration).toContain('embedding extensions.vector(768)');
    expect(migration).toContain('operator(extensions.<=>)');
    expect(migration).toContain('match_reel_memories');
  });

  it('enables owner-based row level security on every private table', () => {
    expect(migration.match(/enable row level security/g)).toHaveLength(5);
    expect(migration.match(/owner_all on public\./g)).toHaveLength(5);
    expect(migration).toContain('revoke all on public.projects');
  });

  it('enforces ownership through composite foreign keys', () => {
    expect(migration).toContain('foreign key (generation_id, owner_id)');
    expect(migration).toContain('foreign key (project_version_id, owner_id)');
  });

  it('versions prompts and filters retrieval by similarity, template, and generation mode', () => {
    expect(aiWorkflowMigration).toContain('add column prompt_version');
    expect(aiWorkflowMigration).toContain('source_generation_id');
    expect(aiWorkflowMigration).toContain('projects.template_id = query_template');
    expect(aiWorkflowMigration).toContain('memories.generation_mode = query_mode');
    expect(aiWorkflowMigration).toContain('>= minimum_similarity');
  });
});
