import { HelpCircle, Plus } from "lucide-react";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function WorkspaceHeader({
  saved,
  setModal,
}: Pick<BillWorkspace, "saved" | "setModal">) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <a className="brand" href="/">
          <span className="brand-symbol">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-divide preview-icon"
            >
              <circle cx="12" cy="6" r="1" />
              <line x1="5" x2="19" y1="12" y2="12" />
              <circle cx="12" cy="18" r="1" />
            </svg>
          </span>
          <span>
            หารกัน<small>อิ่มด้วยกัน จ่ายส่วนของเรา</small>
          </span>
        </a>
        <div className="header-right">
          <span className={`save-indicator ${saved ? "" : "unsaved"}`}>
            <span />
            {saved ? "บันทึกในเครื่องแล้ว" : "ยังไม่บันทึก"}
          </span>
          <button
            className="icon-btn help-button"
            aria-label="วิธีใช้งาน"
            onClick={() => setModal("help")}
          >
            <HelpCircle size={19} />
          </button>
          <button
            className="btn secondary new-bill"
            onClick={() => setModal("new")}
          >
            <Plus size={16} />
            บิลใหม่
          </button>
        </div>
      </div>
    </header>
  );
}
