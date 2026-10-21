"use client";

import "@/features/bill/styles/shell.css";
import { useBillWorkspace } from "../hooks/use-bill-workspace";
import { BillDialog } from "./bill-dialog";
import { WorkspaceHeader } from "@/features/bill/components/workspace-header";
import { WorkspaceIntro } from "@/features/bill/components/workspace-intro";
import { WorkspaceFooter } from "@/features/bill/components/workspace-footer";
import { SendBillBar } from "@/features/bill-email/components/send-bill-bar";
import { BillInfo } from "@/features/bill/components/bill-info";
import { FriendsEditor } from "@/features/bill/components/friends-editor";
import { ItemsEditor } from "@/features/bill/components/items-editor";
import { PaymentSettings } from "@/features/payments/components/payment-settings";
import { BillSummary } from "@/features/bill/components/bill-summary";
import { EmailStatus } from "@/features/bill-email/components/email-status";
import { CheckCircle2, AlertCircle } from "lucide-react";

export function BillWorkspace() {
  const workspace = useBillWorkspace();
  if (!workspace)
    return (
      <div className="loading-screen">
        <span className="brand-symbol">÷</span>
        <p>กำลังเตรียมโต๊ะให้ทุกคน…</p>
      </div>
    );
  const { issues, notice } = workspace;
  return (
    <>
      <WorkspaceHeader {...workspace} />
      <main className="page-wrap">
        <WorkspaceIntro {...workspace} />
        <div className="workspace">
          <div className="editor-column">
            <BillInfo {...workspace} />
            <FriendsEditor {...workspace} />
            <ItemsEditor {...workspace} />
            <PaymentSettings {...workspace} />
          </div>
          <aside className="summary-column">
            <BillSummary {...workspace} />
            <EmailStatus {...workspace} />
          </aside>
        </div>
        {issues.length > 0 && (
          <div className="validation-box" id="bill-errors" role="alert">
            <h3>
              <AlertCircle size={18} />
              ขอเช็กอีกนิดก่อนส่งบิล
            </h3>
            <ul>
              {issues.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        )}
        <SendBillBar {...workspace} />
        <WorkspaceFooter {...workspace} />
      </main>
      {notice && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}
      <BillDialog workspace={workspace} />
    </>
  );
}
