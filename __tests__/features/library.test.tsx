import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LibraryScreen } from '../../src/features/library/LibraryScreen';

describe('template library', () => {
  beforeEach(() => window.localStorage.clear());

  it('filters templates by category with accessible pressed state', async () => {
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await user.click(screen.getByRole('button', { name: 'Editorial' }));
    expect(screen.getByRole('button', { name: 'Editorial' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Quiet Editorial')).toBeInTheDocument();
    expect(screen.queryByText('Signal Launch')).not.toBeInTheDocument();
  });

  it('offers a recoverable empty search state', async () => {
    const user = userEvent.setup();
    render(<LibraryScreen />);
    await user.type(screen.getByRole('textbox', { name: 'Search templates' }), 'no such template');
    expect(screen.getByRole('status')).toHaveTextContent('No templates match');
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByText('Signal Launch')).toBeInTheDocument();
  });
});
