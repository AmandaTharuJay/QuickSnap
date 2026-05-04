import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { z } from "zod";

export const aiDataRouter = router({
  query: protectedProcedure
    .input(z.object({
      question: z.string().min(1),
      context: z.string().optional(),
      protocol: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      const sessions = db.select().from(schema.testSessions)
        .where(eq(schema.testSessions.userId, ctx.user.id)).all();
      const testCases = db.select().from(schema.testCases)
        .where(eq(schema.testCases.userId, ctx.user.id)).all();
      const defects = db.select().from(schema.defectReports)
        .where(eq(schema.defectReports.userId, ctx.user.id)).all();
      const faults = db.select().from(schema.faultRepository)
        .where(eq(schema.faultRepository.userId, ctx.user.id)).all();

      const q = input.question.toLowerCase();
      let answer = "";
      let dataIncluded = false;

      if (q.includes("summary") || q.includes("overview") || q.includes("all my")) {
        const passed = testCases.filter(tc => tc.status === "passed").length;
        const failed = testCases.filter(tc => tc.status === "failed").length;
        const openDefects = defects.filter(d => d.status === "open").length;
        answer = `## Testing Summary\n\n` +
          `- **Test Sessions:** ${sessions.length}\n` +
          `- **Test Cases:** ${testCases.length} (${passed} passed, ${failed} failed)\n` +
          `- **Defect Reports:** ${defects.length} (${openDefects} open)\n` +
          `- **Known Faults:** ${faults.length}\n\n` +
          `### Sessions by Protocol\n` +
          Object.entries(sessions.reduce((acc: Record<string, number>, s) => {
            acc[s.protocol] = (acc[s.protocol] ?? 0) + 1;
            return acc;
          }, {})).map(([k, v]) => `- ${k}: ${v} sessions`).join("\n");
        dataIncluded = true;
      } else if (q.includes("pass rate") || q.includes("pass/fail")) {
        const passed = testCases.filter(tc => tc.status === "passed").length;
        const failed = testCases.filter(tc => tc.status === "failed").length;
        const total = testCases.length;
        const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : "N/A";
        answer = `## Pass Rate Analysis\n\n` +
          `- **Total Test Cases:** ${total}\n` +
          `- **Passed:** ${passed}\n` +
          `- **Failed:** ${failed}\n` +
          `- **Pass Rate:** ${rate}%`;
        dataIncluded = true;
      } else if (q.includes("critical") || q.includes("severity")) {
        const critical = defects.filter(d => d.severity === "critical");
        const high = defects.filter(d => d.severity === "high");
        answer = `## Defects by Severity\n\n` +
          `- **Critical:** ${critical.length}\n` +
          `- **High:** ${high.length}\n` +
          `- **Medium:** ${defects.filter(d => d.severity === "medium").length}\n` +
          `- **Low:** ${defects.filter(d => d.severity === "low").length}\n\n` +
          (critical.length > 0 ? `### Critical Defects\n${critical.map(d => `- **${d.defectId}**: ${d.title}`).join("\n")}` : "No critical defects found.");
        dataIncluded = true;
      } else if (q.includes("defect") || q.includes("bug")) {
        const open = defects.filter(d => d.status === "open");
        answer = `## Defect Overview\n\n` +
          `- **Total Defects:** ${defects.length}\n` +
          `- **Open:** ${open.length}\n` +
          `- **Resolved:** ${defects.filter(d => d.status === "resolved").length}\n\n` +
          (open.length > 0 ? `### Open Defects\n${open.map(d => `- **${d.defectId}** [${d.severity}]: ${d.title}`).join("\n")}` : "No open defects.");
        dataIncluded = true;
      } else if (q.includes("session") || q.includes("active")) {
        const active = sessions.filter(s => s.status === "active");
        answer = `## Test Sessions\n\n` +
          `- **Total Sessions:** ${sessions.length}\n` +
          `- **Active:** ${active.length}\n` +
          `- **Completed:** ${sessions.filter(s => s.status === "completed").length}\n\n` +
          `### Active Sessions\n` +
          active.map(s => `- **${s.name}** (${s.protocol}) - ${s.gameName ?? "N/A"}`).join("\n");
        dataIncluded = true;
      } else if (q.includes("fault") || q.includes("pattern")) {
        answer = `## Fault Repository\n\n` +
          `- **Total Known Faults:** ${faults.length}\n\n` +
          `### Faults by Protocol\n` +
          Object.entries(faults.reduce((acc: Record<string, number>, f) => {
            acc[f.protocol] = (acc[f.protocol] ?? 0) + 1;
            return acc;
          }, {})).map(([k, v]) => `- ${k}: ${v} faults`).join("\n") +
          `\n\n### Most Searched Faults\n` +
          faults.sort((a, b) => b.searchCount - a.searchCount).slice(0, 5)
            .map(f => `- **${f.faultId}**: ${f.title} (${f.searchCount} searches)`).join("\n");
        dataIncluded = true;
      } else if (q.includes("test case") || q.includes("priority")) {
        const byPriority: Record<string, number> = {};
        testCases.forEach(tc => { byPriority[tc.priority] = (byPriority[tc.priority] ?? 0) + 1; });
        answer = `## Test Cases Overview\n\n` +
          `- **Total:** ${testCases.length}\n\n` +
          `### By Priority\n` +
          Object.entries(byPriority).map(([k, v]) => `- ${k}: ${v}`).join("\n") +
          `\n\n### By Status\n` +
          `- Passed: ${testCases.filter(tc => tc.status === "passed").length}\n` +
          `- Failed: ${testCases.filter(tc => tc.status === "failed").length}\n` +
          `- Pending: ${testCases.filter(tc => tc.status === "pending").length}`;
        dataIncluded = true;
      } else {
        answer = getQAKnowledge(input.question);
        dataIncluded = false;
      }

      return {
        answer,
        dataIncluded,
        timestamp: new Date().toISOString(),
      };
    }),
});

function getQAKnowledge(question: string): string {
  const q = question.toLowerCase();
  if (q.includes("regression")) {
    return "## Regression Testing Best Practices\n\n" +
      "1. **Prioritize test cases** based on risk and frequency of changes\n" +
      "2. **Automate** repetitive regression tests where possible\n" +
      "3. **Maintain a regression suite** that covers critical paths\n" +
      "4. **Run regression tests** before every release\n" +
      "5. **Update tests** when requirements change\n" +
      "6. **Track regression defects** separately for trend analysis";
  }
  if (q.includes("test case") && q.includes("writing") || q.includes("best practice")) {
    return "## Test Case Best Practices\n\n" +
      "1. **Clear title** - Use descriptive titles that explain the test purpose\n" +
      "2. **Preconditions** - Document all prerequisites\n" +
      "3. **Step-by-step** - Write detailed, reproducible steps\n" +
      "4. **Expected results** - Define clear expected outcomes\n" +
      "5. **Test data** - Specify required test data\n" +
      "6. **Priority** - Assign appropriate priority levels";
  }
  if (q.includes("severity") && q.includes("priority")) {
    return "## Severity vs Priority\n\n" +
      "**Severity** measures the impact of a defect on the system:\n" +
      "- Critical: System crash, data loss\n" +
      "- High: Major feature broken, no workaround\n" +
      "- Medium: Feature impaired but has workaround\n" +
      "- Low: Minor issue, cosmetic\n\n" +
      "**Priority** measures the urgency of fixing:\n" +
      "- P1: Must fix immediately\n" +
      "- P2: Fix in current sprint\n" +
      "- P3: Fix in next release\n" +
      "- P4: Fix when possible";
  }
  return "## QA Assistant\n\nI can help you with:\n" +
    "- **Testing data queries** - Ask about your sessions, test cases, defects, and faults\n" +
    "- **QA best practices** - Testing methodologies and workflows\n" +
    "- **Defect management** - Severity, priority, and reporting\n" +
    "- **Protocol expertise** - SAS, QCOM, ASP protocol knowledge\n\n" +
    "Try asking specific questions like:\n" +
    "- \"Give me a summary of all my testing data\"\n" +
    "- \"Show me all critical defects\"\n" +
    "- \"What is the overall pass rate?\"";
}
