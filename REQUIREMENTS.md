# สเปกที่แนะนำ · System Requirements

แอปรันในเบราว์เซอร์ล้วน ไม่ต้องติดตั้งอะไร. โหมด **เรียน / 2 คน / บอทง่าย / บอทกลางบนกระดานเล็ก**
เบามาก เปิดได้ทุกเครื่อง. ส่วนที่กินทรัพยากรคือบอทที่ใช้นิวรัลเน็ต — **ยาก, นิวรัล และ กลางบน 19×19** —
เพราะรัน KataGo + TensorFlow.js ในเบราว์เซอร์.

The app is 100% browser-based (no install). **Play / Learn / Easy / Medium-on-small-boards** are
featherweight and run anywhere. The heavy part is the neural-backed tiers — **Hard, Neural, and
Medium on 19×19** — which run KataGo + TensorFlow.js in the browser.

## สรุปต่อโหมด · At a glance

| โหมด · Mode | เอนจิน · Engine | โหลดครั้งแรก · First load | RAM (พีคตอนคิด) | เครื่องที่แนะนำ · Recommended |
|---|---|---|---|---|
| เรียน / 2 คน · Play + Learn | วาดกระดาน (JS) | 0 | < 100 MB | อะไรก็ได้ · anything (มือถือเก่าได้) |
| บอท **ง่าย** · Easy | heuristic 1 ตา (JS) | 0 | < 100 MB | อะไรก็ได้ · anything |
| บอท **กลาง** 9×9 / 13×13 · Medium | Monte-Carlo (JS worker) | 0 | < 150 MB | อะไรก็ได้ · anything |
| บอท **กลาง** 19×19 · Medium | KataGo เน็ตเล็ก + TF.js | ~4 MB | ~0.3–0.5 GB | RAM 4 GB+, เครื่องปี 2018+ |
| บอท **ยาก** (ทุกขนาด) · Hard | KataGo เน็ตเล็ก + TF.js | ~4 MB | ~0.3–0.5 GB | RAM 4 GB+, เครื่องปี 2018+ |
| บอท **นิวรัล** (ดั้น) · Neural | KataGo b18 + TF.js | **~93 MB** | **~1 GB+** | RAM 8 GB+, เดสก์ท็อป/โน้ตบุ๊กยุคใหม่ + GPU |

RAM = พีคชั่วคราวตอนบอทกำลังคิด · แอปคืนแรมให้อัตโนมัติเมื่อเลิกใช้บอทเน็ต
(transient peak while the bot thinks; the app frees it automatically when the net isn't in use).

## เบราว์เซอร์ · Browser

- **พื้นฐานทุกโหมด:** Chrome / Edge 113+, Firefox 115+, Safari 16+ (เดสก์ท็อปหรือมือถือ)
- **โหมดเน็ต (ยาก / นิวรัล / กลาง-19):** ต้องมี **WebAssembly** (เบราว์เซอร์ยุคใหม่มีหมด)
- **WebGPU** (Chrome / Edge 113+, Safari 18+): ถ้ามี → เร่งเน็ตเร็วขึ้นมาก · ถ้าไม่มี → ตกไปใช้ WASM (ช้ากว่าแต่เล่นได้)
- **Cross-origin isolation (COOP + COEP):** ทำให้ WASM ใช้ได้หลายเธรด (เร็วขึ้น)
  - เปิดอยู่บนโดเมนหลัก (Cloudflare Pages) ✓
  - บน host ที่ไม่ตั้ง header นี้ (เช่น GitHub Pages เปล่าๆ) → WASM เธรดเดียว (ช้ากว่า) หรือใช้ WebGPU แทน

## เครือข่าย · Network

- เรียน / 2 คน / ง่าย / กลาง-เล็ก: ออฟไลน์ได้หลังโหลดหน้าแรก (ไม่กี่ร้อย KB)
- ยาก / กลาง-19: โหลดเน็ตเล็ก **~4 MB** ครั้งแรก แล้ว cache ถาวร
- นิวรัล: โหลด **~93 MB** ครั้งแรก (เน็ตช้าจะนานหน่อย) แล้ว cache

## มือถือ · Mobile

- เรียน / เล่น / ง่าย / กลาง-เล็ก: ลื่นทุกเครื่อง
- ยาก / กลาง-19: ได้บนมือถือยุคใหม่ (RAM 4 GB+) · เครื่องเก่าอาจช้า
- นิวรัล: **ไม่แนะนำบนมือถือ RAM น้อย** — โหลด 93 MB + เทนเซอร์ใหญ่ อาจหน่วง/แท็บถูกปิดเพราะแรมไม่พอ

## หมายเหตุ · Notes

- ครั้งแรกที่เลือก **ยาก / นิวรัล** จะมีโหลดโมเดล — ระหว่างนั้นบอทเดินหมากมุม (opening book) ให้ก่อน
  เพื่อไม่ต้องรอโหลดทั้งก้อน
  (On the first Hard/Neural move while the model loads, the bot plays an instant corner book move.)
- แอป **terminate worker คืนแรม** อัตโนมัติเมื่อ: สลับออกจากบอทเน็ต · เปลี่ยนขนาดกระดานจนไม่ต้องใช้โมเดล ·
  พักแท็บนาน · ปิดหน้า
- ถ้าโมเดลโหลด/วิเคราะห์ไม่สำเร็จ จะ **fallback** ไปบอทในเครื่อง (greedy / Monte-Carlo) อัตโนมัติ — ไม่ค้าง

## ระดับความยาก × ขนาดกระดาน · Difficulty × board size

| ขนาด | ง่าย | กลาง | ยาก | นิวรัล |
|---|---|---|---|---|
| 9×9 | greedy (ทันที) | Monte-Carlo | เน็ตเล็ก 128 visits | b18 ดั้น |
| 13×13 | greedy (ทันที) | Monte-Carlo | เน็ตเล็ก 128 visits | b18 ดั้น |
| 19×19 | greedy (ทันที) | เน็ตเล็ก 32 visits | เน็ตเล็ก 96 visits | b18 ดั้น |
