import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { router } from "./trpc.js";
import { createContext } from "./trpc.js";
import { initializeDatabase } from "./db/index.js";
import { authRouter } from "./routes/auth.js";
import { testSessionsRouter } from "./routes/testSessions.js";
import { testCasesRouter } from "./routes/testCases.js";
import { defectReportsRouter } from "./routes/defectReports.js";
import { protocolLogsRouter } from "./routes/protocolLogs.js";
import { faultRepoRouter } from "./routes/faultRepo.js";
import { chatConversationsRouter } from "./routes/chatConversations.js";
import { aiDataRouter } from "./routes/aiData.js";
import { exportRouter } from "./routes/exportRoutes.js";
import { testGeneratorRouter } from "./routes/testGenerator.js";
import path from "path";
import fs from "fs";
import cookieParser from "cookie-parser";

const appRouter = router({
  auth: authRouter,
  testSessions: testSessionsRouter,
  testCases: testCasesRouter,
  defectReports: defectReportsRouter,
  protocolLogs: protocolLogsRouter,
  faultRepo: faultRepoRouter,
  chatConversations: chatConversationsRouter,
  aiData: aiDataRouter,
  export: exportRouter,
  testGenerator: testGeneratorRouter,
});

export type AppRouter = typeof appRouter;

const app = express();

app.use(express.json());
app.use(cookieParser());

declare module "express-serve-static-core" {
  interface Request {
    sessionData?: Record<string, unknown>;
  }
}

const sessions = new Map<string, Record<string, unknown>>();

app.use((req, res, next) => {
  let sessionId = req.cookies?.sid;

  if (!sessionId || !sessions.has(sessionId)) {
    sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessions.set(sessionId, {});
    res.cookie("sid", sessionId, { path: "/", httpOnly: true, sameSite: "lax" });
  }

  req.session = sessions.get(sessionId)!;
  next();
});

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

initializeDatabase();

const PORT = parseInt(process.env.PORT ?? "3000", 10);

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "dist/public");
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
