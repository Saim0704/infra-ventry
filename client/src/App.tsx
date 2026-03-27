import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import ServersPage from "@/pages/Servers";
import DatabasesPage from "@/pages/Databases";
import ClustersPage from "@/pages/Clusters";
import SettingsPage from "@/pages/Settings";
import ProjectsPage from "@/pages/Projects";
import ProjectDetailPage from "@/pages/ProjectDetail";
import WebMonitoringPage from "@/pages/WebMonitoring";
import DomainMonitoringPage from "@/pages/DomainMonitoring";
import StatusPage from "@/pages/StatusPage";
import LoginPage from "@/pages/Login";
import ServiceAuditPage from "@/pages/ServiceAudit";
import EmailDesignPage from "@/pages/EmailDesign";

function Router() {
  useRealtime();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/status/:slug" component={StatusPage} />
      {user ? (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/projects" component={ProjectsPage} />
          <Route path="/projects/:id" component={ProjectDetailPage} />
          <Route path="/servers" component={ServersPage} />
          <Route path="/databases" component={DatabasesPage} />
          <Route path="/clusters" component={ClustersPage} />
          <Route path="/service-audit" component={ServiceAuditPage} />
          <Route path="/web-monitoring" component={WebMonitoringPage} />
          <Route path="/domain-monitoring" component={DomainMonitoringPage} />
          <Route path="/email-design" component={EmailDesignPage} />
          <Route path="/settings" component={SettingsPage} />
        </>
      ) : (
        <Route component={LoginPage} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

import { ThemeProvider } from "./hooks/use-theme";
import { useRealtime } from "./hooks/use-realtime";
import { Loader2 } from "lucide-react";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="infra-watch-theme">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
