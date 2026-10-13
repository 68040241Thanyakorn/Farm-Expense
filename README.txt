# FARM EXPENSE - INSTALLATION GUIDE

## 1. PROJECT FILES

ไฟล์หลักของโปรเจกต์ Farm Expense

- index2.html — หน้าหลัก
- index3.html — เพิ่มและแก้ไขข้อมูลบ่อปลา
- index4.html — รายการบ่อปลา
- index5.html — ข้อมูลรายรับ รายจ่าย และกำไรของบ่อ
- index6.html — บันทึกรายรับ
- index7.html — บันทึกรายจ่าย
- index8.html — สรุปผลข้อมูลทางการเงิน
- index9.html — AI วิเคราะห์ข้อมูลฟาร์ม

ไฟล์ CSS

- styles2.css ถึง styles9.css — ตกแต่งแต่ละหน้า

ไฟล์ JavaScript

- finance.js — จัดการข้อมูลบ่อและธุรกรรม
- summary.js — แสดงข้อมูลสรุปและกราฟ
- ai.js — วิเคราะห์ข้อมูลและเชื่อมต่อ AI Chat

ไฟล์ Python

- app.py — Flask Backend และ AI API
- requirements.txt — รายการ Python Libraries

ไฟล์รูปภาพ

- Fish.png
- Fishing.png
- Backgroud2.jpg

## 2. UPDATE PROJECT FILES

1. สำรองไฟล์เดิมก่อนแก้ไข
2. เปิดโฟลเดอร์ FARM EXPENSE
3. นำไฟล์ใหม่ไปวางในโฟลเดอร์เดียวกัน
4. ใช้ app.py เวอร์ชันที่รวมระบบเดิมและ AI ใหม่แล้ว
5. เก็บ finance.js เดิมที่บันทึกข้อมูลได้ตามปกติ
6. ตรวจสอบว่า index8.html เชื่อมกับ summary.js
7. ตรวจสอบว่า index9.html เชื่อมกับ ai.js
8. ตรวจสอบ Navbar ของทุกหน้า

## 3. NAVIGATION

หน้าหลัก → index2.html

รายการบ่อ → index4.html

สรุปผล → index8.html

AI → index9.html

ปุ่มย้อนกลับใน index6.html → index5.html

ปุ่มย้อนกลับใน index7.html → index5.html

## 4. INSTALL PYTHON LIBRARIES

เปิด VS Code

เปิด Terminal ในโฟลเดอร์ FARM EXPENSE

รันคำสั่ง:

`py -m pip install -r requirements.txt`

รอจนติดตั้งเสร็จ

## 5. CONFIGURE OPENAI API

สร้าง OpenAI API Key จาก:

https://platform.openai.com/api-keys

เปิด PowerShell Terminal

พิมพ์คำสั่ง:

`$env:OPENAI_API_KEY="YOUR_API_KEY"`

เปลี่ยน YOUR_API_KEY เป็น API Key จริง

กำหนดโมเดลเพิ่มเติมได้ (ไม่บังคับ):

`$env:OPENAI_MODEL="gpt-4o-mini"`

ห้ามใส่ API Key ใน HTML, JavaScript หรือ GitHub

OpenAI API มีค่าใช้จ่ายแยกจาก ChatGPT Subscription

## 6. START PYTHON BACKEND

ใน Terminal เดียวกับที่ตั้งค่า API Key

รันคำสั่ง:

`py app.py`

เมื่อทำงานสำเร็จจะเห็น:

`Running on http://127.0.0.1:5000`

เปิด Terminal นี้ค้างไว้ระหว่างใช้งานเว็บไซต์

## 7. START WEBSITE

เปิด VS Code Live Server

ใช้ Port 5500

เปิดเว็บไซต์:

http://127.0.0.1:5500/index2.html

หน้าสรุปผล:

http://127.0.0.1:5500/index8.html

หน้า AI:

http://127.0.0.1:5500/index9.html

## 8. SUMMARY PAGE - INDEX8

หน้า index8 ใช้แสดงข้อมูลทางการเงิน

สามารถเลือกเดือนที่ต้องการได้

สามารถเลือกบ่อปลาตามข้อมูลที่บันทึกไว้ได้

ค่าเริ่มต้นคือ ทุกบ่อ

เมื่อเลือกทุกบ่อ ระบบจะรวมข้อมูลรายรับ รายจ่าย และกำไรของทุกบ่อ

เมื่อเลือกบ่อใดบ่อหนึ่ง ระบบจะแสดงเฉพาะข้อมูลของบ่อนั้น

