import { Sidebar } from "./Sidebar";
import { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

interface ShellProps {
  children: ReactNode;
  title?: string;
  description?: string;
}

export function Shell({ children, title, description }: ShellProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Auth hook handles redirect
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 overflow-y-auto animate-in fade-in duration-500 slide-in-from-bottom-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {(title || description) && (
            <div className="flex flex-col gap-1">
              {title && <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">{title}</h1>}
              {description && (
                <p className="text-muted-foreground text-lg">{description}</p>
              )}
            </div>
          )}
          <div className="min-h-[calc(100vh-12rem)]">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
