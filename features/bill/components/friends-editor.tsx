import "@/features/bill/styles/friends.css";
import { Mail, Plus, Trash2, Users, LockKeyhole } from "lucide-react";
import { Avatar } from "@/shared/ui/avatar";
import { SectionTitle } from "@/shared/ui/section-title";
import { emailValid } from "@/shared/lib/email";
import type { BillWorkspace } from "@/features/bill/hooks/use-bill-workspace";

export function FriendsEditor({
  bill,
  editFriend,
  removeFriend,
  addFriend,
}: Pick<BillWorkspace, "bill" | "editFriend" | "removeFriend" | "addFriend">) {
  return (
    <section className="card" id="friends">
      <SectionTitle
        icon={Users}
        number="01"
        title="ใครมื้อนี้บ้าง"
        description="ใส่ชื่อและอีเมลไว้ส่งบิลให้แต่ละคน"
        action={<span className="count-tag">{bill.friends.length} คน</span>}
      />
      <div className="friend-labels">
        <span>เพื่อนร่วมโต๊ะ</span>
        <span>อีเมลสำหรับรับบิล</span>
      </div>
      <div className="friend-list">
        {bill.friends.map((friend, i) => (
          <div className="friend-row" key={friend.id}>
            <Avatar name={friend.name} index={i} />
            <div className="friend-name">
              <input
                id={`name-${friend.id}`}
                aria-label={`ชื่อเพื่อนคนที่ ${i + 1}`}
                value={friend.name}
                placeholder="ชื่อเพื่อน"
                maxLength={60}
                onChange={(e) =>
                  editFriend(friend.id, { name: e.target.value })
                }
              />
              {friend.id === bill.ownerId && (
                <span className="owner-label">เจ้าของบิล</span>
              )}
            </div>
            <div className="email-input">
              <Mail size={14} />
              <input
                type="email"
                aria-label={`อีเมลของ ${friend.name || "เพื่อน"}`}
                placeholder={
                  friend.id === bill.ownerId
                    ? "อีเมลตอบกลับ (ไม่บังคับ)"
                    : "friend@email.com"
                }
                value={friend.email}
                maxLength={254}
                onChange={(e) =>
                  editFriend(friend.id, { email: e.target.value })
                }
                aria-invalid={Boolean(
                  friend.email && !emailValid(friend.email),
                )}
              />
            </div>
            <button
              className="icon-btn delete"
              disabled={friend.id === bill.ownerId}
              aria-label={`ลบ ${friend.name || "เพื่อน"}`}
              onClick={() => removeFriend(friend.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
      <button className="add-button" onClick={addFriend}>
        <Plus size={16} />
        เพิ่มเพื่อนร่วมโต๊ะ
      </button>
      <p className="quiet-note">
        <LockKeyhole size={12} />
        ส่งอีเมลเฉพาะคนที่มียอดจ่าย โดยไม่รวมเจ้าของบิล
      </p>
    </section>
  );
}
