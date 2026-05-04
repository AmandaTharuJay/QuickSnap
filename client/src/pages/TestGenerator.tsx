import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Copy, Loader2, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

const PROTOCOLS = ["SAS", "QCOM", "ASP", "G2S"];

interface GeneratedTestCase {
  id: string;
  title: string;
  description: string;
  steps: string;
  expectedResult: string;
  priority: string;
  status: string;
}

export default function TestGenerator() {
  const [protocol, setProtocol] = useState("");
  const [requirement, setRequirement] = useState("");
  const [priority, setPriority] = useState("medium");
  const [generated, setGenerated] = useState<GeneratedTestCase[]>([]);

  const generateMutation = trpc.testGenerator.generate.useMutation({
    onSuccess: (data) => {
      setGenerated(data.testCases);
      toast.success(`Generated ${data.testCases.length} test cases!`);
    },
    onError: () => toast.error("Failed to generate test cases"),
  });

  const handleGenerate = () => {
    if (!protocol || !requirement.trim()) {
      toast.error("Please select a protocol and enter a requirement");
      return;
    }
    generateMutation.mutate({ protocol, requirement, priority: priority as any });
  };

  const copyTestCase = (tc: GeneratedTestCase) => {
    const text = `Title: ${tc.title}\nDescription: ${tc.description}\nSteps:\n${tc.steps}\nExpected Result: ${tc.expectedResult}\nPriority: ${tc.priority}`;
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Test case copied to clipboard!");
    }).catch(() => {
      toast.error("Clipboard API not available");
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Test Case Generator</h1>
            <p className="text-muted-foreground">AI creates structured test cases from your requirements</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Generate Test Cases</CardTitle>
            <CardDescription>Create test cases from requirements</CardDescription>
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
              <Label>Requirement</Label>
              <Textarea
                value={requirement}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="Describe the requirement to generate test cases for..."
                className="min-h-[120px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["critical", "high", "medium", "low"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="w-full">
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              Generate Test Cases
            </Button>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          {generated.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Generated Test Cases</h3>
                <p className="text-muted-foreground text-sm text-center">
                  Enter a requirement and click Generate to create test cases.<br />
                  Copy or download for your test sessions.
                </p>
              </CardContent>
            </Card>
          ) : (
            generated.map((tc) => (
              <Card key={tc.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{tc.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{tc.priority}</Badge>
                      <Button variant="ghost" size="icon" onClick={() => copyTestCase(tc)} title="Copy test case">
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="text-sm">{tc.description}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Steps</Label>
                    <pre className="text-sm bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{tc.steps}</pre>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Expected Result</Label>
                    <p className="text-sm">{tc.expectedResult}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
