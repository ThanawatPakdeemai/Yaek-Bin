import { handleSend } from "@/features/bill-email/server/send-bill";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(request: Request) {
  return handleSend(request);
}
