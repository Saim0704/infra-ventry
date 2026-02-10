import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Database, Cloud, Server, ChevronRight, Info, Clock, Terminal } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TerminalBlockProps {
    command: string;
    onCopy: (command: string) => void;
}

function TerminalBlock({ command, onCopy }: TerminalBlockProps) {
    return (
        <div className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* MacOS Style Header */}
            <div className="bg-[#1e1e1e] px-4 py-2 border-b border-white/5 flex items-center justify-between">
                <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
                </div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">zsh — agent-install</div>
            </div>

            {/* Command Area */}
            <div className="bg-[#0c0c0c] p-6 font-mono text-xs leading-relaxed overflow-x-auto">
                <div className="flex gap-4">
                    <span className="text-zinc-600 select-none">$</span>
                    <pre className="text-emerald-400 whitespace-pre-wrap flex-1">{command}</pre>
                </div>
            </div>

            {/* Copy Overlay */}
            <div className="absolute top-12 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 bg-white/10 hover:bg-white/20 border-white/10 backdrop-blur-md shadow-lg"
                    onClick={() => onCopy(command)}
                >
                    <Copy className="h-4 w-4 text-white" />
                </Button>
            </div>
        </div>
    );
}

interface RegistrationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    token: string | null;
    projectName: string;
}

export function RegistrationModal({ open, onOpenChange, token, projectName }: RegistrationModalProps) {
    const { toast } = useToast();
    const [cronTime, setCronTime] = useState({ hour: "02", minute: "00" });

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast({ title: `${label} Copied!`, description: "Ready to be pasted." });
    };

    const serverUrl = typeof window !== 'undefined' ? window.location.origin : "http://YOUR_SERVER_IP:5400";
    const baseVmCommand = `curl -s -L "https://gitlab.bigohtech.com/devops-public/infrawatch-bash-scripts/-/raw/dd01770d64390aa48ec3ed83c3a4888d885650c5/vm_agent.sh" | bash -s -- ${serverUrl} ${token || "YOUR_TOKEN"}`;

    const vmCommand = baseVmCommand;
    const dbCommand = `docker run -d --name infra-db-agent -e AGENT_TOKEN=${token || "YOUR_TOKEN"} infrawatch/db-agent:latest`;
    const k8sCommand = `helm install infra-agent infrawatch/infra-agent --set token=${token || "YOUR_TOKEN"}`;

    // Cron logic
    const cronExpression = `${parseInt(cronTime.minute)} ${parseInt(cronTime.hour)} * * *`;
    const cronCommand = `(crontab -l 2>/dev/null; echo "${cronExpression} ${baseVmCommand}") | crontab -`;

    return (
        <AnimatePresence>
            {open && (
                <Dialog open={open} onOpenChange={onOpenChange}>
                    <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

                        <div className="relative p-10 space-y-8">
                            <DialogHeader>
                                <motion.div
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <DialogTitle className="text-[2.5rem] font-black font-display tracking-tighter text-gradient mb-2 leading-tight">
                                        Register Resource
                                    </DialogTitle>
                                    <DialogDescription className="text-muted-foreground text-lg leading-relaxed max-w-md">
                                        Connect infrastructure to <span className="text-foreground font-bold">{projectName}</span> in seconds.
                                    </DialogDescription>
                                </motion.div>
                            </DialogHeader>

                            {/* API Token Section - Glassmorphism */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5, delay: 0.1 }}
                                className="group relative p-7 glass-card rounded-[2rem] overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-all duration-500">
                                    <Info className="w-16 h-16" />
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-1 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary),0.5)]" />
                                        <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em]">Secure Project Access Token</p>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <code className="flex-1 p-4 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 rounded-2xl font-mono text-sm break-all font-semibold tracking-tight">
                                            {token || "Creating secure gateway..."}
                                        </code>
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="h-12 w-12 rounded-2xl hover:bg-primary hover:text-primary-foreground border-primary/20 transition-all active:scale-95 shadow-lg group-hover:shadow-primary/20"
                                            onClick={() => copyToClipboard(token || "", "Token")}
                                            disabled={!token}
                                        >
                                            <Copy className="h-5 w-5" />
                                        </Button>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/60 italic font-medium">This key is required to authenticate your agent metrics.</p>
                                </div>
                            </motion.div>

                            <Tabs defaultValue="vm" className="w-full">
                                <TabsList className="grid w-full grid-cols-4 bg-muted/30 p-1.5 rounded-[1.5rem] border border-border/40 mb-8 h-14">
                                    <TabsTrigger value="vm" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                        <Server className="w-4 h-4 mr-2" /> Server
                                    </TabsTrigger>
                                    <TabsTrigger value="db" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                        <Database className="w-4 h-4 mr-2" /> Database
                                    </TabsTrigger>
                                    <TabsTrigger value="k8s" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                        <Cloud className="w-4 h-4 mr-2" /> K8s
                                    </TabsTrigger>
                                    <TabsTrigger value="cron" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                        <Clock className="w-4 h-4 mr-2" /> Cron
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="vm" className="mt-0 focus-visible:outline-none">
                                    <TabContentContainer
                                        title="Linux Agent Installation"
                                        description="Deploy our lightweight agent on any Cloud or On-Prem server."
                                        command={vmCommand}
                                        onCopy={(cmd: string) => copyToClipboard(cmd, "Command")}
                                    />
                                </TabsContent>

                                <TabsContent value="db" className="mt-0 focus-visible:outline-none">
                                    <TabContentContainer
                                        title="Database Connector"
                                        description="Run the bridge as a Docker container for internal observability."
                                        command={dbCommand}
                                        onCopy={(cmd: string) => copyToClipboard(cmd, "Command")}
                                    />
                                </TabsContent>

                                <TabsContent value="k8s" className="mt-0 focus-visible:outline-none">
                                    <TabContentContainer
                                        title="Kubernetes Helm Chart"
                                        description="Deploy the full stack to your cluster in one command."
                                        command={k8sCommand}
                                        onCopy={(cmd: string) => copyToClipboard(cmd, "Command")}
                                    />
                                </TabsContent>

                                <TabsContent value="cron" className="mt-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-1.5 px-1">
                                            <h3 className="text-base font-black tracking-tight leading-none">Scheduled Agent Updates</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Configure a cron job to keep your agent updated automatically.</p>
                                        </div>

                                        <div className="flex items-end gap-4 p-5 bg-muted/30 rounded-2xl border border-border/40">
                                            <div className="space-y-2">
                                                <Label htmlFor="hour" className="text-xs font-bold uppercase text-muted-foreground">Hour (0-23)</Label>
                                                <Input
                                                    id="hour"
                                                    type="number"
                                                    min="0"
                                                    max="23"
                                                    value={cronTime.hour}
                                                    onChange={(e) => setCronTime({ ...cronTime, hour: e.target.value })}
                                                    className="w-24 bg-background border-border/60"
                                                />
                                            </div>
                                            <div className="text-2xl font-black text-muted-foreground pb-2">:</div>
                                            <div className="space-y-2">
                                                <Label htmlFor="minute" className="text-xs font-bold uppercase text-muted-foreground">Minute (0-59)</Label>
                                                <Input
                                                    id="minute"
                                                    type="number"
                                                    min="0"
                                                    max="59"
                                                    value={cronTime.minute}
                                                    onChange={(e) => setCronTime({ ...cronTime, minute: e.target.value })}
                                                    className="w-24 bg-background border-border/60"
                                                />
                                            </div>
                                            <div className="flex-1 text-xs text-muted-foreground pb-3 text-right font-mono">
                                                Runs daily at <span className="font-bold text-foreground">{cronTime.hour.padStart(2, '0')}:{cronTime.minute.padStart(2, '0')}</span>
                                            </div>
                                        </div>

                                        <TerminalBlock command={cronCommand} onCopy={(cmd) => copyToClipboard(cmd, "Cron Command")} />
                                    </motion.div>
                                </TabsContent>
                            </Tabs>

                            {/* Footer/Next Steps */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="pt-6 border-t border-border/50 flex items-center justify-between"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
                                        <ChevronRight className="h-3 w-3 text-primary" />
                                    </div>
                                    <span className="text-[11px] font-bold text-muted-foreground/80 tracking-tight">New resources appear instantly after installation.</span>
                                </div>
                                <Button variant="ghost" className="text-xs font-black text-primary group p-0 hover:no-underline">
                                    Docs <ChevronRight className="w-3.5 h-3.5 ml-1 group-hover:px-0.5 transition-all" />
                                </Button>
                            </motion.div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </AnimatePresence>
    );
}

function TabContentContainer({ title, description, command, onCopy }: any) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="space-y-5"
        >
            <div className="space-y-1.5 px-1">
                <h3 className="text-base font-black tracking-tight leading-none">{title}</h3>
                <p className="text-xs text-muted-foreground font-medium">{description}</p>
            </div>
            <TerminalBlock command={command} onCopy={onCopy} />
        </motion.div>
    );
}
