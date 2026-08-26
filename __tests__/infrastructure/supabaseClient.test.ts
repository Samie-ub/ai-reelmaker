import { isDatabaseConfigured } from '../../src/infrastructure/supabaseClient';

describe('Supabase test isolation', () => {
  it('does not activate cloud behavior from a developer env file during tests', () => {
    expect(import.meta.env.MODE).toBe('test');
    expect(isDatabaseConfigured).toBe(false);
  });
});
