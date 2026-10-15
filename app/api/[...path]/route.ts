import { env } from 'cloudflare:workers';
import { handle } from '../../../lib/handler.mjs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => handle(request, env.DB);
export const POST = GET;
export const PATCH = GET;
export const DELETE = GET;
