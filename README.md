# หารกัน — หารค่าอาหารกับเพื่อน

เว็บ React + TypeScript / Next.js สำหรับแบ่งค่าอาหารเฉพาะคนที่กินแต่ละเมนู พร้อม QR พร้อมเพย์ระบุยอดรายคนและเรียกเก็บทาง EmailJS

## เริ่มใช้งานบนเครื่อง / Vercel

ใช้ Bun 1.4+ และ Node.js 22.13+

```bash
bun install
cp .env.example .env.local
bun run dev
```

Windows: คัดลอก `.env.example` เป็น `.env.local` ด้วย File Explorer หรือ `Copy-Item .env.example .env.local` ใน PowerShell

```bash
bun run test
bun run build
bun run start
```

ชุดนี้เป็น Next.js สำหรับ Vercel โดยตรง ใช้ `bun run build` เพื่อสร้าง production build และ `vercel.json` ตั้งค่าไว้แล้ว

1. แตก ZIP และนำโฟลเดอร์ขึ้น GitHub ของคุณ (ห้าม commit .env.local)
2. Import repository ใน Vercel เลือก Next.js; ใช้ Build Command `bun run build` และไม่กำหนด Output Directory เอง
3. ตั้ง Environment Variables ตามรายการด้านล่างสำหรับ Production (และ Preview ถ้าต้องการ)
4. Deploy / Redeploy หลังตั้ง env
5. สร้างบิลทดสอบโดยใช้อีเมลของคุณเอง แล้วกดเรียกเก็บ ตรวจ EmailJS History และกล่องอีเมลว่ารายการ ยอด และภาพ QR ครบก่อนใช้กับเพื่อน

## Environment Variables

ทุกตัวอ่านเฉพาะเซิร์ฟเวอร์ ห้ามเติม NEXT*PUBLIC* หรือ VITE\_ หน้าชื่อ และห้ามใส่คีย์ลงในหน้า React

| ชื่อ                | ค่า                                                                     |
| ------------------- | ----------------------------------------------------------------------- |
| EMAILJS_PRIVATEKEY  | Private Key ของบัญชี EmailJS                                            |
| EMAILJS_PUBLIC_KEY  | Public Key ของบัญชี EmailJS                                             |
| EMAILJS_SERVICE_ID  | Service ID ที่เชื่อมอีเมลผู้ส่งแล้ว                                     |
| EMAILJS_TEMPLATE_ID | Template ID ที่ตั้งค่าตามหัวข้อถัดไป                                    |
| BILL_ACCESS_CODE    | รหัสลับยาวอย่างน้อย 16 ตัวอักษรสำหรับเจ้าของเว็บ ใช้กรอกตอนยืนยันส่งบิล |

สร้างรหัสส่งบิลสุ่มบนเครื่องของคุณ เช่น `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"` แล้วนำผลไปใส่เฉพาะ env บน Vercel ห้าม commit รหัส

BILL_ACCESS_CODE ป้องกันบุคคลทั่วไปเรียก API ส่งบิลโดยไม่ได้รับอนุญาต แม้เว็บบน Vercel จะเปิดสาธารณะ ใช้รหัสเฉพาะเว็บนี้ และไม่แชร์กับผู้ไม่เกี่ยวข้อง ทุก env มีตัวอย่างว่างใน `.env.example` โดย `.gitignore` กัน `.env*` และอนุญาตเฉพาะ `.env.example`

## ตั้งค่า EmailJS แบบทีละขั้น

### 1. เชื่อมอีเมลผู้ส่ง

เพิ่ม Email Service ใน EmailJS และทดสอบ connection จาก Dashboard จด Service ID ลง env เปิดการอนุญาตให้ส่งจาก non-browser/server applications ใน Account > Security ตามการตั้งค่าบัญชีของคุณ และเปิดใช้ Private Key authorization

### 2. สร้าง Template

เปิด HTML/source editor ของ Template แล้ววางเนื้อหาทั้งหมดจาก `email-templates/bill-email.html`

