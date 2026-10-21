import { Plus } from "lucide-react";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function NewBill({
  setModal,
  fresh,
}: Pick<BillWorkspace, "setModal" | "fresh">) {
  return (
    <div className="modal-body">
      <p>
        บิลปัจจุบันจะถูกแทนที่ หากต้องการเก็บยอดไว้
        ให้คัดลอกสรุปบิลก่อนเริ่มใหม่
      </p>
      <div className="modal-actions">
        <button className="btn secondary" onClick={() => setModal(null)}>
          เก็บบิลเดิมไว้
        </button>
        <button className="btn primary" onClick={fresh}>
          <Plus size={17} />
          เริ่มบิลใหม่
        </button>
      </div>
    </div>
  );
}
