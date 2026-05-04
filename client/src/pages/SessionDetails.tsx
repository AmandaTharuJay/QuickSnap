import React, { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const statusIcon = {
  passed: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-red-500" />,
  pending: <Clock className="w-4 h-4 text-yellow-500" />,
};

const severityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

export default function SessionDetails() {
  const params = useParams<{ id: string }>();
  const sessionId = parseInt(params.id ?? "0");
  const [showCreateTC, setShowCreateTC] = useState(false);
  const [showCreateDefect, setShowCreateDefect] = useState(false);

  const [tcTitle, setTcTitle] = useState("");
  const [tcDesc, setTcDesc] = useState("");
  const [tcSteps, setTcSteps] = useState("");
  const [tcExpected, setTcExpected] = useState("");
  const [tcPriority, setTcPriority] = useState("medium");

  const [defectId, setDefectId] = useState("");
  const [defectTitle, setDefectTitle] = useState("");
  const [defectDesc, setDefectDesc] = useState("");
  const [defectSeverity, setDefectSeverity] = useState("medium");

  const utils = trpc.useUtils();
  const sessionQuery = trpc.testSessions.getById.useQuery({ id: sessionId });
  const createTCMutation = trpc.testCases.create.useMutation({
    onSuccess: () => {
      toast.success("Test case created successfully!");
      utils.testSessions.getById.invalidate({ id: sessionId });
      setShowCreateTC(false);
      setTcTitle(""); setTcDesc(""); setTcSteps(""); setTcExpected(""); setTcPriority("medium");
    },
    onError: () => toast.error("Failed to create test case"),
  });
  const createDefectMutation = trpc.defectReports.create.useMutation({
    onSuccess: () => {
      toast.success("Defect report created successfully!");
      utils.testSessions.getById.invalidate({ id: sessionId });
      setShowCreateDefect(false);
      setDefectId(""); setDefectTitle(""); setDefectDesc(""); setDefectSeverity("medium");
    },
    onError: () => toast.error("Failed to create defect report"),
  });

  if (sessionQuery.isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const session = sessionQuery.data;
  if (!session) return <div className="text-center py-12"><p className="text-lg text-muted-foreground">Session not found</p></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sessions">
          <a className="p-2 rounded-md hover:bg-gray-100"><ArrowLeft className="w-5 h-5" /></a>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{session.name}</h1>
          <p className="text-muted-foreground text-sm">{session.protocol} · {session.gameName ?? "No game"} · {session.description}</p>
        </div>
        <Badge variant={session.status === "active" ? "default" : "secondary"} className="ml-auto">
          {session.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{session.testCases?.length ?? 0}</div>
            <p className="text-sm text-muted-foreground">Test Cases</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-green-600">{session.testCases?.filter(tc => tc.status === "passed").length ?? 0}</div>
            <p className="text-sm text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">{session.defects?.length ?? 0}</div>
            <p className="text-sm text-muted-foreground">Defects</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Test Cases</CardTitle>
          <Button size="sm" onClick={() => setShowCreateTC(true)}><Plus className="w-4 h-4 mr-1" />Add Test Case</Button>
        </CardHeader>
        <CardContent>
          {(session.testCases?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No test cases yet</p>
          ) : (
            <div className="space-y-2">
              {session.testCases?.map(tc => (
                <div key={tc.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  {statusIcon[tc.status as keyof typeof statusIcon] ?? <Clock className="w-4 h-4 text-gray-400" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{tc.title}</span>
                      <Badge variant="outline" className="text-xs">{tc.priority}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{tc.description}</p>
                  </div>
                  <Badge variant={tc.status === "passed" ? "default" : tc.status === "failed" ? "destructive" : "secondary"}>
                    {tc.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Defect Reports</CardTitle>
          <Button size="sm" variant="destructive" onClick={() => setShowCreateDefect(true)}>
            <Plus className="w-4 h-4 mr-1" />Report Defect
          </Button>
        </CardHeader>
        <CardContent>
          {(session.defects?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">No defects reported</p>
          ) : (
            <div className="space-y-2">
              {session.defects?.map(d => (
                <div key={d.id} className="flex items-start gap-3 p-3 rounded-lg border">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{d.defectId}: {d.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${severityColor[d.severity] ?? ""}`}>
                        {d.severity}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{d.description}</p>
                  </div>
                  <Badge variant={d.status === "open" ? "destructive" : "secondary"}>{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateTC} onOpenChange={setShowCreateTC}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Test Case</DialogTitle>
            <DialogDescription>Create a new test case for this session</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Title</Label><Input value={tcTitle} onChange={e => setTcTitle(e.target.value)} placeholder="Test case title" /></div>
            <div className="space-y-2"><Label>Description</Label><Input value={tcDesc} onChange={e => setTcDesc(e.target.value)} placeholder="Brief description" /></div>
            <div className="space-y-2"><Label>Steps</Label><Textarea value={tcSteps} onChange={e => setTcSteps(e.target.value)} placeholder="1. Step one&#10;2. Step two" /></div>
            <div className="space-y-2"><Label>Expected Result</Label><Input value={tcExpected} onChange={e => setTcExpected(e.target.value)} placeholder="Expected outcome" /></div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={tcPriority} onValueChange={setTcPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateTC(false)}>Cancel</Button>
              <Button onClick={() => createTCMutation.mutate({ sessionId, title: tcTitle, description: tcDesc, steps: tcSteps, expectedResult: tcExpected, priority: tcPriority as any })} disabled={createTCMutation.isPending}>
                {createTCMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDefect} onOpenChange={setShowCreateDefect}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Defect Report</DialogTitle>
            <DialogDescription>Document a defect found during testing</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Defect ID</Label><Input value={defectId} onChange={e => setDefectId(e.target.value)} placeholder="e.g., DEF-004" /></div>
            <div className="space-y-2"><Label>Title</Label><Input value={defectTitle} onChange={e => setDefectTitle(e.target.value)} placeholder="Brief description of the defect" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={defectDesc} onChange={e => setDefectDesc(e.target.value)} placeholder="Detailed description" /></div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={defectSeverity} onValueChange={setDefectSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDefect(false)}>Cancel</Button>
              <Button variant="destructive" onClick={() => {
                if (!defectId || !defectTitle) { toast.error("Defect ID and title are required"); return; }
                createDefectMutation.mutate({ sessionId, defectId, title: defectTitle, description: defectDesc, severity: defectSeverity as any });
              }} disabled={createDefectMutation.isPending}>
                {createDefectMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Defect
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
