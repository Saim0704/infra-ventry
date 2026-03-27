import { Link, useLocation } from "wouter";
import { Shell } from "@/components/layout/Shell";
import { useTokens, useCreateToken, useRevokeToken } from "@/hooks/use-tokens";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Plus, Trash2, Mail, Bell, Settings, Terminal, Shield,
  Database as DbIcon, Cpu, Layout, Server, Cloud,
  Search, RefreshCw, Save, Check, X, Send, AlertTriangle,
  Users, Trash, Copy, Key, UserPlus, User, UserCog, Palette, ShieldCheck, MailIcon
} from "lucide-react";
import { EmailTemplateDesigner } from "@/components/EmailTemplateDesigner";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTokenSchema } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { queryClient } from "@/lib/queryClient";

export default function SettingsPage() {
  const { user } = useAuth();
  const { data: tokens, isLoading: tokensLoading } = useTokens();
  const revokeMutation = useRevokeToken();
  const { toast } = useToast();
  const [location] = useLocation();

  // Handle tab deep linking from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const defaultTab = searchParams.get('tab') || 'tokens';

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
    <Shell title="Settings" description="Manage your preferences, security tokens, and organization members.">
      <Tabs defaultValue={defaultTab} className="w-full">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          <aside className="md:w-64 w-full shrink-0 space-y-2">
            <div className="px-3 py-2">
              <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Configuration</h2>
              <TabsList className="flex flex-col h-auto bg-transparent border-none p-0 space-y-1">
                <TabsTrigger
                  value="tokens"
                  className="w-full justify-start gap-3 px-4 py-3 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-primary/20"
                >
                  <Shield className="h-4 w-4" />
                  <span className="font-medium">API Tokens</span>
                </TabsTrigger>
                <TabsTrigger
                  value="profile"
                  className="w-full justify-start gap-3 px-4 py-3 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-primary/20"
                >
                  <User className="h-4 w-4" />
                  <span className="font-medium">My Profile</span>
                </TabsTrigger>
                {user?.role === 'admin' && (
                  <>
                    <TabsTrigger
                      value="smtp"
                      className="w-full justify-start gap-3 px-4 py-3 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-primary/20"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="font-medium">Default SMTP Configuration</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="w-full justify-start gap-3 px-4 py-3 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-primary/20"
                    >
                      <Bell className="h-4 w-4" />
                      <span className="font-medium">Alert History</span>
                    </TabsTrigger>
                    <TabsTrigger
                      value="users"
                      className="w-full justify-start gap-3 px-4 py-3 h-auto data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-xl transition-all duration-200 border border-transparent data-[state=active]:border-primary/20"
                    >
                      <UserCog className="h-4 w-4" />
                      <span className="font-medium">User Management</span>
                    </TabsTrigger>

                  </>
                )}
              </TabsList>
            </div>

            <div className="px-7 py-4 bg-muted/30 rounded-2xl border border-border/50 text-[11px] text-muted-foreground leading-relaxed">
              <p>LoggedIn as <span className="font-bold text-foreground">{user?.username}</span></p>
              <p className="mt-1 opacity-70">Changes made here affect your account and organizational visibility.</p>
            </div>
          </aside>

          <div className="flex-1 w-full space-y-6">
            <TabsContent value="tokens" className="mt-0 outline-none">
              <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-6 mb-2">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">Agent Tokens</CardTitle>
                    <CardDescription>Secure keys for agent authentication and metric ingestion.</CardDescription>
                  </div>
                  <CreateTokenDialog />
                </CardHeader>
                <CardContent className="pt-6">
                  {tokensLoading ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">Loading tokens...</div>
                  ) : tokens?.length === 0 ? (
                    <div className="text-center py-16 border-2 border-dashed rounded-3xl bg-secondary/5 border-border/50">
                      <div className="mx-auto w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                        <Key className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium">No active tokens</h3>
                      <p className="text-sm text-muted-foreground mt-1 max-w-[250px] mx-auto">Generate your first token to start monitoring your infrastructure.</p>
                      <div className="mt-6 flex justify-center">
                        <CreateTokenDialog />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-border/40 overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/30">
                          <TableRow>
                            <TableHead className="py-4">Name</TableHead>
                            <TableHead className="py-4">Type</TableHead>
                            <TableHead className="py-4">Created At</TableHead>
                            <TableHead className="py-4 text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tokens?.map((token) => (
                            <TableRow key={token.id} className="hover:bg-muted/20 transition-colors">
                              <TableCell className="font-semibold">{token.name}</TableCell>
                              <TableCell className="capitalize tabular-nums">
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                                  {token.type}
                                </span>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm font-medium">
                                {new Date(token.createdAt || "").toLocaleDateString()}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRevoke(token.id)}
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="profile" className="mt-0 outline-none">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20" />
                  <CardHeader className="-mt-12 relative z-10">
                    <div className="h-20 w-20 rounded-2xl bg-background border-4 border-card shadow-xl flex items-center justify-center mb-2">
                      <User className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl font-bold">Account Details</CardTitle>
                      <CardDescription>Manage your personal information and roles.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-2 pb-8">
                    <div className="grid grid-cols-2 gap-6 bg-muted/20 p-4 rounded-2xl border border-border/30">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-70">First Name</p>
                        <p className="font-semibold text-foreground">{(user as any)?.firstName || "-"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-70">Last Name</p>
                        <p className="font-semibold text-foreground">{(user as any)?.lastName || "-"}</p>
                      </div>
                    </div>

                    <div className="space-y-4 px-1">
                      <div className="flex items-center justify-between py-1 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Email Address</span>
                        <span className="text-sm font-semibold">{(user as any)?.email || "-"}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/30">
                        <span className="text-sm font-medium text-muted-foreground">Username</span>
                        <span className="text-sm font-mono font-medium lowercase tracking-tight">{user?.username}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm font-medium text-muted-foreground">System Role</span>
                        <span className="px-3 py-1 rounded-lg text-[10px] font-black bg-primary/10 text-primary border border-primary/20 uppercase tracking-tighter">
                          {(user as any)?.role}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <ChangePasswordCard />
              </div>
            </TabsContent>

            {user?.role === 'admin' && (
              <>
                <TabsContent value="smtp" className="mt-0 outline-none">
                  <SmtpSettingsSection />
                </TabsContent>
                <TabsContent value="history" className="mt-0 outline-none">
                  <AlertHistoryTable />
                </TabsContent>
                <TabsContent value="users" className="mt-0 outline-none">
                  <UserManagementTable />
                </TabsContent>
              </>
            )}
          </div>
        </div>
      </Tabs>
    </Shell >
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
    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm h-full">
      <CardHeader>
        <div className="mx-auto w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
          <Key className="h-6 w-6 text-amber-500" />
        </div>
        <CardTitle className="text-xl font-bold text-center">
          {targetUserId ? "Reset User Password" : "Change Password"}
        </CardTitle>
        <CardDescription className="text-center px-4">
          {targetUserId ? "Set a new temporary password for this user." : "Ensure your account stays secure with a strong password."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data.password))} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase tracking-wider opacity-70">New Secure Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="h-12 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 rounded-xl bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-bold" disabled={mutation.isPending}>
              {mutation.isPending ? "Updating..." : (
                <>
                  <Key className="mr-2 h-4 w-4" />
                  Update Password
                </>
              )}
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
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({ title: "User deleted", description: "The user has been successfully removed." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const handleDelete = (userId: string, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteMutation.mutate(userId);
    }
  };

  return (
    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-6 mb-2">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">User Accounts</CardTitle>
          <CardDescription>Manage your team's access and roles across the organization.</CardDescription>
        </div>
        <CreateUserDialog />
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground animate-pulse">Loading users...</div>
        ) : (
          <div className="rounded-xl border border-border/40 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/30">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-4">Member</TableHead>
                  <TableHead className="py-4">Credentials</TableHead>
                  <TableHead className="py-4">Role</TableHead>
                  <TableHead className="py-4 text-right px-6">Management</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id} className="group hover:bg-muted/20 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-xs border border-primary/20">
                          {u.firstName?.[0]}{u.lastName?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-sm leading-none">{u.firstName} {u.lastName}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-tighter opacity-70 italic">ID: {u.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3 w-3 text-muted-foreground opacity-50" />
                          <span className="font-mono text-[11px] leading-none lowercase tracking-tighter">{u.username}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Check className="h-3 w-3 text-emerald-500 opacity-50" />
                          <span className="text-[11px] text-muted-foreground font-medium">{u.email}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-muted/50 text-muted-foreground border-border/50'}`}>
                        {u.role}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right px-6">
                      <div className="flex justify-end gap-2">
                        <Dialog open={resetUserId === u.id} onOpenChange={(open) => setResetUserId(open ? u.id : null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-2 bg-background/50 border-border/40 hover:bg-muted font-bold text-[11px] rounded-lg"
                            >
                              <Key className="h-3 w-3" /> Reset
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm p-0 overflow-hidden border-none bg-transparent">
                            <ChangePasswordCard targetUserId={u.id} />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={u.id === currentUser?.id || deleteMutation.isPending}
                          onClick={() => handleDelete(u.id, u.username)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
        <Button className="gap-2 bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 rounded-xl font-bold h-10 px-5 transition-all">
          <UserPlus className="h-4 w-4" /> Create Member
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-border/20 shadow-2xl bg-card/95 backdrop-blur-xl rounded-2xl">
        <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight">Add New Member</DialogTitle>
            <p className="text-sm text-muted-foreground">Fill in the details below to grant system access to a new member.</p>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="johndoe" className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4 font-mono text-sm" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Initial Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Organizational Role</FormLabel>
                      <FormControl>
                        <select
                          className="w-full h-11 px-4 rounded-xl bg-muted/20 border border-border/40 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:20px] bg-[right_12px_center] bg-no-repeat"
                          {...field}
                        >
                          <option value="read">Read Only</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <DialogFooter className="pt-4 border-t border-border/30 mt-8">
                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-primary shadow-lg shadow-primary/10 hover:shadow-primary/25 transition-all text-sm font-black uppercase tracking-wider"
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? "Configuring Account..." : "Confirm & Create Member"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
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
      token: "will-be-generated-by-backend-but-schema-requires-it",
    },
  });

  const onSubmit = (data: z.infer<typeof insertTokenSchema>) => {
    const payload = { ...data, token: crypto.randomUUID() };

    createMutation.mutate(payload, {
      onSuccess: (result) => {
        setNewToken(result.token);
        toast({ title: "Token created", description: "Securely store this token now." });
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
        <Button className="gap-2 bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/40 rounded-xl font-bold h-10 px-5 transition-all">
          <Plus className="h-4 w-4" /> Generate Key
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-border/20 shadow-2xl bg-card/95 backdrop-blur-xl rounded-2xl">
        <div className="h-2 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold tracking-tight">New Agent Key</DialogTitle>
            <p className="text-sm text-muted-foreground">Tokens authenticate your infrastructure agents with our secure API.</p>
          </DialogHeader>

          {!newToken ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Identifier</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. AWS Production East" className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4" {...field} />
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
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Resource Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 bg-muted/20 border-border/40 focus:ring-primary/20 rounded-xl px-4">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl border-border/40 shadow-xl">
                          <SelectItem value="vm">Server Instance (VM/Bare Metal)</SelectItem>
                          <SelectItem value="database">Database System</SelectItem>
                          <SelectItem value="kubernetes">Kubernetes Node/Cluster</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="pt-4 border-t border-border/30 mt-8">
                  <Button
                    type="submit"
                    className="w-full h-12 rounded-xl bg-primary shadow-lg shadow-primary/10 hover:shadow-primary/25 transition-all text-sm font-black uppercase tracking-wider"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending ? "Generating Secure Key..." : "Confirm & Generate Key"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-center">
                <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5 text-amber-500" />
                </div>
                <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-3">Copy your credentials</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-background/80 border border-border/40 rounded-xl font-mono text-xs break-all text-foreground shadow-inner">
                    {newToken}
                  </code>
                  <Button size="icon" variant="outline" onClick={handleCopy} className="h-10 w-10 rounded-xl border-border/40 hover:bg-muted shrink-0">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-4 flex items-center gap-2 justify-center py-2 px-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
                  <Check className="h-3 w-3" />
                  <p className="text-[10px] font-bold uppercase tracking-tighter">This token will be hidden forever after you exit.</p>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleClose} className="w-full h-11 rounded-xl font-bold bg-muted hover:bg-muted/80 text-foreground transition-all border border-border/40">
                  I have securely saved this key
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SmtpSettingsSection() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useQuery<any>({
    queryKey: ['/api/settings/smtp']
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/settings/smtp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/smtp'] });
      toast({ title: "Settings updated", description: "SMTP and Alert settings have been saved." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const testMutation = useMutation({
    mutationFn: async ({ recipient, settings }: { recipient: string, settings?: any }) => {
      const res = await fetch('/api/settings/smtp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient, settings })
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Error ${res.status}: Failed to send test email`);
        return data;
      } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text);
        if (!res.ok) {
          throw new Error(`Server returned non-JSON error (${res.status}). Check server console for logs.`);
        }
        return { success: true, message: "Operation completed, but response was not JSON." };
      }
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Test email sent successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  const [testRecipient, setTestRecipient] = useState("");

  const form = useForm<any>({
    values: settings || {
      host: "",
      port: 587,
      user: "",
      pass: "",
      fromEmail: "",
      senderName: "",
    }
  });

  const handleTestEmail = () => {
    const currentValues = form.getValues();
    testMutation.mutate({
      recipient: testRecipient,
      settings: currentValues
    });
  };

  if (isLoading) return <div className="text-center py-12 animate-pulse">Loading settings...</div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => {
        mutation.mutate(data);
      })} className="space-y-6">
        <div className="grid grid-cols-1 gap-8">
          <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold">Global SMTP Configuration</CardTitle>
                  <CardDescription>Configure the default email server used when project-specific SMTP is not set.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">SMTP Host</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.gmail.com" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Port</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="587" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="user@gmail.com" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={form.control}
                  name="fromEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">From Email Address</FormLabel>
                      <FormControl>
                        <Input placeholder="alerts@infra-ventry.com" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px]">Email address that will appear in the FROM field.</FormDescription>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="senderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-foreground/70">Sender Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Infrastructure Monitor" className="h-11 bg-muted/20 border-border/40 rounded-xl" {...field} />
                      </FormControl>
                      <FormDescription className="text-[10px]">The display name shown to recipients (e.g. "Acme Corp Alerts").</FormDescription>
                    </FormItem>
                  )}
                />
              </div>

              <div className="pt-4 border-t border-border/30 mt-6 bg-muted/10 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-foreground/70 mb-4 flex items-center gap-2">
                  <Send className="h-3 w-3" /> Test Connection
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="test@example.com"
                    className="h-10 bg-background border-border/40 rounded-lg text-sm"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 px-4 rounded-lg font-bold text-xs shrink-0"
                    onClick={handleTestEmail}
                    disabled={testMutation.isPending || !testRecipient}
                  >
                    {testMutation.isPending ? "Sending..." : "Send Test"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <Button type="submit" className="w-full h-12 rounded-xl bg-primary shadow-lg shadow-primary/10 font-black uppercase tracking-wider mt-4" disabled={mutation.isPending}>
          {mutation.isPending ? "Saving..." : (
            <>
              <Save className="mr-2 h-4 w-4" /> Save All Configuration
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

function AlertHistoryTable() {
  const { data: alerts, isLoading } = useQuery<any[]>({
    queryKey: ['/api/alerts/history']
  });

  if (isLoading) return <div className="text-center py-12 animate-pulse">Loading history...</div>;

  return (
    <Card className="border-border/40 shadow-sm bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Alert History</CardTitle>
        <CardDescription>A log of all alert emails sent by the system.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border/40 overflow-hidden bg-background/50">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Timestamp</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Server</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Type</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center">Value</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4 text-center">Threshold</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-widest py-4">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts?.map((alert) => (
                <TableRow key={alert.id} className="border-border/40 hover:bg-muted/10 transition-colors">
                  <TableCell className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {new Date(alert.sentAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="font-bold text-sm tracking-tight">{alert.serverName}</TableCell>
                  <TableCell>
                    <div className={`text-[10px] font-black uppercase tracking-tighter w-fit px-2 py-0.5 rounded-full ${alert.type === 'cpu' ? 'bg-indigo-500/10 text-indigo-500' :
                      alert.type === 'memory' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>
                      {alert.type}
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs font-bold">
                    {alert.value.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {alert.threshold}%
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500">
                      <Check className="h-3 w-3" /> Sent
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {(!alerts || alerts.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                    No alert history found yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

