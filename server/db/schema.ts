import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const testSessions = sqliteTable("test_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  protocol: text("protocol").notNull(),
  status: text("status").notNull().default("active"),
  gameName: text("game_name"),
  description: text("description"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const testCases = sqliteTable("test_cases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => testSessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  steps: text("steps").notNull(),
  expectedResult: text("expected_result").notNull(),
  actualResult: text("actual_result"),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const defectReports = sqliteTable("defect_reports", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionId: integer("session_id").notNull().references(() => testSessions.id),
  userId: integer("user_id").notNull().references(() => users.id),
  defectId: text("defect_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  severity: text("severity").notNull().default("medium"),
  status: text("status").notNull().default("open"),
  stepsToReproduce: text("steps_to_reproduce"),
  expectedResult: text("expected_result"),
  actualResult: text("actual_result"),
  protocol: text("protocol"),
  gameName: text("game_name"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const protocolLogs = sqliteTable("protocol_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  protocol: text("protocol").notNull(),
  logContent: text("log_content").notNull(),
  analysis: text("analysis"),
  severity: text("severity"),
  timestamp: text("timestamp").default(sql`(datetime('now'))`).notNull(),
});

export const faultRepository = sqliteTable("fault_repository", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  faultId: text("fault_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  protocol: text("protocol").notNull(),
  severity: text("severity").notNull().default("medium"),
  gameName: text("game_name"),
  gameId: text("game_id"),
  rootCause: text("root_cause"),
  resolution: text("resolution"),
  searchCount: integer("search_count").notNull().default(0),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const chatConversations = sqliteTable("chat_conversations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  protocol: text("protocol"),
  messages: text("messages").notNull().default("[]"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export type User = typeof users.$inferSelect;
export type TestSession = typeof testSessions.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
export type DefectReport = typeof defectReports.$inferSelect;
export type ProtocolLog = typeof protocolLogs.$inferSelect;
export type FaultRecord = typeof faultRepository.$inferSelect;
export type ChatConversation = typeof chatConversations.$inferSelect;
