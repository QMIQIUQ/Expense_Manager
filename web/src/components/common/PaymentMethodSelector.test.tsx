import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '../../test/test-utils';
import PaymentMethodSelector from './PaymentMethodSelector';

describe('PaymentMethodSelector variants', () => {
  it('uses a dropdown for compact edit forms and reports method changes', () => {
    const onPaymentMethodChange = vi.fn();
    render(
      <PaymentMethodSelector
        paymentMethod="cash"
        onPaymentMethodChange={onPaymentMethodChange}
        variant="select"
      />,
    );

    const methodSelect = screen.getByRole('combobox', { name: /payment\s*method/i });
    expect(methodSelect).toHaveValue('cash');
    expect(screen.queryByRole('button', { name: /cash/i })).not.toBeInTheDocument();
    fireEvent.change(methodSelect, { target: { value: 'credit_card' } });
    expect(onPaymentMethodChange).toHaveBeenCalledWith('credit_card');
  });

  it('keeps the visual choices for new expense entry by default', () => {
    render(<PaymentMethodSelector paymentMethod="cash" onPaymentMethodChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: /cash/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /credit\s*card/i })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /payment\s*method/i })).not.toBeInTheDocument();
  });
});
