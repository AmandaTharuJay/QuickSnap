import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription as DialogDesc } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Search, Plus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const PROTOCOLS = ["SAS", "QCOM", "ASP", "G2S"];

const severityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

export default function FaultRepository() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedFault, setSelectedFault] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [protocol, setProtocol] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [gameName, setGameName] = useState("");
  const [gameId, setGameId] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");

  const utils = trpc.useUtils();
  const faultsQuery = trpc.faultRepo.listFaults.useQuery();
  const statsQuery = trpc.faultRepo.getSearchStats.useQuery();
  const createMutation = trpc.faultRepo.createFault.useMutation({
    onSuccess: () => {
      toast.success("Fault record created successfully!");
      utils.faultRepo.listFaults.invalidate();
      utils.faultRepo.getSearchStats.invalidate();
      setShowCreate(false);
      resetForm();
    },
    onError: () => toast.error("Failed to create fault record"),
  });

  const resetForm = () => {
    setTitle(""); setDescription(""); setProtocol(""); setSeverity("medium");
    setGameName(""); setGameId(""); setRootCause(""); setResolution("");
  };

  const faults = faultsQuery.data ?? [];
  const filtered = search.trim()
    ? faults.filter(f =>
        f.title.toLowerCase().includes(search.toLowerCase()) ||
        f.description.toLowerCase().includes(search.toLowerCase()) ||
        f.faultId.toLowerCase().includes(search.toLowerCase()) ||
        (f.gameName?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : faults;

  if (faultsQuery.isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Fault Repository</h1>
            <p className="text-muted-foreground">Add a new fault to the repository for future reference</p>
          </div>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />Add New Fault
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{statsQuery.data?.total ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Faults</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold">{Object.keys(statsQuery.data?.byProtocol ?? {}).length}</div>
            <p className="text-sm text-muted-foreground">All Protocols</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-3xl font-bold text-red-600">
              {(statsQuery.data?.bySeverity?.["critical"] ?? 0) + (statsQuery.data?.bySeverity?.["high"] ?? 0)}
            </div>
            <p className="text-sm text-muted-foreground">Critical/High</p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search faults by keyword, ID, or game name..."
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(fault => (
          <Card key={fault.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedFault(fault)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <Badge variant="outline" className="text-xs mb-1">{fault.faultId}</Badge>
                  <h3 className="font-semibold text-sm">{fault.title}</h3>
                </div>
                <Badge className={severityColor[fault.severity]}>{fault.severity}</Badge>
              </div>
              <p className="text-sm text-gray-700 line-clamp-2">{fault.description}</p>
              {fault.rootCause && (
                <div className="mt-2 text-sm">
                  <span className="font-semibold text-gray-700">Root Cause: </span>
                  <span className="text-gray-600 line-clamp-1">{fault.rootCause}</span>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                <span>Found {fault.searchCount} times</span>
                <span>{new Date(fault.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && !faultsQuery.isLoading && (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <p className="text-gray-600">No faults found matching your search. Try different keywords or create a new fault record.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {selectedFault && (
        <Dialog open={!!selectedFault} onOpenChange={() => setSelectedFault(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedFault.title}</DialogTitle>
              <DialogDesc>{selectedFault.faultId}</DialogDesc>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-gray-600">Protocol</Label><p className="font-semibold">{selectedFault.protocol}</p></div>
                <div><Label className="text-gray-600">Severity</Label><Badge className={severityColor[selectedFault.severity]}>{selectedFault.severity}</Badge></div>
                <div><Label className="text-gray-600">Game Name</Label><p className="font-semibold">{selectedFault.gameName}</p></div>
                <div><Label className="text-gray-600">Game ID</Label><p className="font-semibold">{selectedFault.gameId}</p></div>
              </div>
              <div><Label className="text-gray-600">Description</Label><p className="text-sm text-gray-700 mt-1">{selectedFault.description}</p></div>
              {selectedFault.rootCause && <div><Label className="text-gray-600">Root Cause</Label><p className="text-sm text-gray-700 mt-1">{selectedFault.rootCause}</p></div>}
              {selectedFault.resolution && <div><Label className="text-gray-600">Resolution</Label><p className="text-sm text-gray-700 mt-1">{selectedFault.resolution}</p></div>}
              <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
                <span>Found {selectedFault.searchCount} times</span>
                <span>{new Date(selectedFault.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log New Fault</DialogTitle>
            <DialogDesc>Add a new fault to the repository for future reference</DialogDesc>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief fault title" /></div>
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{PROTOCOLS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["critical", "high", "medium", "low"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Game Name</Label><Input value={gameName} onChange={e => setGameName(e.target.value)} placeholder="Game Name" /></div>
            <div className="col-span-2 space-y-2"><Label>Description</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Detailed fault description" /></div>
            <div className="space-y-2"><Label>Game ID</Label><Input value={gameId} onChange={e => setGameId(e.target.value)} placeholder="Game ID" /></div>
            <div className="space-y-2"><Label>Root Cause</Label><Input value={rootCause} onChange={e => setRootCause(e.target.value)} placeholder="Root cause (optional)" /></div>
            <div className="col-span-2 space-y-2"><Label>Resolution</Label><Input value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Resolution (optional)" /></div>
            <div className="col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createMutation.mutate({ title, description, protocol, severity: severity as any, gameName: gameName || undefined, gameId: gameId || undefined, rootCause: rootCause || undefined, resolution: resolution || undefined })} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create Fault
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
