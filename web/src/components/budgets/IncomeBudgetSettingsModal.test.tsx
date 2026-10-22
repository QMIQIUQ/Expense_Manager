import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncomeBudgetSettingsModal from './IncomeBudgetSettingsModal';
import { DEFAULT_INCOME_LINK } from '../../utils/incomeLinkedBudget';
import type { Budget } from '../../types';
const mocks = vi.hoisted(() => ({ settings: vi.fn(), save: vi.fn(), notify: vi.fn() }));
vi.mock('../../contexts/UserSettingsContext', () => ({ useUserSettings: mocks.settings }));
vi.mock('../../contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));
vi.mock('../../contexts/NotificationContext', () => ({ useNotification: () => ({ showNotification: mocks.notify }) }));
vi.mock('../../hooks/useIncomeBudget', () => ({ useIncomeBudget: () => ({ range: { startDate: '2026-10-01', endDate: '2026-10-31' }, status: 'incomplete', funding: null, retry: vi.fn() }) }));
const budgets = [{ id: 'b', userId: 'u', period: 'monthly', amount: 1000, currency: 'MYR' } as Budget];
describe('income budget settings dialog', () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.save.mockResolvedValue(undefined);
    mocks.settings.mockReturnValue({ settings: { userId: 'u', billingCycleDay: 1, overallBudgetLimits: { monthly: 500 } }, loading: false, setIncomeLinkedBudget: mocks.save });
  });
  it('waits for durable acceptance before closing and keeps edits while saving', async () => {
    let finish!: () => void;
    mocks.save.mockImplementation(() => new Promise<void>((resolve) => { finish = resolve; }));
    const close = vi.fn();
    render(<IncomeBudgetSettingsModal isOpen onClose={close} budgets={budgets} onSaveManual={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('incomeBudgetMode'), { target: { value: 'income' } });
    fireEvent.change(screen.getByLabelText('incomeBudgetPercentage'), { target: { value: '75' } });
    fireEvent.submit(screen.getByText('save').closest('form')!);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ ...DEFAULT_INCOME_LINK, enabled: true, percentage: 75 }, undefined));
    expect(close).not.toHaveBeenCalled(); expect(screen.getByText('saving')).toBeDisabled();
    finish(); await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('keeps the dialog open and explains local storage failure', async () => {
    mocks.save.mockRejectedValue({ code: 'local-persistence-failed' });
    const close = vi.fn();
    render(<IncomeBudgetSettingsModal isOpen onClose={close} budgets={budgets} onSaveManual={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('incomeBudgetMode'), { target: { value: 'income' } });
    fireEvent.submit(screen.getByText('save').closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('offlineQueueSaveFailed');
    expect(close).not.toHaveBeenCalled();
  });
  it('prefills at least the current allocations when restoring a smaller manual cap', async () => {
    mocks.settings.mockReturnValue({ settings: { userId: 'u', incomeLinkedBudget: { ...DEFAULT_INCOME_LINK, enabled: true }, overallBudgetLimits: { monthly: 500 } }, loading: false, setIncomeLinkedBudget: mocks.save });
    render(<IncomeBudgetSettingsModal isOpen onClose={vi.fn()} budgets={budgets} onSaveManual={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('incomeBudgetMode'), { target: { value: 'manual' } });
    expect(screen.getByLabelText('overallBudgetAmount')).toHaveValue(1000);
    fireEvent.submit(screen.getByText('save').closest('form')!);
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith({ ...DEFAULT_INCOME_LINK, enabled: false }, 1000));
  });
  it('preserves a higher saved cap and initializes unchanged dialogs again on reopen', () => {
    mocks.settings.mockReturnValue({ settings: { userId: 'u', incomeLinkedBudget: { ...DEFAULT_INCOME_LINK, enabled: true }, overallBudgetLimits: { monthly: 1500 } }, loading: false, setIncomeLinkedBudget: mocks.save });
    const props = { onClose: vi.fn(), budgets, onSaveManual: vi.fn() };
    const view = render(<IncomeBudgetSettingsModal isOpen {...props} />);
    fireEvent.change(screen.getByLabelText('incomeBudgetMode'), { target: { value: 'manual' } });
    expect(screen.getByLabelText('overallBudgetAmount')).toHaveValue(1500);
    view.rerender(<IncomeBudgetSettingsModal isOpen={false} {...props} />);
    view.rerender(<IncomeBudgetSettingsModal isOpen {...props} />);
    expect(screen.getByLabelText('incomeBudgetMode')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('incomeBudgetMode'), { target: { value: 'manual' } });
    expect(screen.getByLabelText('overallBudgetAmount')).toHaveValue(1500);
  });
  it('waits for delayed settings before using the saved manual amount', () => {
    mocks.settings.mockReturnValue({ settings: null, loading: true, setIncomeLinkedBudget: mocks.save });
    const props = { isOpen: true, onClose: vi.fn(), budgets, onSaveManual: vi.fn() };
    const view = render(<IncomeBudgetSettingsModal {...props} />);
    expect(screen.getByLabelText('incomeBudgetMode')).toBeDisabled();
    expect(screen.getByText('save')).toBeDisabled();
    mocks.settings.mockReturnValue({ settings: { userId: 'u', incomeLinkedBudget: { ...DEFAULT_INCOME_LINK, enabled: true }, overallBudgetLimits: { monthly: 1500 } }, loading: false, setIncomeLinkedBudget: mocks.save });
    view.rerender(<IncomeBudgetSettingsModal {...props} />);
    expect(screen.getByLabelText('incomeBudgetMode')).toBeEnabled();
    fireEvent.change(screen.getByLabelText('incomeBudgetMode'), { target: { value: 'manual' } });
    expect(screen.getByLabelText('overallBudgetAmount')).toHaveValue(1500);
  });
});