มีกราฟเปรียบเทียบรายรับและรายจ่าย

มีกราฟสัดส่วนค่าใช้จ่าย

ข้อมูลคำนวณจาก localStorage

## 9. AI ANALYSIS PAGE - INDEX9

หน้า index9 ใช้สำหรับวิเคราะห์ข้อมูลฟาร์ม

สามารถเลือกเดือนและบ่อปลาได้

ค่าเริ่มต้นคือ ทุกบ่อ

แสดงกำไรหรือขาดทุนของเดือนที่เลือก

แสดงสัดส่วนค่าใช้จ่าย

วิเคราะห์บ่อที่ทำกำไรสูงสุด

วิเคราะห์บ่อที่ขาดทุน

ตรวจสอบหมวดค่าใช้จ่ายที่มีต้นทุนสูง

แนะนำแนวทางลดต้นทุน

ช่วยพิจารณาชนิดปลาที่มีผลประกอบการดี

การแนะนำให้เพิ่มการเลี้ยงต้องพิจารณาข้อมูลหลายรอบการเลี้ยงและความเสี่ยงเพิ่มเติม

## 10. AI CHAT

ผู้ใช้สามารถพิมพ์คำถามเพิ่มเติมได้

AI รองรับคำถามเกี่ยวกับข้อมูลฟาร์ม

ตัวอย่างคำถาม:

- บ่อไหนกำไรมากที่สุด?
- บ่อไหนขาดทุน?
- ควรเพิ่มการเลี้ยงปลาชนิดไหน?
- ค่าอาหารปลาสูงเกินไปหรือไม่?
- ควรลดค่าใช้จ่ายส่วนไหน?
- เดือนนี้ฟาร์มมีกำไรเท่าไร?
- มีวิธีเลี้ยงปลานิลให้เติบโตดีอย่างไร?

AI สามารถตอบคำถามทั่วไปได้ด้วย

ระบบจะใช้ข้อมูลฟาร์มที่ส่งจากเว็บไซต์ประกอบคำตอบ

การถาม–ตอบแบบอิสระต้องมี OpenAI API Key และอินเทอร์เน็ต

หากไม่มี API Key การคำนวณและคำแนะนำพื้นฐานยังสามารถทำงานได้

## 11. BACKEND API

`POST /api/advice`

ใช้แสดงคำแนะนำในหน้า index5

`POST /api/analysis`

ใช้วิเคราะห์รายรับ รายจ่าย กำไร และข้อมูลแต่ละบ่อ

`POST /api/ask`

ใช้ถาม–ตอบกับ AI

ระบบต้องใช้ app.py เวอร์ชันรวมที่รองรับทั้ง API เดิมและ API ใหม่

## 12. DATA STORAGE

ข้อมูลบ่อปลาบันทึกใน:

`farmExpensePonds`

ข้อมูลรายรับและรายจ่ายบันทึกใน:

`farmExpenseTransactions`

ข้อมูลทั้งหมดเก็บอยู่ใน Browser localStorage

การล้างข้อมูลเว็บไซต์อาจทำให้ข้อมูลสูญหาย

ควรสำรองข้อมูลเป็นระยะ

## 13. IMPORTANT NOTES

ใช้ Python Backend และ Live Server พร้อมกัน

Backend ใช้ Port 5000

Frontend ใช้ Port 5500

อย่าเปิด app.py สองตัวพร้อมกันบน Port เดียวกัน

อย่านำโค้ด app.py สองเวอร์ชันมาต่อท้ายกัน

ใช้ app.py เวอร์ชันรวมเพียงไฟล์เดียว

หากแก้ไข HTML หรือ CSS แล้วไม่อัปเดต ให้กด Ctrl + Shift + R

หาก AI Chat ไม่ตอบ ให้ตรวจสอบ API Key, อินเทอร์เน็ต, โมเดล และเครดิต API

หากกราฟไม่แสดง ให้ตรวจสอบข้อมูลธุรกรรม เดือน และบ่อที่เลือก

## 14. RUN PROJECT

ขั้นตอนการเปิดใช้งานทุกครั้ง

1. เปิด VS Code
2. เปิดโฟลเดอร์ FARM EXPENSE
3. เปิด Terminal
4. ตั้งค่า OPENAI_API_KEY หากต้องการใช้ AI Chat
5. รัน `py app.py`
6. เปิด Live Server
7. เปิด index2.html
8. เริ่มใช้งาน Farm Expense

END OF INSTALLATION GUIDE