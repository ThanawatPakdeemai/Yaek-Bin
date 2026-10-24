import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function WorkspaceFooter({ setModal }: Pick<BillWorkspace, "setModal">) {
  return (
    <footer className="footer">
      <span>
        ÷ หารกัน <i />
        เรื่องเงินชัดเจน เรื่องกินสบายใจ
      </span>
      <button onClick={() => setModal("help")}>
        วิธีใช้งานและความเป็นส่วนตัว
      </button>
    </footer>
  );
}