ตั้งค่าช่อง:

| ช่องใน EmailJS  | ค่า                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| To Email        | `{{to_email}}`                                                                                             |
| To Name (ถ้ามี) | `{{to_name}}`                                                                                              |
| From Name       | `หารกัน · {{owner_name}}`                                                                                  |
| From Email      | อีเมลผู้ส่งที่เชื่อมกับ Service / ค่าเริ่มต้นที่ยืนยันแล้ว                                                 |
| Reply To        | `{{reply_to}}` (เป็นอีเมลเจ้าของบิลถ้ากรอกไว้; ถ้า provider ไม่ยอมรับค่าว่าง ให้ใช้ค่าเริ่มต้นของ Service) |
| Subject         | `สรุปค่าอาหาร {{bill_title}} — ฿{{total_amount}}`                                                          |
| CC / BCC        | เว้นว่าง เพื่อไม่เปิดเผยอีเมลของเพื่อนคนอื่น                                                               |

ข้อมูลที่ส่ง: `to_email`, `to_name`, `bill_title`, `bill_date`, `bill_id`, `owner_name`, `reply_to`, `promptpay_id`, `note`, `items[]` (name, quantity, headcount, line_total, share), `subtotal`, `discount`, `service`, `vat`, `total_amount`, `qr_image`

### 3. แนบภาพ QR ให้แสดงในอีเมลจริง

ในแท็บ Attachments ของ Template เพิ่ม Dynamic Attachment:

| ช่อง            | ค่า                            |
| --------------- | ------------------------------ |
| Attachment type | Variable Attachment            |
| Parameter name  | `qr_image`                     |
| Filename        | `promptpay.png`                |
| Content type    | `image/png` หรือ PNG ตามหน้าจอ |

HTML ใช้ `<img src="cid:qr_image">` ซึ่งตรงกับ Parameter Name ของ dynamic attachment ต้องตั้งส่วนนี้ มิฉะนั้นอีเมลอาจไม่มี QR ตรวจว่าแผน EmailJS ของคุณรองรับ attachment ที่ต้องการ

ภาพ QR ถูกสร้างในเซิร์ฟเวอร์ ส่งเป็น PNG base64 attachment ไม่ส่งหมายเลขพร้อมเพย์ไปเว็บสร้าง QR ภายนอก และไม่ใช้ data URI เป็น src ของอีเมลจริง (preview ภายในเว็บใช้ data URI เพื่อดูภาพได้ทันที)

### 4. ส่งทดสอบหลังใส่คีย์จริง

เว็บไม่ส่งอีเมลใด ๆ ตอนโหลดหรือแก้ไขบิล กด `เรียกเก็บบิล` → ตรวจรายชื่อ/ยอด/พร้อมเพย์ → ดูตัวอย่างอีเมล → กรอกรหัสส่งบิล → ติ๊กยืนยัน → ส่งเรียกเก็บ

เว้นระยะส่งอย่างน้อย 1.2 วินาทีต่อฉบับตามข้อจำกัด API ของ EmailJS แต่บัญชีผู้ส่งและแพ็กเกจยังมีโควตาของตนเอง

## วิธีหารและความถูกต้อง

