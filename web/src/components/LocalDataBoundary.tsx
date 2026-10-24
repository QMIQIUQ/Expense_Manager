import { useEffect, useState, type ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';

/** Render login immediately, but never expose finances before durable pending writes are restored. */
export default function LocalDataBoundary({ ready, children }: { ready: Promise<void>; children: ReactNode }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState<{ ready: boolean; error?: string }>({ ready: false });
  useEffect(() => {
    let active = true;
    void ready.then(() => { if (active) setState({ ready: true }); }, (error: unknown) => {
      if (active) setState({ ready: false, error: error instanceof Error ? error.message : String(error) });
    });
    return () => { active = false; };
  }, [ready]);
  if (!currentUser || state.ready) return <>{children}</>;
  if (state.error) return <main role="alert" style={{ padding: 'var(--ui-space-24px)' }}>
    <h1>Local storage needs attention / 本機儲存需要處理</h1><p>{state.error}</p>
    <p>Pending changes are retained. Close older tabs, allow site storage, then retry. / 待同步資料已保留，請關閉舊分頁、允許網站儲存後重試。</p>
    <button onClick={() => window.location.reload()}>Retry / 重試</button>
  </main>;
  return <main role="status" aria-live="polite" style={{ padding: 'var(--ui-space-24px)' }}>Restoring saved data… / 正在還原本機資料…</main>;
}
