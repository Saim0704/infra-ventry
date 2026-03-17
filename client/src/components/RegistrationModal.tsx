import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Copy, Database, Cloud, Server, ChevronRight, Info, Clock, Terminal, Activity, Globe, Package, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
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
    initialTab?: string;
}

export function RegistrationModal({ open, onOpenChange, token, projectName, initialTab = "vm" }: RegistrationModalProps) {
    const { toast } = useToast();
    const [cronTime, setCronTime] = useState({ hour: "02", minute: "00" });
    const [serverMethod, setServerMethod] = useState<"cron" | "agent">("agent");
    const [agentSubMethod, setAgentSubMethod] = useState<"persistent" | "test">("persistent");
    const [activeTab, setActiveTab] = useState(initialTab || "vm");

    useEffect(() => {
        if (open) {
            setActiveTab(initialTab || "vm");
        }
    }, [open, initialTab]);

    const copyToClipboard = async (text: string, label: string) => {
        if (!text) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for non-secure contexts (HTTP)
                const textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                textArea.style.top = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (!successful) throw new Error('execCommand copy failed');
            }
            toast({ title: `${label} Copied!`, description: "Ready to be pasted." });
        } catch (err) {
            console.error('Failed to copy: ', err);
            toast({ title: "Copy Failed", description: "Please copy manually from the terminal block.", variant: "destructive" });
        }
    };

    const serverUrl = typeof window !== 'undefined' ? window.location.origin : "http://YOUR_SERVER_IP:3000";
    const baseVmCommand = `curl -s -L "${serverUrl}/get/vm_agent.sh" | bash -s -- ${serverUrl} ${token || "YOUR_TOKEN"}`;

    const dbCommand = `docker run -d --name infra-db-agent -e AGENT_TOKEN=${token || "YOUR_TOKEN"} infrawatch/db-agent:latest`;
    const k8sCommand = `helm install infra-agent infrawatch/infra-agent --set token=${token || "YOUR_TOKEN"}`;

    const auditOnceCommand = `curl -s -L "${serverUrl}/get/audit_services.sh" | bash -s -- ${serverUrl} ${token || "YOUR_TOKEN"}`;
    const cronExpression = `${parseInt(cronTime.minute)} ${parseInt(cronTime.hour)} * * *`;
    const cronCommand = `(crontab -l 2>/dev/null; echo "${cronExpression} ${baseVmCommand} && ${auditOnceCommand}") | crontab -`;

    return (
        <AnimatePresence>
            {open && (
                <Dialog open={open} onOpenChange={onOpenChange}>
                    <DialogContent className="sm:max-w-[750px] h-[850px] p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border border-border/50 rounded-[2.5rem] shadow-[0_32px_128px_-16px_rgba(0,0,0,0.3)]">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

                        <div className="relative p-10 h-full flex flex-col space-y-8">
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

                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex-1 flex flex-col">
                                {!initialTab && (
                                    <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1.5 rounded-[1.5rem] border border-border/40 mb-8 h-14">
                                        <TabsTrigger value="vm" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                            <Server className="w-4 h-4 mr-2" /> Server
                                        </TabsTrigger>
                                        <TabsTrigger value="db" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                            <Database className="w-4 h-4 mr-2" /> Database
                                        </TabsTrigger>
                                        <TabsTrigger value="cluster" className="rounded-[1.1rem] font-bold transition-all data-[state=active]:bg-background data-[state=active]:shadow-xl py-3 text-sm">
                                            <Cloud className="w-4 h-4 mr-2" /> Cluster
                                        </TabsTrigger>
                                    </TabsList>
                                )}

                                <TabsContent value="vm" className="mt-0 focus-visible:outline-none">
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                                        className="space-y-6"
                                    >
                                        <div className="space-y-1.5 px-1">
                                            <h3 className="text-base font-black tracking-tight leading-none">Linux Agent Installation</h3>
                                            <p className="text-xs text-muted-foreground font-medium">Deploy our agent on any Cloud or On-Prem server to track resources and service versions.</p>
                                        </div>

                                        {/* Method Selector */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setServerMethod("agent")}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 text-left ${serverMethod === "agent"
                                                    ? "border-emerald-500 bg-emerald-500/5 shadow-md shadow-emerald-500/10"
                                                    : "border-border/40 bg-muted/20 hover:border-border/70 hover:bg-muted/40"
                                                    }`}
                                            >
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${serverMethod === "agent" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                                                    <Terminal className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold leading-none mb-1">Real-time Agent</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Persistent Service</p>
                                                </div>
                                            </button>

                                            <button
                                                onClick={() => setServerMethod("cron")}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 text-left ${serverMethod === "cron"
                                                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                                                    : "border-border/40 bg-muted/20 hover:border-border/70 hover:bg-muted/40"
                                                    }`}
                                            >
                                                <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${serverMethod === "cron" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                                    <Clock className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold leading-none mb-1">Periodic (Cron)</p>
                                                    <p className="text-[10px] text-muted-foreground uppercase font-black">Daily Collection</p>
                                                </div>
                                            </button>
                                        </div>

                                        {/* Method Content */}
                                        <div className="relative min-h-[200px]">
                                            {serverMethod === "agent" ? (
                                                <div className="space-y-6">
                                                    {/* Agent Sub-selector */}
                                                    <div className="flex p-1 bg-muted/30 rounded-xl border border-border/20 w-fit">
                                                        <button
                                                            onClick={() => setAgentSubMethod("persistent")}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${agentSubMethod === "persistent" ? "bg-background text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                                        >
                                                            Persistent Install
                                                        </button>
                                                        <button
                                                            onClick={() => setAgentSubMethod("test")}
                                                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${agentSubMethod === "test" ? "bg-background text-emerald-500 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                                        >
                                                            One-time Test
                                                        </button>
                                                    </div>

                                                    <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/20">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                                            <span className="text-xs font-bold text-emerald-600">
                                                                {agentSubMethod === "persistent" ? "Systemd Service Mode" : "Manual Test Mode"}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground leading-relaxed">
                                                            {agentSubMethod === "persistent" 
                                                                ? "Downloads and installs the binary as a registered systemd service. It will restart automatically on reboot."
                                                                : "Runs the agent binary directly in the current session. Perfect for verifying connection before a full install."}
                                                        </p>
                                                    </div>

                                                    <TerminalBlock 
                                                        command={agentSubMethod === "persistent" 
                                                            ? `curl -s -L "${serverUrl}/get/install-agent.sh" | sudo bash -s -- "${serverUrl}" "${token || 'YOUR_TOKEN'}"`
                                                            : `curl -s -L "${serverUrl}/get/audit_services.sh" | bash -s -- "${serverUrl}" "${token || 'YOUR_TOKEN'}" && export SERVER_URL="${serverUrl}" AGENT_TOKEN="${token || 'YOUR_TOKEN'}" && curl -s -L "$SERVER_URL/get/infrawatch-agent" -o infrawatch-agent && chmod +x infrawatch-agent && ./infrawatch-agent`
                                                        } 
                                                        onCopy={(cmd) => copyToClipboard(cmd, agentSubMethod === "persistent" ? "Persistent Install" : "Test Command")} 
                                                    />
                                                </div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div className="flex items-center gap-4 p-5 bg-muted/30 rounded-2xl border border-border/40">
                                                        <div className="space-y-2">
                                                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Execution Time</Label>
                                                            <div className="flex items-center gap-2">
                                                                <Input
                                                                    type="number"
                                                                    value={cronTime.hour}
                                                                    min="0" max="23"
                                                                    onChange={(e) => setCronTime({ ...cronTime, hour: e.target.value })}
                                                                    className="w-16 h-10 bg-background font-bold text-center rounded-lg"
                                                                />
                                                                <span className="font-bold">:</span>
                                                                <Input
                                                                    type="number"
                                                                    value={cronTime.minute}
                                                                    min="0" max="59"
                                                                    onChange={(e) => setCronTime({ ...cronTime, minute: e.target.value })}
                                                                    className="w-16 h-10 bg-background font-bold text-center rounded-lg"
                                                                />
                                                                <div className="ml-4 text-xs text-muted-foreground font-medium">
                                                                    Daily at <span className="text-foreground font-black">{cronTime.hour.padStart(2, '0')}:{cronTime.minute.padStart(2, '0')}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <TerminalBlock command={cronCommand} onCopy={(cmd) => copyToClipboard(cmd, "Cron Command")} />
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </TabsContent>

                                <TabsContent value="db" className="mt-0 focus-visible:outline-none">
                                    <TabContentContainer
                                        title="Database Monitoring"
                                        description="Run our lightweight collector as a container to monitor your SQL/NoSQL databases."
                                        command={dbCommand}
                                        onCopy={(cmd: string) => copyToClipboard(cmd, "Docker Command")}
                                    />
                                </TabsContent>

                                <TabsContent value="cluster" className="mt-0 focus-visible:outline-none">
                                    <TabContentContainer
                                        title="Kubernetes Integration"
                                        description="Deploy our Helm chart to monitor your entire cluster performance."
                                        command={k8sCommand}
                                        onCopy={(cmd: string) => copyToClipboard(cmd, "Helm Command")}
                                    />
                                </TabsContent>
                            </Tabs>

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

