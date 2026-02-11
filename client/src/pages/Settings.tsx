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

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { User, Shield, UserCog, Key, UserPlus } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: tokens, isLoading: tokensLoading } = useTokens();
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
    <Shell title="Settings" description="Manage access tokens, user profiles, and system access.">
      <Tabs defaultValue="tokens" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 border border-border/50">
          <TabsTrigger value="tokens" className="gap-2">
            <Shield className="h-4 w-4" /> Tokens
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" /> Profile
          </TabsTrigger>
          {user?.role === 'admin' && (
            <TabsTrigger value="users" className="gap-2">
              <UserCog className="h-4 w-4" /> User Management
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="tokens">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Agent Tokens</CardTitle>
                <CardDescription>Tokens used by agents to authenticate and send metrics.</CardDescription>
              </div>
              <CreateTokenDialog />
            </CardHeader>
            <CardContent>
              {tokensLoading ? (
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
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Account Details</CardTitle>
                <CardDescription>Your personal profile information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">First Name</p>
                    <p className="font-medium">{(user as any)?.firstName || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">Last Name</p>
                    <p className="font-medium">{(user as any)?.lastName || "-"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Email</p>
                  <p className="font-medium">{(user as any)?.email || "-"}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Username</p>
                  <p className="font-mono text-sm">{user?.username}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Role</p>
                  <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-primary/10 text-primary uppercase tracking-wider">
                    {(user as any)?.role}
                  </span>
                </div>
              </CardContent>
            </Card>

            <ChangePasswordCard />
          </div>
        </TabsContent>

        {user?.role === 'admin' && (
          <TabsContent value="users">
            <div className="grid gap-8">
              <UserManagementTable />
            </div>
          </TabsContent>
        )}
      </Tabs>
    </Shell>
  );
}

function ChangePasswordCard({ targetUserId }: { targetUserId?: string }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (password: string) => {
      const url = targetUserId ? `/api/admin/users/${targetUserId}/password` : `/api/user/password`;
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Password updated successfully." });
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm<{ password: string }>({
    defaultValues: { password: "" }
  });

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle>{targetUserId ? "Reset User Password" : "Change Password"}</CardTitle>
        <CardDescription>
          {targetUserId ? "Set a new password for this user." : "Update your account password."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data.password))} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              <Key className="mr-2 h-4 w-4" />
              {mutation.isPending ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function UserManagementTable() {
  const { data: users, isLoading } = useQuery<any[]>({
    queryKey: ['/api/admin/users']
  });
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Accounts</CardTitle>
          <CardDescription>Manage system users and reset their passwords.</CardDescription>
        </div>
        <CreateUserDialog />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading users...</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                  <TableCell className="font-mono text-xs">{u.username}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${u.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary/50 text-muted-foreground'}`}>
                      {u.role}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog open={resetUserId === u.id} onOpenChange={(open) => setResetUserId(open ? u.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                          <Key className="h-3 w-3" /> Reset
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <ChangePasswordCard targetUserId={u.id} />
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CreateUserDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User created", description: "The new user has been successfully created." });
      setOpen(false);
      form.reset();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const form = useForm({
    defaultValues: {
      username: "",
      password: "",
      email: "",
      firstName: "",
      lastName: "",
      role: "read"
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" /> Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <select
                      className="w-full p-2 rounded-md bg-transparent border border-border"
                      {...field}
                    >
                      <option value="read">Read Only</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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

