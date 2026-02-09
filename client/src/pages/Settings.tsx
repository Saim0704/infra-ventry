import { Shell } from "@/components/layout/Shell";
import { useTokens, useCreateToken, useRevokeToken } from "@/hooks/use-tokens";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Copy, Check, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTokenSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export default function SettingsPage() {
  const { data: tokens, isLoading } = useTokens();
  const revokeMutation = useRevokeToken();
  const { toast } = useToast();

  const handleRevoke = (id: number) => {
    if (confirm("Are you sure you want to revoke this token? The agent using it will disconnect.")) {
      revokeMutation.mutate(id, {
        onSuccess: () => {
          toast({ title: "Token revoked", description: "The token has been successfully revoked." });
        }
      });
    }
  };

  return (
    <Shell title="Settings" description="Manage access tokens and system configuration.">
      <div className="grid gap-8">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Agent Tokens</CardTitle>
              <CardDescription>Tokens used by agents to authenticate and send metrics.</CardDescription>
            </div>
            <CreateTokenDialog />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading tokens...</div>
            ) : tokens?.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-secondary/10">
                <p className="text-muted-foreground">No active tokens found.</p>
                <p className="text-xs text-muted-foreground mt-1">Create a token to connect your first agent.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens?.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell className="capitalize">
                        <span className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          {token.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(token.createdAt || "").toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRevoke(token.id)}
                          className="hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function CreateTokenDialog() {
  const [open, setOpen] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);
  const { toast } = useToast();
  const createMutation = useCreateToken();

  const form = useForm<z.infer<typeof insertTokenSchema>>({
    resolver: zodResolver(insertTokenSchema),
    defaultValues: {
      name: "",
      type: "vm",
      token: "will-be-generated-by-backend-but-schema-requires-it", // This field is technically required by insert schema but backend generates it.
                                                                     // Ideally we'd omit it in a separate CreateRequestSchema.
                                                                     // For now, we'll pass a placeholder and backend overrides it.
    },
  });

  const onSubmit = (data: z.infer<typeof insertTokenSchema>) => {
    // Generate a random token on client just to satisfy schema,
    // though ideally backend handles this.
    // The backend route handler ignores the input token and generates a new one.
    const payload = { ...data, token: crypto.randomUUID() }; 
    
    createMutation.mutate(payload, {
      onSuccess: (result) => {
        setNewToken(result.token);
        toast({ title: "Token created", description: "Copy the token now, you won't see it again!" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleCopy = () => {
    if (newToken) {
      navigator.clipboard.writeText(newToken);
      toast({ title: "Copied!", description: "Token copied to clipboard." });
    }
  };

  const handleClose = () => {
    setOpen(false);
    setNewToken(null);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 shadow-lg shadow-primary/25">
          <Plus className="h-4 w-4" /> Generate Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate New Agent Token</DialogTitle>
        </DialogHeader>

        {!newToken ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Production Web Server" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="vm">Virtual Machine / Server</SelectItem>
                        <SelectItem value="database">Database</SelectItem>
                        <SelectItem value="kubernetes">Kubernetes Cluster</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Generating..." : "Generate Token"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
             <div className="p-4 bg-secondary/30 rounded-lg border border-border text-center">
                <p className="text-sm font-medium mb-2">Your Agent Token</p>
                <div className="flex items-center gap-2">
                   <code className="flex-1 p-2 bg-background border rounded font-mono text-sm break-all">
                      {newToken}
                   </code>
                   <Button size="icon" variant="outline" onClick={handleCopy}>
                      <Copy className="h-4 w-4" />
                   </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-destructive">
                   Copy this now. It will not be shown again.
                </p>
             </div>
             <DialogFooter>
                <Button onClick={handleClose}>Done</Button>
             </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
