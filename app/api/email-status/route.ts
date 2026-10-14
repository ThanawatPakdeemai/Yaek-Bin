import {emailConfig,configReady} from '@/lib/server-email';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({configured:configReady(emailConfig())},{headers:{'Cache-Control':'no-store'}});}
