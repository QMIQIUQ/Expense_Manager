import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '../../test/test-utils';
import CurrencySelector from './CurrencySelector';

describe('CurrencySelector', () => {
  it('opens, selects a currency, and calls onChange', async () => {
    const onChange = vi.fn();

    render(<CurrencySelector value="MYR" onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: /myr/i }));

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('option', { name: /usd/i }));

    expect(onChange).toHaveBeenCalledWith('USD');
  });

  it('opens from the keyboard and closes on escape', async () => {
    render(<CurrencySelector value="MYR" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: /myr/i });
    fireEvent.keyDown(trigger, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });
});
