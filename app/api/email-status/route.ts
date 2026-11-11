import {
  emailConfig,
  configReady,
} from "@/features/bill-email/server/send-bill";
export const dynamic = "force-dynamic";
export async function GET() {
  const config = emailConfig();
  return Response.json(
    { configured: configReady(config) && configReady(config, "owner") },
    { headers: { "Cache-Control": "no-store" } },
  );
}
