import { router, protectedProcedure } from "../trpc.js";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

export const chatConversationsRouter = router({
  list: protectedProcedure.query(({ ctx }) => {
    return db.select().from(schema.chatConversations)
      .where(eq(schema.chatConversations.userId, ctx.user.id))
      .orderBy(desc(schema.chatConversations.updatedAt))
      .all();
  }),

  create: protectedProcedure
    .input(z.object({
      title: z.string().min(1),
      protocol: z.string().optional(),
    }))
    .mutation(({ ctx, input }) => {
      return db.insert(schema.chatConversations).values({
        ...input,
        userId: ctx.user.id,
        messages: "[]",
      }).returning().get();
    }),

  addMessage: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      role: z.enum(["user", "assistant"]),
      content: z.string().min(1),
    }))
    .mutation(({ ctx, input }) => {
      const conv = db.select().from(schema.chatConversations)
        .where(eq(schema.chatConversations.id, input.conversationId))
        .get();

      if (!conv) throw new Error("Conversation not found");

      const messages = JSON.parse(conv.messages);
      messages.push({
        id: `msg-${Date.now()}`,
        role: input.role,
        content: input.content,
        timestamp: new Date().toISOString(),
      });

      db.update(schema.chatConversations)
        .set({ messages: JSON.stringify(messages), updatedAt: new Date().toISOString() })
        .where(eq(schema.chatConversations.id, input.conversationId))
        .run();

      return { success: true };
    }),
});
