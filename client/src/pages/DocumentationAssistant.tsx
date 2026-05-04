import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Send, Loader2, Database as DbIcon, Sparkles } from "lucide-react";

const CATEGORIES: Record<string, { label: string; description: string }> = {
  general: { label: "General QA", description: "Best practices, methodologies, and workflows" },
  testing: { label: "Testing", description: "Test planning, execution, and strategies" },
  defects: { label: "Defects", description: "Defect management, triage, and reporting" },
  automation: { label: "Automation", description: "Test automation frameworks and tools" },
};

const SUGGESTIONS: Record<string, string[]> = {
  general: [
    "Give me a summary of all my testing data",
    "What is the overall pass rate across all sessions?",
    "How many test sessions, test cases, and defects do I have?",
    "Show me recent activity across all features",
  ],
  testing: [
    "Show me all active test sessions",
    "What is the test case pass/fail ratio?",
    "List all test cases by priority",
    "How should I approach regression testing?",
  ],
  defects: [
    "Show me all critical and high severity defects",
    "How many open defects are there right now?",
    "What's the difference between severity and priority?",
    "List all defects grouped by status",
  ],
  automation: [
    "What faults have been found across all protocols?",
    "Show me faults for QCOM protocol with game names",
    "What are the most common fault patterns?",
    "List all faults by severity",
  ],
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  dataIncluded?: boolean;
}

export default function DocumentationAssistant() {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState("general");
  const endRef = useRef<HTMLDivElement>(null);
  const queryMutation = trpc.aiData.query.useMutation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (authLoading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;
    const userMsg: Message = { id: `msg-${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await queryMutation.mutateAsync({ question: text, context: "documentation" });
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: response.answer,
        timestamp: new Date(response.timestamp),
        dataIncluded: response.dataIncluded,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: "assistant",
        content: "Failed to get response. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Documentation Assistant</h1>
            <p className="text-muted-foreground">Get answers about QA practices, methodologies, and query your real system data</p>
          </div>
          <Badge variant="secondary" className="gap-1 text-xs ml-auto">
            <DbIcon size={12} />Data-Aware
          </Badge>
        </div>
        <div className="flex gap-2 mt-4">
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <Button key={key} variant={category === key ? "default" : "outline"} size="sm" onClick={() => setCategory(key)}>
              {val.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="border-b pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Ask about your real system data
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Documentation Assistant</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-md">
                    Ask about QA best practices or query your real system data including sessions, test cases, defects, and faults.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {(SUGGESTIONS[category] ?? []).map((q, i) => (
                      <button key={i} onClick={() => sendMessage(q)} className="text-left p-3 rounded-lg border text-sm hover:bg-gray-50 transition-colors">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.dataIncluded && msg.role === "assistant" && (
                        <Badge variant="secondary" className="text-xs mb-2 gap-1"><DbIcon size={10} />Data included</Badge>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {msg.content.split("\n").map((line, i) => {
                          if (line.startsWith("## ")) return <h2 key={i} className="text-base font-bold mt-2 mb-1">{line.replace("## ", "")}</h2>;
                          if (line.startsWith("### ")) return <h3 key={i} className="text-sm font-semibold mt-2 mb-1">{line.replace("### ", "")}</h3>;
                          if (line.startsWith("- **")) return <li key={i} className="ml-4 list-disc">{line.replace("- ", "").replace(/\*\*/g, "")}</li>;
                          if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc">{line.replace("- ", "")}</li>;
                          if (line.trim()) return <p key={i}>{line}</p>;
                          return <br key={i} />;
                        })}
                      </div>
                      <p className="text-xs opacity-70 mt-1">{msg.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3"><Loader2 className="w-4 h-4 animate-spin" /></div>
                </div>
              )}
              <div ref={endRef} />
            </CardContent>
            <div className="border-t p-4">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your data or QA practices..." disabled={loading} />
                <Button type="submit" disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
              </form>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{CATEGORIES[category]?.label}</CardTitle>
              <CardDescription className="text-xs">{CATEGORIES[category]?.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(SUGGESTIONS[category] ?? []).map((q, i) => (
                  <button key={i} onClick={() => sendMessage(q)} className="w-full text-left p-2 rounded text-xs hover:bg-gray-50 transition-colors border">
                    {q}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
