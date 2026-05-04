import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq, desc, like, sql } from "drizzle-orm";
import { z } from "zod";

export const faultRepoRouter = router({
  listFaults: protectedProcedure
    .input(z.object({ protocol: z.string().optional() }).optional())
    .query(({ ctx }) => {
      return db.select().from(schema.faultRepository)
        .where(eq(schema.faultRepository.userId, ctx.user.id))
        .orderBy(desc(schema.faultRepository.createdAt))
        .all();
    }),

  searchByKeyword: protectedProcedure
    .input(z.object({ keyword: z.string().min(1) }))
    .query(({ ctx, input }) => {
      return db.select().from(schema.faultRepository)
        .where(eq(schema.faultRepository.userId, ctx.user.id))
        .all()
        .filter(f =>
          f.title.toLowerCase().includes(input.keyword.toLowerCase()) ||
          f.description.toLowerCase().includes(input.keyword.toLowerCase()) ||
          (f.rootCause?.toLowerCase().includes(input.keyword.toLowerCase()) ?? false)
        );
    }),

  searchByGameId: protectedProcedure
    .input(z.object({ gameId: z.string().min(1) }))
    .query(({ ctx, input }) => {
      return db.select().from(schema.faultRepository)
        .where(eq(schema.faultRepository.userId, ctx.user.id))
        .all()
        .filter(f => f.gameId?.toLowerCase().includes(input.gameId.toLowerCase()));
    }),

  getSearchStats: protectedProcedure.query(({ ctx }) => {
    const faults = db.select().from(schema.faultRepository)
      .where(eq(schema.faultRepository.userId, ctx.user.id))
      .all();

    const byProtocol: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const f of faults) {
      byProtocol[f.protocol] = (byProtocol[f.protocol] ?? 0) + 1;
      bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
    }

    return { total: faults.length, byProtocol, bySeverity };
  }),

  createFault: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      protocol: z.string().min(1),
      severity: z.enum(["critical", "high", "medium", "low"]).default("medium"),
      gameName: z.string().optional(),
      gameId: z.string().optional(),
      rootCause: z.string().optional(),
      resolution: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const faultId = `FLT-${String(Date.now()).slice(-6)}`;
      return db.insert(schema.faultRepository).values({
        ...input,
        faultId,
        userId: ctx.user.id,
      }).returning().get();
    }),
});
