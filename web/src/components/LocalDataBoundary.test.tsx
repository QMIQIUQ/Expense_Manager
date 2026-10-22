import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LocalDataBoundary from './LocalDataBoundary';
const auth = vi.hoisted(() => ({ currentUser: null as { uid: string } | null }));
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }));

describe('durable startup boundary', () => {
  it('shows signed-out content immediately, gates mutations during owner changes, then restores the current owner', async () => {
    let restore!: () => void;
    const ready = new Promise<void>((resolve) => { restore = resolve; });
    auth.currentUser = null;
    const view = render(<LocalDataBoundary ready={ready}><button>Login</button></LocalDataBoundary>);
    expect(screen.getByText('Login')).toBeInTheDocument();
    auth.currentUser = { uid: 'first' };
    view.rerender(<LocalDataBoundary ready={ready}><button>Save first</button></LocalDataBoundary>);
    expect(screen.queryByText('Save first')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('還原本機資料');
    auth.currentUser = { uid: 'second' };
    view.rerender(<LocalDataBoundary ready={ready}><button>Save second</button></LocalDataBoundary>);
    expect(screen.queryByText('Save second')).not.toBeInTheDocument();
    await act(async () => { restore(); await ready; });
    expect(screen.getByText('Save second')).toBeInTheDocument();
    expect(screen.queryByText('Save first')).not.toBeInTheDocument();
  });
  it('retains the storage-error recovery screen instead of exposing editable financial state', async () => {
    auth.currentUser = { uid: 'owner' };
    const ready = Promise.reject(new Error('Migration needs attention; pending writes retained'));
    render(<LocalDataBoundary ready={ready}><button>Save expense</button></LocalDataBoundary>);
    expect(await screen.findByRole('alert')).toHaveTextContent('pending writes retained');
    expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();
    expect(screen.queryByText('Save expense')).not.toBeInTheDocument();
  });
});
