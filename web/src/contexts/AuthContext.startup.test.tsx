import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
const fake = vi.hoisted(() => ({ emit: undefined as undefined | ((user: { uid: string } | null) => void), read: vi.fn() }));
vi.mock('../config/firebase', () => ({ auth: {}, db: {}, googleProvider: {}, isFirebaseConfigured: true, firebaseSetupMessage: '' }));
vi.mock('firebase/auth', () => ({ onAuthStateChanged: vi.fn((_auth, callback) => { fake.emit = callback; return vi.fn(); }) }));
vi.mock('firebase/firestore', () => ({ doc: vi.fn(), getDoc: fake.read }));
const Identity = () => <p>{useAuth().currentUser?.uid ?? 'signed out'}</p>;
describe('restored identity does not await remote metadata', () => {
  it('renders local consumers while metadata is delayed and never resurrects a signed-out user', async () => {
    let finish!: (value: { exists: () => boolean }) => void;
    fake.read.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    render(<AuthProvider><Identity /></AuthProvider>);
    act(() => fake.emit?.({ uid: 'restored-owner' }));
    expect(screen.getByText('restored-owner')).toBeInTheDocument();
    expect(fake.read).toHaveBeenCalledOnce();
    act(() => fake.emit?.(null));
    await act(async () => { finish({ exists: () => true }); });
    expect(screen.getByText('signed out')).toBeInTheDocument();
  });
});
