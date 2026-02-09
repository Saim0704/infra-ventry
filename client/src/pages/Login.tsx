import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Terminal } from "lucide-react";

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background z-0" />
      
      <Card className="w-full max-w-md z-10 border-border/50 shadow-2xl backdrop-blur-sm bg-card/80">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25 mb-4">
            <Terminal className="text-white h-6 w-6" />
          </div>
          <CardTitle className="text-3xl font-display font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your infrastructure dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            className="w-full py-6 text-lg font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all" 
            onClick={handleLogin}
          >
            Sign In with Replit
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Secure authentication provided by Replit Auth
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
