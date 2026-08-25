import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

vi.mock('@remotion/player', async () => {
  const React = await import('react');
  return {
    Player: React.forwardRef((_props: unknown, ref) => {
      React.useImperativeHandle(ref, () => ({
        addEventListener: vi.fn(), removeEventListener: vi.fn(), seekTo: vi.fn(), toggle: vi.fn(),
      }));
      return <div data-testid="player" />;
    }),
  };
});

import { EditorScreen } from '../../src/features/editor/EditorScreen';

describe('editor', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('surfaces validation and disables export for an empty headline', async () => {
    const user = userEvent.setup();
    render(<EditorScreen templateId="signal" />);
    const headline = screen.getByRole('textbox', { name: /Headline/ });
    await user.clear(headline);
    expect(await screen.findByText('Add a headline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export video' })).toBeDisabled();
    expect(screen.getByText('Fix validation to save')).toBeInTheDocument();
  });

  it('autosaves valid copy after editing', async () => {
    const user = userEvent.setup();
    render(<EditorScreen templateId="metric" />);
    const headline = screen.getByRole('textbox', { name: /Headline/ });
    await user.clear(headline);
    await user.type(headline, 'Measured growth');
    await waitFor(() => expect(screen.getByText('Saved locally')).toBeInTheDocument(), { timeout: 1200 });
    expect(window.localStorage.getItem('reelmaker.project.v1')).toContain('Measured growth');
  });

  it('applies a validated local AI suggestion to the editor', async () => {
    const suggestion = {
      title: 'Brewed for\nafter dark.',
      subtitle: 'A bolder coffee for the hours when ideas refuse to sleep.',
      accent: '#22c55e',
      alignment: 'center',
      duration: 14,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { role: 'assistant', content: JSON.stringify(suggestion) },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const user = userEvent.setup();
    render(<EditorScreen templateId="signal" />);

    await user.type(screen.getByRole('textbox', { name: /AI create/ }), 'Launch a coffee for night owls');
    await user.click(screen.getByRole('button', { name: 'Create with Llama 3.2' }));

    expect(await screen.findByText('AI direction applied. Review and edit anything before exporting.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Headline/ })).toHaveValue('Brewed for\nafter dark.');
    expect(screen.getByRole('textbox', { name: /Supporting text/ })).toHaveValue('A bolder coffee for the hours when ideas refuse to sleep.');
    expect(screen.getByRole('slider', { name: /Duration/ })).toHaveValue('14');
  });
});
