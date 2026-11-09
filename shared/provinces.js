/** 77 จังหวัดของไทย — ใช้ทั้ง Frontend (dropdown) และ Backend (จัดประเภท BASE/UPCOUNTRY) */
export const PROVINCES = [
  'กรุงเทพมหานคร', 'กระบี่', 'กาญจนบุรี', 'กาฬสินธุ์', 'กำแพงเพชร', 'ขอนแก่น', 'จันทบุรี', 'ฉะเชิงเทรา',
  'ชลบุรี', 'ชัยนาท', 'ชัยภูมิ', 'ชุมพร', 'เชียงราย', 'เชียงใหม่', 'ตรัง', 'ตราด', 'ตาก', 'นครนายก',
  'นครปฐม', 'นครพนม', 'นครราชสีมา', 'นครศรีธรรมราช', 'นครสวรรค์', 'นนทบุรี', 'นราธิวาส', 'น่าน',
  'บึงกาฬ', 'บุรีรัมย์', 'ปทุมธานี', 'ประจวบคีรีขันธ์', 'ปราจีนบุรี', 'ปัตตานี', 'พระนครศรีอยุธยา',
  'พะเยา', 'พังงา', 'พัทลุง', 'พิจิตร', 'พิษณุโลก', 'เพชรบุรี', 'เพชรบูรณ์', 'แพร่', 'ภูเก็ต',
  'มหาสารคาม', 'มุกดาหาร', 'แม่ฮ่องสอน', 'ยโสธร', 'ยะลา', 'ร้อยเอ็ด', 'ระนอง', 'ระยอง', 'ราชบุรี',
  'ลพบุรี', 'ลำปาง', 'ลำพูน', 'เลย', 'ศรีสะเกษ', 'สกลนคร', 'สงขลา', 'สตูล', 'สมุทรปราการ',
  'สมุทรสงคราม', 'สมุทรสาคร', 'สระแก้ว', 'สระบุรี', 'สิงห์บุรี', 'สุโขทัย', 'สุพรรณบุรี', 'สุราษฎร์ธานี',
  'สุรินทร์', 'หนองคาย', 'หนองบัวลำภู', 'อ่างทอง', 'อำนาจเจริญ', 'อุดรธานี', 'อุตรดิตถ์', 'อุทัยธานี',
  'อุบลราชธานี'
];

/** แปลงค่า provinces ของ Base (คั่นด้วย ,) เป็น array */
export const parseProvinces = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);

/**
 * จัดประเภทเที่ยวจากจังหวัดปลายทาง
 * - ปลายทางอยู่ในจังหวัดของ Base → BASE
 * - นอกนั้น → UPCOUNTRY
 * - Base ยังไม่ได้ตั้งจังหวัด หรือไม่ได้เลือกจังหวัด → null (ให้ผู้ใช้เลือกเอง)
 */
export function classifyTravelType(baseProvinces, destinationProvince) {
  const list = Array.isArray(baseProvinces) ? baseProvinces : parseProvinces(baseProvinces);
  if (!list.length || !destinationProvince) return null;
  return list.includes(destinationProvince) ? 'BASE' : 'UPCOUNTRY';
}

export const JOB_TYPES = {
  PM: 'PM (บำรุงรักษาตามรอบ)',
  CORRECTIVE: 'ซ่อม / Corrective',
  INSTALLATION: 'ติดตั้ง / Installation',
  TRAINING: 'อบรมลูกค้า',
  DELIVERY: 'ส่งของ / อะไหล่',
  MEETING: 'ประชุม / งานภายใน',
  OTHER: 'อื่น ๆ'
};

/** ลิงก์เปิดเส้นทางใน Google Maps (ไม่ต้องใช้ API key) */
export function googleMapsDirUrl(origin, destination, destinationProvince) {
  const dest = [destination, destinationProvince].filter(Boolean).join(' ');
  const p = new URLSearchParams({ api: '1', origin: origin || '', destination: dest, travelmode: 'driving' });
  return `https://www.google.com/maps/dir/?${p.toString()}`;
}