- ราคาคือราคาต่อหน่วย × จำนวน หารเท่ากันเฉพาะคนที่ติ๊กในเมนูนั้น
- เก็บตัวเลขและคำนวณเป็นหน่วยสตางค์ ไม่ใช้ผลทศนิยมสะสมมาหารโดยตรง
- เศษสตางค์ของเมนูแจกให้คนตามลำดับในรายชื่อ เช่น 100 ÷ 3 = 33.34, 33.33, 33.33
- ส่วนลดแบ่งตามสัดส่วนค่าอาหาร; Service คิดหลังหักส่วนลด; VAT คิดหลังรวม Service และกระจายเศษด้วย largest remainder
- หากราคาในใบเสร็จรวม Service/VAT แล้ว ให้ปล่อยค่าเหล่านี้เป็น 0 เพื่อไม่คิดซ้ำ
- เจ้าของบิลร่วมรายการอาหารได้ แต่ไม่รับอีเมลเรียกเก็บและไม่รวมในยอดที่เพื่อนโอนคืน
- รองรับ 30 คน / 100 รายการ และยอดรวมไม่เกิน 1,000,000 บาท
- พร้อมเพย์รองรับมือถือไทย 10 หลัก (06/08/09) หรือเลขบัตรประชาชน 13 หลักที่ผ่าน checksum ต้องลงทะเบียนพร้อมเพย์ไว้แล้ว
- QR มีทั้งผู้รับและยอดเงินตามมาตรฐาน PromptPay; ตรวจชื่อบัญชีจริงในแอปธนาคารก่อนโอน ตัวเว็บไม่สามารถตรวจสอบชื่อบัญชีหรือยืนยันว่าโอนแล้วได้

## การจัดเก็บและการส่งซ้ำ

บิลร่างเก็บใน localStorage เฉพาะเบราว์เซอร์นี้ ไม่ซิงก์ข้ามเครื่อง เริ่มด้วยข้อมูลตัวอย่างและไม่มีอีเมลหรือพร้อมเพย์จริง สามารถกดเริ่มบิลใหม่ได้

อีเมลส่งผ่าน `/api/send-bill` ฝั่งเซิร์ฟเวอร์ โดยใช้ EmailJS REST API ทางการกับ React frontend (ไม่ใส่ Private Key ลง @emailjs/browser) เซิร์ฟเวอร์ตรวจรหัส ตรวจข้อมูล คำนวณยอดและสร้าง QR ใหม่จากบิล ไม่เชื่อยอดเงินหรือ HTML ที่ส่งมาจากไคลเอนต์

แต่ละคนเห็นเฉพาะรายการของตัวเอง ข้อมูลที่ผู้ใช้กรอกถูก escape ใน HTML และเทมเพลตใช้ตัวแปรแบบสองปีกกาของ EmailJS

สถานะ accepted หมายถึง EmailJS รับคำขอ ไม่ใช่ยืนยันการเข้ากล่องจดหมาย/อ่าน/ชำระเงิน ผลสำเร็จเก็บตาม fingerprint ของบิลในเบราว์เซอร์และจะไม่ส่งซ้ำ หากแก้ข้อมูลบิลจะนับเป็นฉบับใหม่

เมื่อขาดการเชื่อมต่อ ผลจะเป็น uncertain และไม่ลองซ้ำอัตโนมัติ ต้องตรวจ EmailJS History แล้วกดยืนยันว่าไม่พบการส่งก่อนอนุญาตลองใหม่ มี duplicate guard ใน server instance แต่ **ไม่ใช่ distributed exactly-once delivery** หากเปลี่ยนเครื่อง ล้างข้อมูล หรือเกิดหลาย instance ต้องตรวจ History ก่อนส่งซ้ำ สำหรับระบบขนาดใหญ่ควรเพิ่ม durable queue / database และระบบบัญชีผู้ใช้

## โครงสร้างแบบ Feature-based Architecture

```text
app/                         # Next.js routes และ layout
  page.tsx                   # ประกอบหน้า BillWorkspace
  globals.css                # import Tailwind, base และ shared UI เท่านั้น
  api/                       # route บาง ๆ เรียกใช้ server ของ feature
features/
  bill/
    components/              # หน้าบิล ข้อมูลบิล เพื่อน เมนู สรุปยอด และ dialog
    hooks/                   # useBillDraft และ useBillWorkspace
    model/                   # types, schemas, calculate, draft และ validation
    styles/                  # shell, bill-info, friends, items, summary, dialog, help
  payments/
    components/              # ตั้งค่าผู้รับเงิน รายละเอียดรายคน และภาพ QR
    lib/                     # ตรวจพร้อมเพย์ สร้าง payload และ QR PNG
    styles/payments.css
  bill-email/
    components/              # สถานะอีเมล ตรวจบิล และตัวอย่างอีเมล
    hooks/use-bill-email.ts   # readiness, ส่งทีละคน, ป้องกันส่งซ้ำ และ retry
    lib/email-template.ts    # email parameters และ HTML preview
    server/send-bill.ts      # authorization, validation และเรียก EmailJS
    styles/bill-email.css
shared/
  ui/                        # Avatar, Field และ SectionTitle ที่ใช้ร่วมกัน
  lib/                       # แปลง/แสดงจำนวนเงิน และตรวจรูปแบบอีเมล
  styles/                    # base.css และ ui.css
email-templates/              # HTML สำหรับวางใน EmailJS
tests/                       # คำนวณ / QR decode / email data / API แบบ mock
```

