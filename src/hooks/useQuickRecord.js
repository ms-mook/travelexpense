import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tripService } from '../services';
import { today } from '../utils/format';

/**
 * แตะเดียว: เปิดรายการของวันนี้ (สร้างใหม่ถ้ายังไม่มี) แล้วเปิดฟอร์มเพิ่มเที่ยวทันที
 */
export function useQuickRecord() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const start = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      let id;
      try {
        id = (await tripService.createRecord({ record_date: today() })).daily_record_id;
      } catch (err) {
        if (err.status === 409 && err.details?.daily_record_id) id = err.details.daily_record_id;
        else throw err;
      }
      navigate(`/trips/${id}?add=1`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [navigate]);
  return { start, busy, error };
}
