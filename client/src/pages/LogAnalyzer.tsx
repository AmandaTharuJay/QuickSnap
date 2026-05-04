import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSearch, AlertTriangle, CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

const PROTOCOLS = ["SAS", "QCOM", "ASP", "G2S"];

export default function LogAnalyzer() {
  const [protocol, setProtocol] = useState("");
  const [logContent, setLogContent] = useState("");
  const [analysis, setAnalysis] = useState<{ analysis: string; severity: string } | null>(null);

  const logsQuery = trpc.protocolLogs.list.useQuery();
  const analyzeMutation = trpc.protocolLogs.analyze.useMutation({
    onSuccess: (data) => {
      setAnalysis({ analysis: data.analysis ?? "", severity: data.severity ?? "info" });
      toast.success("Analysis complete!");
      logsQuery.refetch();
    },
    onError: () => toast.error("Analysis failed"),
  });

  const handleAnalyze = () => {
    if (!protocol || !logContent.trim()) {
      toast.error("Please select a protocol and paste log content");
      return;
    }
    analyzeMutation.mutate({ protocol, logContent });
  };

  const severityIcon = {
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
    info: <CheckCircle className="w-5 h-5 text-green-500" />,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Log Analyzer</h1>
        <p className="text-muted-foreground mt-1">Analyze protocol logs for anomalies and violations</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Analyze Protocol Log</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Protocol</Label>
              <Select value={protocol} onValueChange={setProtocol}>
                <SelectTrigger><SelectValue placeholder="Select protocol" /></SelectTrigger>
                <SelectContent>
                  {PROTOCOLS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Log Content</Label>
              <Textarea
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
                placeholder="Paste log content here..."
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
            <Button onClick={handleAnalyze} disabled={analyzeMutation.isPending} className="w-full">
              {analyzeMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileSearch className="w-4 h-4 mr-2" />}
              Analyze Log
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {analysis && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Analysis Results</CardTitle>
                  <Badge variant={analysis.severity === "error" ? "destructive" : analysis.severity === "warning" ? "secondary" : "default"}>
                    {analysis.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {analysis.analysis.split("\n").map((line, i) => {
                    if (line.startsWith("## ")) return <h2 key={i} className="text-lg font-bold mt-4 mb-2">{line.replace("## ", "")}</h2>;
                    if (line.startsWith("### ")) return <h3 key={i} className="text-base font-semibold mt-3 mb-1">{line.replace("### ", "")}</h3>;
                    if (line.startsWith("**")) return <p key={i} className="font-semibold text-sm">{line.replace(/\*\*/g, "")}</p>;
                    if (line.startsWith("- ")) return <li key={i} className="text-sm ml-4 list-disc">{line.replace("- ", "")}</li>;
                    if (line.trim()) return <p key={i} className="text-sm text-muted-foreground">{line}</p>;
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logsQuery.isLoading ? (
                <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : (logsQuery.data?.length ?? 0) === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">No logs yet</p>
              ) : (
                <div className="space-y-2">
                  {logsQuery.data?.map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      {severityIcon[log.severity as keyof typeof severityIcon] ?? <Clock className="w-5 h-5 text-gray-400" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{log.protocol}</Badge>
                          <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{log.logContent.split("\n")[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
