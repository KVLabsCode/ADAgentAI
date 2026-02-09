import { handle } from "hono/vercel";
import app from "@/server/index";

export const maxDuration = 30;

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);
