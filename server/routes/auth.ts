import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const authRouter = router({
  me: publicProcedure.query(({ ctx }) => {
    return ctx.user ?? null;
  }),

  login: publicProcedure
    .input(z.object({ username: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      let user = db.select().from(schema.users).where(eq(schema.users.username, input.username)).get();
      if (!user) {
        user = db.insert(schema.users).values({
          username: input.username,
          email: `${input.username}@aiqaassist.com`,
          displayName: input.username.charAt(0).toUpperCase() + input.username.slice(1),
        }).returning().get();
      }
      (ctx.req.session as any).userId = user.id;
      return user;
    }),

  logout: protectedProcedure.mutation(({ ctx }) => {
    (ctx.req.session as any).userId = undefined;
    return { success: true };
  }),
});
