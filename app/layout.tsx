import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'หารกัน — อิ่มด้วยกัน จ่ายส่วนของเรา',description:'หารค่าอาหารตามคนที่กิน สรุปยอดรายคน สร้าง QR พร้อมเพย์ และส่งบิลผ่านอีเมล',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="th"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"/></head><body>{children}</body></html>}
