const nf2 = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const money = (n) => `฿${nf2.format(Number(n) || 0)}`;
export const km = (n) => `${nf2.format(Number(n) || 0)} กม.`;
export const num2 = (n) => nf2.format(Number(n) || 0);

export const thaiDate = (d) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit', weekday: 'short' }) : '-';
export const thaiMonth = (m) =>
  m ? new Date(`${m}-01T00:00:00`).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : '-';
export const thaiDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-';

/** วันที่วันนี้ตามเครื่องผู้ใช้ (YYYY-MM-DD) */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const thisMonth = () => today().slice(0, 7);

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = reject;
  r.readAsDataURL(file);
});

/** ย่อรูปก่อนอัปโหลด (ลดขนาดใบเสร็จจากกล้องมือถือ) */
export async function compressImage(file, maxSide = 1800, quality = 0.8) {
  if (!file.type.startsWith('image/') || file.type === 'image/heic') return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality));
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}
