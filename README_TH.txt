Farm Expense PWA สำหรับ iPhone

1. สำรองโฟลเดอร์ FARM EXPENSE เดิมก่อน
2. แตก ZIP แล้วคัดลอก manifest.webmanifest, service-worker.js, pwa.js และโฟลเดอร์ icons ไปไว้ใน FARM EXPENSE (ระดับเดียวกับ index2.html)
3. เพิ่มใน <head> ของ index2.html ถึง index9.html:
<link rel="manifest" href="./manifest.webmanifest">
<meta name="theme-color" content="#168b91">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Farm Expense">
<link rel="apple-touch-icon" href="./icons/icon-192.png">
4. เพิ่มก่อน </body> ของทุกหน้า:
<script src="./pwa.js"></script>
5. เปิด http://127.0.0.1:5500/index2.html ผ่าน VS Code Live Server แล้วตรวจสอบ DevTools > Application > Manifest / Service Workers
6. ทำสำเนา index2.html เป็น index.html หากต้องการให้ URL หลักของโฮสต์เปิดหน้าแรก
7. อัปโหลดเฉพาะไฟล์เว็บ HTML/CSS/JS/รูป/manifest/service worker ไปยัง HTTPS host เช่น Netlify (ห้ามอัปโหลด .env หรือ API key)
8. เปิดลิงก์ HTTPS ด้วย Safari บน iPhone > Share > Add to Home Screen > Add

สำคัญ:
- ไฟล์ชุดนี้ไม่แก้ระบบรายรับรายจ่ายหรือ AI เดิม
- หน้าเว็บบางส่วนอาจเปิดได้ออฟไลน์ แต่ AI ต้องมี Flask backend ออนไลน์และเชื่อม URL HTTPS ใน ai.js
- ข้อมูล localStorage ของคอมพิวเตอร์จะไม่ย้ายไป iPhone เอง
- ถ้าแก้ไฟล์แล้วไม่อัปเดต ให้เปลี่ยน CACHE_NAME ใน service-worker.js เป็น farm-expense-pwa-v2 แล้วรีโหลด
