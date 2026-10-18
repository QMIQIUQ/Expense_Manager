import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PrivateRoute from './PrivateRoute';
const { useAuth } = vi.hoisted(() => ({ useAuth: vi.fn() }));
vi.mock('../contexts/AuthContext', () => ({ useAuth }));
const AccountState = () => { const [value, setValue] = useState('empty'); return <button onClick={() => setValue('first account data')}>{value}</button>; };
describe('account state isolation', () => {
  it('remounts protected data components on direct account switching', () => {
    useAuth.mockReturnValue({ currentUser: { uid: 'first' } });
    const view = render(<PrivateRoute><AccountState /></PrivateRoute>);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveTextContent('first account data');
    useAuth.mockReturnValue({ currentUser: { uid: 'second' } });
    view.rerender(<PrivateRoute><AccountState /></PrivateRoute>);
    expect(screen.getByRole('button')).toHaveTextContent('empty');
  });
});
