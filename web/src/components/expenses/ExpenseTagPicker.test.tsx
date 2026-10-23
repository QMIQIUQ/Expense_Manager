import React, { StrictMode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '../../test/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LanguageProvider } from '../../contexts/LanguageContext';
import { ExpenseTagPicker } from './ExpenseTagPicker';
import { expenseTagService } from '../../services/expenseTagService';

vi.mock('../../hooks/useExpenseTags', () => ({
  useExpenseTags: () => ({ rows: [{ id: 'trip', userId: 'test-user', name: 'Trip', normalizedName: 'trip', color: '#3b82f6', archived: false }], error: null }),
}));

vi.mock('../../services/expenseTagService', () => ({
  expenseTagService: { save: vi.fn(async () => 'new-tag') },
  normalizeTagName: (name: string) => name.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase(),
}));

describe('ExpenseTagPicker', () => {
  beforeEach(() => {
    vi.mocked(expenseTagService.save).mockReset().mockResolvedValue('new-tag');
  });

  it('keeps the compact tag field consistent and allows selecting an existing tag', () => {
    const onChange = vi.fn();
    const { container } = render(
      <LanguageProvider>
        <ExpenseTagPicker compact userId="test-user" value={[]} onChange={onChange} />
      </LanguageProvider>
    );

    expect(container.querySelector('.expense-tag-picker-compact')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'New tag' })).toBeInTheDocument();
    const options = container.querySelector('details.expense-tag-picker-options') as HTMLDetailsElement;
    fireEvent.click(screen.getByText('Choose from existing tags'));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Trip' }));

    expect(options.open).toBe(true);
    expect(onChange).toHaveBeenCalledWith(['trip']);
  });

  it('keeps Enter inside the tag picker and ignores repeated submits while creating', async () => {
    let resolveSave!: (id: string) => void;
    vi.mocked(expenseTagService.save).mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const parentKeyDown = vi.fn();
    const onChange = vi.fn();
    render(
      <LanguageProvider>
        <StrictMode><div onKeyDown={parentKeyDown}><ExpenseTagPicker userId="test-user" value={[]} onChange={onChange} /></div></StrictMode>
      </LanguageProvider>
    );
    const input = screen.getByRole('textbox', { name: 'New tag' });
    fireEvent.change(input, { target: { value: 'Work' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(parentKeyDown).not.toHaveBeenCalled();
    expect(expenseTagService.save).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSave('new-tag'); });
    expect(onChange).toHaveBeenCalledWith(['new-tag']);
  });

  it('merges a completed tag with the latest selection instead of a stale selection', async () => {
    let resolveSave!: (id: string) => void;
    vi.mocked(expenseTagService.save).mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const onChange = vi.fn();
    const ControlledPicker = () => {
      const [value, setValue] = React.useState<string[]>([]);
      return <>
        <ExpenseTagPicker userId="test-user" value={value} onChange={(next) => { onChange(next); setValue(next); }} />
        <button type="button" onClick={() => setValue(['trip'])}>Select while saving</button>
      </>;
    };
    render(<LanguageProvider><ControlledPicker /></LanguageProvider>);

    fireEvent.change(screen.getByRole('textbox', { name: 'New tag' }), { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select while saving' }));
    await act(async () => { resolveSave('new-tag'); });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['trip', 'new-tag']));
  });

  it('discards a pending tag request after the owner changes', async () => {
    let resolveSave!: (id: string) => void;
    vi.mocked(expenseTagService.save).mockReturnValueOnce(new Promise((resolve) => { resolveSave = resolve; }));
    const onChange = vi.fn();
    const { rerender } = render(<LanguageProvider><ExpenseTagPicker userId="test-user" value={[]} onChange={onChange} /></LanguageProvider>);
    fireEvent.change(screen.getByRole('textbox', { name: 'New tag' }), { target: { value: 'Work' } });
    fireEvent.click(screen.getByRole('button', { name: 'New tag' }));
    rerender(<LanguageProvider><ExpenseTagPicker userId="other-user" value={[]} onChange={onChange} /></LanguageProvider>);
    await act(async () => { resolveSave('new-tag'); });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('clears an unsubmitted tag draft when the owner changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<LanguageProvider><ExpenseTagPicker userId="test-user" value={[]} onChange={onChange} /></LanguageProvider>);
    const input = screen.getByRole('textbox', { name: 'New tag' });
    fireEvent.change(input, { target: { value: 'Private label' } });
    expect(input).toHaveValue('Private label');

    rerender(<LanguageProvider><ExpenseTagPicker userId="other-user" value={[]} onChange={onChange} /></LanguageProvider>);

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'New tag' })).toHaveValue(''));
    expect(onChange).not.toHaveBeenCalled();
  });
});
