import React from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  Bug,
  FileCheck,
  Database,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();
  const sessionsQuery = trpc.testSessions.list.useQuery();
  const faultStatsQuery = trpc.faultRepo.getSearchStats.useQuery();

  if (sessionsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const sessions = sessionsQuery.data ?? [];
  const totalTestCases = sessions.reduce((sum, s) => sum + (s.testCaseCount ?? 0), 0);
  const totalPassed = sessions.reduce((sum, s) => sum + (s.passedCount ?? 0), 0);
  const totalFailed = sessions.reduce((sum, s) => sum + (s.failedCount ?? 0), 0);
  const totalDefects = sessions.reduce((sum, s) => sum + (s.defectCount ?? 0), 0);
  const activeSessions = sessions.filter((s) => s.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user?.displayName}. Here's an overview of your testing activity.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Sessions
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sessions.length} total sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Test Cases
            </CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTestCases}</div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center text-xs text-green-600">
                <CheckCircle className="h-3 w-3 mr-1" />
                {totalPassed} passed
              </span>
              <span className="flex items-center text-xs text-red-600">
                <XCircle className="h-3 w-3 mr-1" />
                {totalFailed} failed
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Open Defects
            </CardTitle>
            <Bug className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDefects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Known Faults
            </CardTitle>
            <Database className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{faultStatsQuery.data?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              In fault repository
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Test Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">No test sessions yet.</p>
            ) : (
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => (
                  <Link key={session.id} href={`/sessions/${session.id}`}>
                    <a className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-medium text-sm">{session.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {session.protocol} · {session.gameName ?? "No game"}
                        </p>
                      </div>
                      <Badge
                        variant={session.status === "active" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {session.status}
                      </Badge>
                    </a>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/sessions">
                <a className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-blue-50 hover:border-blue-200 transition-colors">
                  <ClipboardList className="h-6 w-6 text-blue-500" />
                  <span className="text-sm font-medium">New Session</span>
                </a>
              </Link>
              <Link href="/generator">
                <a className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-green-50 hover:border-green-200 transition-colors">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                  <span className="text-sm font-medium">Generate Tests</span>
                </a>
              </Link>
              <Link href="/logs">
                <a className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-orange-50 hover:border-orange-200 transition-colors">
                  <AlertTriangle className="h-6 w-6 text-orange-500" />
                  <span className="text-sm font-medium">Analyze Logs</span>
                </a>
              </Link>
              <Link href="/docs">
                <a className="flex flex-col items-center gap-2 p-4 rounded-lg border hover:bg-purple-50 hover:border-purple-200 transition-colors">
                  <Database className="h-6 w-6 text-purple-500" />
                  <span className="text-sm font-medium">Ask Assistant</span>
                </a>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
