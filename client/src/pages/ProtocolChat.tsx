import React, { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Loader2, Plus, BookOpen, Sparkles } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "Check timeout configuration against protocol specifications",
  "Check event timestamp accuracy",
  "Review event handling logic for state transitions",
  "Play a game session",
];

const PROTOCOLS: Record<string, { label: string; description: string }> = {
  SAS: { label: "SAS Protocol", description: "Slot Accounting System protocol" },
  QCOM: { label: "Quantum Communication Protocol", description: "QCOM communication protocol" },
  ASP: { label: "Advanced System Protocol", description: "Advanced System Protocol" },
};

export default function ProtocolChat() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [selectedProtocol, setSelectedProtocol] = useState("SAS");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string; timestamp: Date }>>([]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const queryMutation = trpc.aiData.query.useMutation();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || !user) return;
    const userMsg = { id: `msg-${Date.now()}`, role: "user" as const, content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setMessage("");
    setLoading(true);

    try {
      const response = await queryMutation.mutateAsync({
        question: text,
        context: "protocol",
        protocol: selectedProtocol,
      });
      const assistantMsg = {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as const,
        content: response.answer,
        timestamp: new Date(response.timestamp),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        id: `msg-${Date.now() + 1}`,
        role: "assistant" as const,
        content: "Sorry, I encountered an error processing your question. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Protocol Chat</h1>
          <p className="text-muted-foreground">Chat with Protocol Expert - Ask protocol questions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <Card className="flex flex-col h-[600px]">
            <CardHeader className="border-b pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">Chat</CardTitle>
                  <Badge variant="secondary">{selectedProtocol}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
                  <Plus className="w-4 h-4 mr-1" />New Chat
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Protocol Documentation Assistant</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-md">
                    Ask about your real system data or get expert answers on protocol topics.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        className="text-left p-3 rounded-lg border text-sm hover:bg-gray-50 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
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
                  <div className="bg-muted rounded-lg p-3">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </CardContent>
            <div className="border-t p-4">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(message); }} className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask about protocols..."
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !message.trim()}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Protocol</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(PROTOCOLS).map(([key, val]) => (
                <button
                  key={key}
                  onClick={() => setSelectedProtocol(key)}
                  className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${selectedProtocol === key ? "bg-blue-50 border-blue-200" : "hover:bg-gray-50"}`}
                >
                  <p className="font-medium">{val.label}</p>
                  <p className="text-xs text-muted-foreground">{val.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