### แนวทางเพิ่มหรือแก้ไขโค้ด

- โค้ดของแต่ละ feature อยู่ด้วยกันใน `components`, `hooks`, `model` หรือ `lib`, `styles` และ `server` ตามหน้าที่ ไม่จำเป็นต้องสร้างทุกโฟลเดอร์ถ้ายังไม่ได้ใช้
- `app` รับผิดชอบ routes และการประกอบหน้า ส่วน business logic อยู่ใน feature; `shared` เก็บเฉพาะสิ่งที่ใช้ร่วมกันและไม่ import จาก feature
- Component import CSS ที่ตัวเองใช้ เช่น `FriendsEditor` import `friends.css`; กฎ responsive และสีข้อความของส่วนนั้นอยู่ในไฟล์เดียวกัน
- CSS ยังคงใช้ชื่อ class เดิมเพื่อรักษาหน้าตา: class ส่วนกลาง เช่น `.card`, `.btn`, `.field` อยู่ใน `shared/styles/ui.css` ส่วน class ของ feature เช่น `.friend-row`, `.menu-item`, `.payment-note` อยู่ใน feature นั้น หลีกเลี่ยงการใช้ชื่อ class ของ feature อื่นกับ UI ใหม่
- เพิ่ม reset, design tokens หรือกฎพื้นฐานใน `shared/styles/base.css`; เพิ่มสไตล์เฉพาะ feature ใน `features/<feature>/styles` และ import ผ่าน component ที่ใช้ ไม่เพิ่มทุกอย่างกลับเข้า `globals.css`
- `useBillWorkspace` ประสาน state และการเปิดหน้าต่าง, `useBillDraft` จัดการ localStorage, `useBillEmail` จัดการการส่งและผลลัพธ์ รหัสส่งบิลยังอยู่เฉพาะ memory และคีย์ EmailJS อ่านเฉพาะฝั่งเซิร์ฟเวอร์

## เอกสารอ้างอิง

- EmailJS REST: https://www.emailjs.com/docs/rest-api/send/
- Dynamic variables: https://www.emailjs.com/docs/user-guide/dynamic-variables-templates/
- Dynamic attachments: https://www.emailjs.com/docs/user-guide/file-attachments/
- CID image embedding: https://www.emailjs.com/docs/user-guide/embedded-images/
- PromptPay generator: https://github.com/dtinth/promptpay-qr

## ขอบเขตการตรวจสอบ

ทดสอบการคำนวณ, QR PNG โดย decode กลับเป็น payload, การแยกข้อมูลผู้รับ, การ escape HTML, API authorization และ duplicate guard โดย mock EmailJS พร้อมตรวจ TypeScript และ production build

ระหว่างปรับโครงสร้าง ได้ตรวจด้วยเบราว์เซอร์อัตโนมัติที่ความกว้าง 390, 520, 768, 800, 1000, 1100 และ 1440 พิกเซล เทียบ computed styles กับ CSS เดิม และทดสอบแก้ไข/กู้คืนบิล เปิดรายละเอียดรายคน ตัวอย่างอีเมล เริ่มบิลใหม่ เพิ่มเพื่อน/เมนู และ validation โดยไม่ใช้คีย์จริง ไม่ส่งอีเมลจริง และไม่ทดลองโอนเงินจริง
