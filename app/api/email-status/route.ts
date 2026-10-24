import {
  emailConfig,
  configReady,
} from "@/features/bill-email/server/send-bill";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(
    { configured: configReady(emailConfig()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
