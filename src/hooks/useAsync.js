import { useCallback, useEffect, useState } from 'react';

/** โหลดข้อมูลแบบ async พร้อม loading / error / reload */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      setState({ data: await fn(), loading: false, error: '' });
    } catch (e) {
      setState({ data: null, loading: false, error: e.message });
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run, setData: (d) => setState((s) => ({ ...s, data: typeof d === 'function' ? d(s.data) : d })) };
}

/** ห่อ action (submit/save) ให้มี busy + error */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const run = useCallback(async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (e) {
      setError(e.details ? `${e.message}: ${Object.entries(e.details).map(([k, v]) => `${k} ${v}`).join(', ')}` : e.message);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}
