import { useServers } from "@/hooks/use-servers";
import { useProjects } from "@/hooks/use-projects";
import { Shell } from "@/components/layout/Shell";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Package, Server, Search, Globe, Database, Activity, HardDrive, Clock, ChevronDown, ChevronRight, Layout } from "lucide-react";
import { useState, Fragment } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

const AUDIT_SERVICES = [
    { key: 'nginx', label: 'Nginx', icon: <Globe className="w-3 h-3 text-sky-500" /> },
    { key: 'apache', label: 'Apache', icon: <Globe className="w-3 h-3 text-orange-500" /> },
    { key: 'mysql', label: 'MySQL', icon: <Database className="w-3 h-3 text-blue-600" /> },
    { key: 'postgresql', label: 'Postgres', icon: <Database className="w-3 h-3 text-indigo-500" /> },
    { key: 'node', label: 'Node.js', icon: <Activity className="w-3 h-3 text-emerald-500" /> },
    { key: 'python', label: 'Python', icon: <Activity className="w-3 h-3 text-blue-500" /> },
    { key: 'java', label: 'Java', icon: <Activity className="w-3 h-3 text-red-500" /> },
    { key: 'docker', label: 'Docker', icon: <HardDrive className="w-3 h-3 text-cyan-500" /> },
];

export default function ServiceAuditPage() {
    const { data: servers, isLoading } = useServers();
    const [searchTerm, setSearchTerm] = useState("");
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

    const toggleProject = (key: string) => {
        setExpandedProjects(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const filteredServers = servers?.filter(server =>
        (server.name && server.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        server.hostname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (server.ipAddress && server.ipAddress.includes(searchTerm))
    );

    const groupedServers = filteredServers?.reduce((acc, server) => {
        const project = (server as any).project;
        const projectKey = project ? `project-${project.id}` : "uncategorized";
        if (!acc[projectKey]) {
            acc[projectKey] = {
                project: project || { name: "Uncategorized" },
                items: []
            };
        }
        acc[projectKey].items.push(server);
        return acc;
    }, {} as Record<string, { project: any, items: any[] }>);

    return (
        <Shell>
            <div className="space-y-6 max-w-[1600px] mx-auto pb-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2 mt-2">
                    <div>
                        <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent">
                            Service Audit
                        </h1>
                        <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">Track and verify service versions across your infrastructure.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by IP or Name..."
                                className="pl-9 h-11 bg-card/50 border-border/40 rounded-xl focus-visible:ring-primary/20 transition-all font-medium"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div className="rounded-[1.5rem] border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader className="bg-muted/30">
                            <TableRow className="hover:bg-transparent border-border/40">
                                <TableHead className="w-[280px] text-[10px] font-black uppercase tracking-wider pl-6">Server Infrastructure</TableHead>
                                {AUDIT_SERVICES.map(service => (
                                    <TableHead key={service.key} className="text-center text-[10px] font-black uppercase tracking-wider">
                                        <div className="flex flex-col items-center gap-1">
                                            {service.icon}
                                            <span>{service.label}</span>
                                        </div>
                                    </TableHead>
                                ))}
                                <TableHead className="text-right text-[10px] font-black uppercase tracking-wider pr-6">Last Scan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell className="pl-6"><Skeleton className="h-10 w-48" /></TableCell>
                                        {AUDIT_SERVICES.map(s => <TableCell key={s.key}><Skeleton className="h-8 w-16 mx-auto" /></TableCell>)}
                                        <TableCell className="pr-6"><Skeleton className="h-5 w-24 ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : Object.keys(groupedServers || {}).length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={AUDIT_SERVICES.length + 2} className="h-32 text-center text-muted-foreground font-medium">
                                        {searchTerm ? "No servers match your search criteria." : "No audit data discovered yet."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                Object.entries(groupedServers || {}).map(([projectKey, group]) => {
                                    const { project, items: projectServers } = group;
                                    const isExpanded = expandedProjects[projectKey];

                                    return (
                                        <Fragment key={projectKey}>
                                            <TableRow 
                                                className="bg-muted/5 hover:bg-muted/10 cursor-pointer transition-colors border-border/40"
                                                onClick={() => toggleProject(projectKey)}
                                            >
                                                <TableCell colSpan={AUDIT_SERVICES.length + 2} className="py-3 px-6">
                                                    <div className="flex items-center gap-2">
                                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                                        <Layout className="h-4 w-4 text-primary/60" />
                                                        <span className="text-sm font-bold tracking-tight text-foreground/70 uppercase">{project.name}</span>
                                                        <Badge variant="outline" className="text-[10px] h-5 rounded-full bg-primary/10 border-primary/20 text-primary ml-2">
                                                            {projectServers.length} {projectServers.length === 1 ? 'Node' : 'Nodes'}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            
                                            {isExpanded && projectServers.map((server) => {
                                                const services = server.service_versions || (server as any).serviceVersions || {};
                                                const hasAudit = Object.keys(services).length > 0;

                                                return (
                                                    <TableRow key={server.id} className="group border-border/40 hover:bg-primary/[0.02] transition-colors">
                                                        <TableCell className="pl-10 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={cn(
                                                                    "h-2 w-2 rounded-full shrink-0 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                                                                    hasAudit ? "bg-emerald-500 shadow-emerald-500/50" : "bg-zinc-400 shadow-zinc-400/50"
                                                                )} />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-sm font-bold tracking-tight truncate group-hover:text-primary transition-colors">
                                                                        {server.name || server.hostname}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono text-muted-foreground leading-none mt-0.5">
                                                                        {server.ipAddress || "No IP assigned"}
                                                                    </span>
                                                                </div>
                                                                <Badge variant="outline" className="ml-auto text-[9px] h-4 px-1 rounded-sm bg-muted/40 font-bold uppercase tracking-tighter opacity-70">
                                                                    {server.os || "Linux"}
                                                                </Badge>
                                                            </div>
                                                        </TableCell>

                                                        {AUDIT_SERVICES.map(service => {
                                                            const version = services[service.label];
                                                            return (
                                                                <TableCell key={service.key} className="text-center py-4">
                                                                    {!hasAudit ? (
                                                                        <span className="text-[10px] text-muted-foreground/30">—</span>
                                                                    ) : (
                                                                        <Badge 
                                                                            variant="outline" 
                                                                            className={cn(
                                                                                "font-mono text-[10px] px-1.5 py-0 rounded border-primary/20 bg-primary/5 text-primary whitespace-nowrap",
                                                                                (version === "N/A" || !version) && "border-transparent text-muted-foreground/30 bg-transparent font-normal"
                                                                            )}
                                                                        >
                                                                            {version || "N/A"}
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                            );
                                                        })}

                                                        <TableCell className="text-right pr-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center justify-end gap-2 text-muted-foreground">
                                                                <Clock className="w-3 h-3" />
                                                                <span className="text-[10px] font-bold">
                                                                    {server.lastSeen ? formatDistanceToNow(new Date(server.lastSeen), { addSuffix: true }) : "Never"}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </Shell>
    );
}
