import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const testCasesRouter = router({
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => {
      return db.select().from(schema.testCases)
        .where(eq(schema.testCases.sessionId, input.sessionId))
        .orderBy(desc(schema.testCases.createdAt))
        .all();
    }),

  create: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      title: z.string().min(1),
      description: z.string().min(1),
      steps: z.string().min(1),
      expectedResult: z.string().min(1),
      priority: z.enum(["critical", "high", "medium", "low"]).default("medium"),
    }))
    .mutation(({ ctx, input }) => {
      return db.insert(schema.testCases).values({
        ...input,
        userId: ctx.user.id,
      }).returning().get();
    }),
});
