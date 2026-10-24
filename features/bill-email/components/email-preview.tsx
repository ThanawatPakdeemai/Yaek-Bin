import "../styles/bill-email.css";
import { LoaderCircle } from "lucide-react";

type Props = { preview: string; onBack: () => void };

export function EmailPreview({ preview, onBack }: Props) {
  return (
    <div className="modal-body">
      <button className="text-button back-to-review" onClick={() => onBack()}>
        ← กลับไปตรวจรายชื่อ
      </button>
      {preview ? (
        <iframe
          className="email-frame"
          title="ตัวอย่างอีเมลเรียกเก็บบิล"
          srcDoc={preview}
          sandbox=""
        />
      ) : (
        <div className="loading-preview">
          <LoaderCircle className="spin" />
          กำลังสร้างตัวอย่าง…
        </div>
      )}
    </div>
  );
}
