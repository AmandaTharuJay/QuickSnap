import React from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bug, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";

const severityColor: Record<string, string> = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-green-100 text-green-800",
};

export default function DefectReports() {
  const sessionsQuery = trpc.testSessions.list.useQuery();
  const exportMutation = trpc.export.allDefectReportsCSV.useMutation({
    onSuccess: (data) => {
      const blob = new Blob([data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported successfully!");
    },
  });

  if (sessionsQuery.isLoading) {
    return <div className="space-y-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-32" />)}</div>;
  }

  const sessions = sessionsQuery.data ?? [];
  const allDefects = sessions.flatMap(s =>
    Array.from({ length: s.defectCount }, (_, i) => ({
      sessionId: s.id,
      sessionName: s.name,
      protocol: s.protocol,
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Defect Reports</h1>
          <p className="text-muted-foreground mt-1">View and manage defects across all sessions</p>
        </div>
        <Button variant="outline" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bug className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No defect reports found</h3>
            <p className="text-muted-foreground text-sm mb-4">Create a test session and report defects to see them here</p>
            <Link href="/sessions"><a><Button>Go to Sessions</Button></a></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sessions.filter(s => s.defectCount > 0).map(session => (
            <Card key={session.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Link href={`/sessions/${session.id}`}>
                      <a className="hover:text-blue-600">{session.name}</a>
                    </Link>
                  </CardTitle>
                  <Badge variant="outline">{session.protocol}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    {session.defectCount} defects
                  </span>
                  <span>{session.gameName ?? "No game"}</span>
                </div>
              </CardContent>
            </Card>
          ))}
          {sessions.every(s => s.defectCount === 0) && (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No defects have been reported yet.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
