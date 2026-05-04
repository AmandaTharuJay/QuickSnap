import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const protocolLogsRouter = router({
  list: protectedProcedure
    .input(z.object({ protocol: z.string().optional() }).optional())
    .query(({ ctx, input }) => {
      const query = db.select().from(schema.protocolLogs)
        .where(eq(schema.protocolLogs.userId, ctx.user.id))
        .orderBy(desc(schema.protocolLogs.timestamp));
      return query.all();
    }),

  analyze: protectedProcedure
    .input(z.object({
      protocol: z.string().min(1),
      logContent: z.string().min(1),
    }))
    .mutation(({ ctx, input }) => {
      const lines = input.logContent.split("\n");
      const errors = lines.filter(l => l.includes("[ERROR]"));
      const warnings = lines.filter(l => l.includes("[WARN]"));

      let severity = "info";
      if (errors.length > 0) severity = "error";
      else if (warnings.length > 0) severity = "warning";

      const analysis = generateLogAnalysis(input.protocol, lines, errors, warnings);

      const record = db.insert(schema.protocolLogs).values({
        userId: ctx.user.id,
        protocol: input.protocol,
        logContent: input.logContent,
        analysis,
        severity,
      }).returning().get();

      return record;
    }),
});

function generateLogAnalysis(protocol: string, lines: string[], errors: string[], warnings: string[]) {
  const parts = [`## ${protocol} Protocol Log Analysis\n`];
  parts.push(`**Total Lines:** ${lines.length}`);
  parts.push(`**Errors:** ${errors.length}`);
  parts.push(`**Warnings:** ${warnings.length}\n`);

  if (errors.length > 0) {
    parts.push("### Errors Found");
    errors.forEach(e => parts.push(`- ${e.trim()}`));
    parts.push("");
  }

  if (warnings.length > 0) {
    parts.push("### Warnings");
    warnings.forEach(w => parts.push(`- ${w.trim()}`));
    parts.push("");
  }

  parts.push("### Recommendations");
  if (errors.length > 0) {
    parts.push("- Investigate error conditions immediately");
    parts.push("- Check network connectivity and protocol configuration");
  }
  if (warnings.length > 0) {
    parts.push("- Review warning conditions for potential issues");
    parts.push("- Monitor for escalation of warnings to errors");
  }
  if (errors.length === 0 && warnings.length === 0) {
    parts.push("- Log appears clean, no issues detected");
    parts.push("- Continue monitoring for any anomalies");
  }

  return parts.join("\n");
}
