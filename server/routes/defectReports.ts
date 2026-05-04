import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const defectReportsRouter = router({
  listBySession: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(({ input }) => {
      return db.select().from(schema.defectReports)
        .where(eq(schema.defectReports.sessionId, input.sessionId))
        .orderBy(desc(schema.defectReports.createdAt))
        .all();
    }),

  create: protectedProcedure
    .input(z.object({
      sessionId: z.number(),
      defectId: z.string().min(1),
      title: z.string().min(1),
      description: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
      stepsToReproduce: z.string().optional(),
      expectedResult: z.string().optional(),
      actualResult: z.string().optional(),
      protocol: z.string().optional(),
      gameName: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return db.insert(schema.defectReports).values({
        ...input,
        userId: ctx.user.id,
      }).returning().get();
    }),
});
