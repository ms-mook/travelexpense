import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // รองรับชื่อตัวแปรที่ Supabase Integration ของ Vercel สร้างให้ (NEXT_PUBLIC_*) ด้วย
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Travel Expense',
        short_name: 'TravelExp',
        description: 'บันทึกการเดินทางและค่าใช้จ่ายของ Service Engineer',
        theme_color: '#0f766e',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        lang: 'th',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // ห้าม cache API และไฟล์ใบเสร็จ — ข้อมูลส่วนบุคคลต้องผ่าน Backend ทุกครั้ง
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: []
      }
    })
  ],
  server: {
    // ใช้ `vercel dev` (port 3000) สำหรับ API แล้วให้ Vite proxy ไป
    proxy: { '/api': 'http://localhost:3000' }
  }
});
