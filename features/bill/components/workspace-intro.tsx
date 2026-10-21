import { ArrowRight, Info, UtensilsCrossed } from "lucide-react";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function WorkspaceIntro({
  sample,
  setModal,
}: Pick<BillWorkspace, "sample" | "setModal">) {
  return (
    <>
      <div className="welcome">
        <div>
          <div className="eyebrow">GOOD FOOD, GOOD FRIENDS.</div>
          <h1>
            มื้อนี้หารกัน ใครจ่ายเท่าไหร่<span>?</span>
          </h1>
          <p>เลือกคนที่กินแต่ละเมนู ที่เหลือให้เราช่วยหาร</p>
        </div>
        <div className="welcome-mark" aria-hidden="true">
          <UtensilsCrossed size={29} />
          <span>
            กินให้อิ่ม
            <br />
            <b>หารให้เป๊ะ</b>
          </span>
          <span className="mark-star">✳</span>
        </div>
      </div>
      <div className="steps">
        <a href="#friends">
          <span>1</span>เพิ่มเพื่อน
        </a>
        <i />
        <a href="#items">
          <span>2</span>เลือกเมนูที่กิน
        </a>
        <i />
        <a href="#payment">
          <span>3</span>สรุปแล้วเรียกเก็บ
        </a>
      </div>
      {sample && (
        <div className="sample-banner">
          <Info size={17} />
          <span>นี่คือบิลตัวอย่าง ลองแก้ไขและติ๊กชื่อได้เลย</span>
          <button onClick={() => setModal("new")}>
            เริ่มบิลของคุณ <ArrowRight size={14} />
          </button>
        </div>
      )}
    </>
  );
}
