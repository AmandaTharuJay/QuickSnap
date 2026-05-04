import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const exportRouter = router({
  testCasesCSV: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => {
      const cases = db.select().from(schema.testCases)
        .where(eq(schema.testCases.sessionId, input.sessionId))
        .all();

      const header = "Title,Description,Steps,Expected Result,Actual Result,Status,Priority,Created At";
      const rows = cases.map(tc =>
        `"${tc.title}","${tc.description}","${tc.steps}","${tc.expectedResult}","${tc.actualResult ?? ""}","${tc.status}","${tc.priority}","${tc.createdAt}"`
      );

      return { csv: [header, ...rows].join("\n"), filename: `test-cases-session-${input.sessionId}.csv` };
    }),

  testCasesPDF: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => {
      const cases = db.select().from(schema.testCases)
        .where(eq(schema.testCases.sessionId, input.sessionId))
        .all();

      const content = cases.map(tc =>
        `Test Case: ${tc.title}\nDescription: ${tc.description}\nSteps: ${tc.steps}\nExpected: ${tc.expectedResult}\nActual: ${tc.actualResult ?? "N/A"}\nStatus: ${tc.status}\nPriority: ${tc.priority}\n---`
      ).join("\n\n");

      return { content, filename: `test-cases-session-${input.sessionId}.txt` };
    }),

  defectReportsCSV: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => {
      const defects = db.select().from(schema.defectReports)
        .where(eq(schema.defectReports.sessionId, input.sessionId))
        .all();

      const header = "Defect ID,Title,Description,Severity,Status,Protocol,Game,Created At";
      const rows = defects.map(d =>
        `"${d.defectId}","${d.title}","${d.description}","${d.severity}","${d.status}","${d.protocol ?? ""}","${d.gameName ?? ""}","${d.createdAt}"`
      );

      return { csv: [header, ...rows].join("\n"), filename: `defect-reports-session-${input.sessionId}.csv` };
    }),

  defectReportsPDF: protectedProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(({ input }) => {
      const defects = db.select().from(schema.defectReports)
        .where(eq(schema.defectReports.sessionId, input.sessionId))
        .all();

      const content = defects.map(d =>
        `Defect: ${d.defectId} - ${d.title}\nSeverity: ${d.severity}\nStatus: ${d.status}\nDescription: ${d.description}\nSteps: ${d.stepsToReproduce ?? "N/A"}\nExpected: ${d.expectedResult ?? "N/A"}\nActual: ${d.actualResult ?? "N/A"}\n---`
      ).join("\n\n");

      return { content, filename: `defect-reports-session-${input.sessionId}.txt` };
    }),

  allDefectReportsCSV: protectedProcedure.mutation(({ ctx }) => {
    const defects = db.select().from(schema.defectReports)
      .where(eq(schema.defectReports.userId, ctx.user.id))
      .all();

    const header = "Defect ID,Title,Description,Severity,Status,Protocol,Game,Created At";
    const rows = defects.map(d =>
      `"${d.defectId}","${d.title}","${d.description}","${d.severity}","${d.status}","${d.protocol ?? ""}","${d.gameName ?? ""}","${d.createdAt}"`
    );

    return { csv: [header, ...rows].join("\n"), filename: "all-defect-reports.csv" };
  }),
});
