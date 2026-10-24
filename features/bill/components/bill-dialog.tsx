import "../styles/dialog.css";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BillWorkspace } from "../hooks/use-bill-workspace";
import { ReviewBill } from "@/features/bill-email/components/review-bill";
import { PersonDetails } from "@/features/payments/components/person-details";
import { EmailPreview } from "@/features/bill-email/components/email-preview";
import { NewBill } from "@/features/bill/components/new-bill";
import { HelpContent } from "@/features/bill/components/help-content";

export function BillDialog({ workspace }: { workspace: BillWorkspace }) {
  const { modal, setModal, sending, person } = workspace;
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (modal) {
      dialog.current?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog.current?.close();
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [modal]);
  return (
    <dialog
      ref={dialog}
      className={`modal ${modal === "email" ? "email-modal" : ""}`}
      onCancel={(e) => {
        if (sending) e.preventDefault();
        else setModal(null);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !sending) setModal(null);
      }}
    >
      <div className="modal-top">
        <div>
          <span className="eyebrow">HAN KAN / หารกัน</span>
          <h2>
            {modal === "review"
              ? "ตรวจสอบก่อนเรียกเก็บบิล"
              : modal === "person"
                ? `ส่วนของ ${person?.friend.name || "เพื่อน"}`
                : modal === "email"
                  ? "ตัวอย่างอีเมลที่จะได้รับ"
                  : modal === "new"
                    ? "เริ่มบิลใหม่"
                    : "ใช้งานง่าย ใน 3 ขั้นตอน"}
          </h2>
        </div>
        <button
          className="icon-btn"
          aria-label="ปิดหน้าต่าง"
          disabled={sending}
          onClick={() => setModal(null)}
        >
          <X size={22} />
        </button>
      </div>
      {modal === "review" && (
        <ReviewBill {...workspace} onClose={() => setModal(null)} />
      )}
      {modal === "person" && <PersonDetails {...workspace} />}
      {modal === "email" && (
        <EmailPreview
          preview={workspace.preview}
          onBack={() => setModal("review")}
        />
      )}
      {modal === "new" && <NewBill {...workspace} />}
      {modal === "help" && <HelpContent />}
    </dialog>
  );
}
