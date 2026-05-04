import React, { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ClipboardList, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PROTOCOLS = ["SAS", "QCOM", "ASP", "G2S", "Other"];

export default function TestSessions() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [protocol, setProtocol] = useState("");
  const [gameName, setGameName] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();
  const sessionsQuery = trpc.testSessions.list.useQuery();
  const createMutation = trpc.testSessions.create.useMutation({
    onSuccess: () => {
      toast.success("Test session created successfully!");
      utils.testSessions.list.invalidate();
      setShowCreate(false);
      setName("");
      setProtocol("");
      setGameName("");
      setDescription("");
    },
    onError: () => toast.error("Failed to create test session"),
  });

  const handleCreate = () => {
    if (!name.trim() || !protocol) {
      toast.error("Session name is required");
      return;
    }
    createMutation.mutate({ name, protocol, gameName: gameName || undefined, description: description || undefined });
  };

  if (sessionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  const sessions = sessionsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Test Sessions</h1>
          <p className="text-muted-foreground mt-1">Create and manage your testing sessions</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardList className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No test sessions yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first testing session to get started
            </p>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Link key={session.id} href={`/sessions/${session.id}`}>
              <a className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{session.name}</h3>
                        <Badge variant={session.status === "active" ? "default" : "secondary"}>
                          {session.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {session.protocol} · {session.gameName ?? "No game specified"}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{session.testCaseCount} test cases</span>
                        <span className="text-green-600">{session.passedCount} passed</span>
                        <span className="text-red-600">{session.failedCount} failed</span>
                        <span className="text-orange-600">{session.defectCount} defects</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </CardContent>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Test Session</DialogTitle>
            <DialogDescription>
              Start a new testing session for protocol compliance testing
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="session-name">Session Name</Label>
              <Input id="session-name" placeholder="e.g., SAS Protocol Compliance Test" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Protocol Type</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="game-name">Game Name</Label>
              <Input id="game-name" placeholder="e.g., Lucky Dragon Slots" value={gameName} onChange={(e) => setGameName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" placeholder="Brief description of the session" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Create Session
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
