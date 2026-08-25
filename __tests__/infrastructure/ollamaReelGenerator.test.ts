import { generateReelSuggestion, ReelGenerationError } from '../../src/infrastructure/ollamaReelGenerator';

const validSuggestion = {
  scenes: [{
    title: 'Brewed for\nafter dark.', subtitle: 'A bolder coffee for the hours when ideas refuse to sleep.',
    accent: '#faff69', background: '#0a0a0a', alignment: 'left', duration: 10, animation: 'rise',
  }],
};

const ollamaResponse = (content: unknown, status = 200) => new Response(
  JSON.stringify({ message: { role: 'assistant', content: JSON.stringify(content) } }),
  { status, headers: { 'Content-Type': 'application/json' } },
);

describe('Ollama reel generator', () => {
  it('requests a schema-constrained suggestion from llama3.2', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(ollamaResponse(validSuggestion));

    await expect(generateReelSuggestion('Launch a coffee for night owls', 'signal', fetcher)).resolves.toEqual(validSuggestion);

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe('http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(String(request?.body));
    expect(body).toMatchObject({ model: 'llama3.2:latest', stream: false });
    expect(body.format.required).toEqual(['scenes']);
    expect(body.format.properties.scenes.items.required).toContain('animation');
    expect(body.messages[0].content).toContain('Launch a coffee for night owls');
  });

  it('rejects a response outside the safe reel schema', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(ollamaResponse({ scenes: [{ ...validSuggestion.scenes[0], duration: 90 }] }));

    await expect(generateReelSuggestion('Make a long reel', 'editorial', fetcher)).rejects.toEqual(
      new ReelGenerationError('Llama returned an invalid reel plan. Try a shorter, clearer brief.'),
    );
  });

  it('explains when the local Ollama service is unavailable', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(generateReelSuggestion('Make a launch reel', 'signal', fetcher)).rejects.toEqual(
      new ReelGenerationError('Cannot reach Ollama. Make sure Ollama is running locally.'),
    );
  });
});
