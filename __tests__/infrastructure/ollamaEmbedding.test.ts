import { createEmbedding, EMBEDDING_MODEL } from '../../src/infrastructure/ollamaEmbedding';

describe('Ollama embeddings', () => {
  it('requests and validates a local embedding', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ embeddings: [[0.1, 0.2, 0.3]] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    await expect(createEmbedding('A launch reel', fetcher)).resolves.toEqual([0.1, 0.2, 0.3]);
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/api/embed');
    expect(JSON.parse(String(request?.body))).toMatchObject({ model: EMBEDDING_MODEL, input: 'A launch reel' });
  });

  it('rejects empty embedding responses', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ embeddings: [[]] }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    await expect(createEmbedding('A launch reel', fetcher)).rejects.toThrow('invalid embedding');
  });
});
