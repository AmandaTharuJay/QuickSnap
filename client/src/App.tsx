import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch, Redirect } from "wouter";
import { trpc, getTRPCClient } from "@/lib/trpc";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";

import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import TestSessions from "@/pages/TestSessions";
import SessionDetails from "@/pages/SessionDetails";
import DefectReports from "@/pages/DefectReports";
import LogAnalyzer from "@/pages/LogAnalyzer";
import TestGenerator from "@/pages/TestGenerator";
import ProtocolChat from "@/pages/ProtocolChat";
import FaultRepository from "@/pages/FaultRepository";
import DocumentationAssistant from "@/pages/DocumentationAssistant";
import NotFound from "@/pages/NotFound";

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <DashboardLayout>
      <Switch>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/sessions/:id" component={SessionDetails} />
        <Route path="/sessions" component={TestSessions} />
        <Route path="/defects" component={DefectReports} />
        <Route path="/logs" component={LogAnalyzer} />
        <Route path="/generator" component={TestGenerator} />
        <Route path="/chat" component={ProtocolChat} />
        <Route path="/faults" component={FaultRepository} />
        <Route path="/docs" component={DocumentationAssistant} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  }));
  const [trpcClient] = useState(() => getTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthenticatedApp />
          <Toaster position="top-right" richColors />
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
