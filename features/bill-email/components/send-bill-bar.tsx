import "../styles/bill-email.css";
import { ArrowRight, CheckCheck } from "lucide-react";

type Props = { openReview: () => Promise<void> };

export function SendBillBar({ openReview }: Props) {
  return (
    <section className="send-bar">
      <div className="send-bar-text">
        <span className="send-icon">
          <CheckCheck size={24} />
        </span>
        <div>
          <h2>ครบแล้ว? ส่งบิลให้เพื่อนได้เลย</h2>
          <p>ตรวจยอดและอีเมลอีกครั้งก่อนส่งจริง</p>
        </div>
      </div>
      <button className="btn primary send-main" onClick={openReview}>
        เรียกเก็บบิล <ArrowRight size={19} />
      </button>
    </section>
  );
}
