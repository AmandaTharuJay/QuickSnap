import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq, desc, and, sql } from "drizzle-orm";
import { z } from "zod";

export const testSessionsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    const sessions = db.select().from(schema.testSessions)
      .where(eq(schema.testSessions.userId, ctx.user.id))
      .orderBy(desc(schema.testSessions.createdAt))
      .all();

    return sessions.map(session => {
      const testCases = db.select().from(schema.testCases)
        .where(eq(schema.testCases.sessionId, session.id))
        .all();
      const defects = db.select().from(schema.defectReports)
        .where(eq(schema.defectReports.sessionId, session.id))
        .all();
      return {
        ...session,
        testCaseCount: testCases.length,
        passedCount: testCases.filter(tc => tc.status === "passed").length,
        failedCount: testCases.filter(tc => tc.status === "failed").length,
        defectCount: defects.length,
      };
    });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(({ ctx, input }) => {
      const session = db.select().from(schema.testSessions)
        .where(and(eq(schema.testSessions.id, input.id), eq(schema.testSessions.userId, ctx.user.id)))
        .get();
      if (!session) return null;

      const testCases = db.select().from(schema.testCases)
        .where(eq(schema.testCases.sessionId, session.id))
        .orderBy(desc(schema.testCases.createdAt))
        .all();
      const defects = db.select().from(schema.defectReports)
        .where(eq(schema.defectReports.sessionId, session.id))
        .orderBy(desc(schema.defectReports.createdAt))
        .all();

      return { ...session, testCases, defects };
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      protocol: z.string().min(1),
      gameName: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return db.insert(schema.testSessions).values({
        ...input,
        userId: ctx.user.id,
      }).returning().get();
    }),
});
