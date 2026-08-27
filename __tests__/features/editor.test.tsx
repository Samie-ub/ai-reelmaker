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
    expect(window.localStorage.getItem('reelmaker.project.v2')).toContain('Measured growth');
  });

  it('applies a validated local AI suggestion to the editor', async () => {
    const suggestion = {
      scenes: [
        { title: 'Brewed for\nafter dark.', subtitle: 'A bolder coffee for the hours when ideas refuse to sleep.', accent: '#22c55e', background: '#0a0a0a', alignment: 'center', duration: 6, animation: 'rise' },
        { title: 'Make the night yours.', subtitle: 'Available now.', accent: '#faff69', background: '#172554', alignment: 'left', duration: 4, animation: 'scale' },
      ],
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      message: { role: 'assistant', content: JSON.stringify(suggestion) },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const user = userEvent.setup();
    render(<EditorScreen templateId="signal" />);

    await user.type(screen.getByRole('textbox', { name: /AI scene builder/ }), 'Launch a coffee for night owls');
    await user.click(screen.getByRole('button', { name: 'Full reel' }));

    expect(await screen.findByText('2 editable AI scenes applied.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Headline/ })).toHaveValue('Brewed for\nafter dark.');
    expect(screen.getByRole('textbox', { name: /Supporting text/ })).toHaveValue('A bolder coffee for the hours when ideas refuse to sleep.');
    expect(screen.getByRole('spinbutton', { name: /Brewed for after dark.*duration/i })).toHaveValue(6);
    expect(screen.queryByRole('slider', { name: /Scene duration/ })).not.toBeInTheDocument();
    expect(screen.getByText('2/8')).toBeInTheDocument();
  });

  it('adds and edits scenes manually', async () => {
    const user = userEvent.setup();
    render(<EditorScreen templateId="editorial" />);

    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('2/8')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Headline/ })).toHaveValue('New scene');
    await user.clear(screen.getByRole('textbox', { name: /Headline/ }));
    await user.type(screen.getByRole('textbox', { name: /Headline/ }), 'Second chapter');
    expect(screen.getByRole('textbox', { name: /Headline/ })).toHaveValue('Second chapter');
  });

  it('lets AI rewrite only the selected manual scene', async () => {
    const suggestion = { scenes: [{ title: 'A sharper second beat', subtitle: 'Rewritten locally.', accent: '#3b82f6', background: '#172554', alignment: 'left', duration: 5, animation: 'slide-left' }] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: { role: 'assistant', content: JSON.stringify(suggestion) } }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    const user = userEvent.setup();
    render(<EditorScreen templateId="signal" />);
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.type(screen.getByRole('textbox', { name: /AI scene builder/ }), 'Make this beat more direct');
    await user.click(screen.getByRole('button', { name: 'Rewrite scene' }));

    expect(await screen.findByText('Selected scene rewritten and remains fully editable.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Headline/ })).toHaveValue('A sharper second beat');
    expect(screen.getByText('2/8')).toBeInTheDocument();
  });
});
