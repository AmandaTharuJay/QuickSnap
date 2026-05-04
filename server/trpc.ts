import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import { db, schema } from "./db/index.js";
import { eq } from "drizzle-orm";

export async function createContext({ req, res }: CreateExpressContextOptions) {
  const userId = req.session?.userId as number | undefined;
  let user = null;
  if (userId) {
    user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get() ?? null;
  }
  return { user, req, res };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
