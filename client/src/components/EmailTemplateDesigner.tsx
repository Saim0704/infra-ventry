import { useState, useEffect } from "react";
import { useProjectEmailTemplates, useUpdateProjectEmailTemplate, useDeleteProjectEmailTemplate, useProjectAlertSettings, useUpdateProjectAlertSettings } from "@/hooks/use-project-settings";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Mail, Info, Terminal, Sparkles, Shield, ImageIcon, Building2, Send, CheckCircle2, Trash2, Check, Save, Layout, Palette, Type, MessageSquare, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailTemplateDesignerProps {
    projectId?: number | null;
}

export function EmailTemplateDesigner({ projectId = null }: EmailTemplateDesignerProps) {
    const { data: templates, isLoading } = useProjectEmailTemplates(projectId);
    const { data: projectSettings } = useProjectAlertSettings(projectId || 0);
    const updateTemplate = useUpdateProjectEmailTemplate(projectId);
    const updateProjectSettings = useUpdateProjectAlertSettings(projectId || 0);
    const deleteTemplate = useDeleteProjectEmailTemplate(projectId);
    const { toast } = useToast();

    const [editingType, setEditingType] = useState<string | null>(null);
    const [alertSubject, setAlertSubject] = useState("");
    const [recoverySubject, setRecoverySubject] = useState("");
    const [editBody, setEditBody] = useState("");
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [isSimpleMode, setIsSimpleMode] = useState(true);
    const [simpleConfig, setSimpleConfig] = useState<any>({
        showLogo: true,
        showCompany: true,
        showFooter: true,
        showBadge: true,
        showTitle: true,
        showSubtitle: true,
        showProject: true,
        showResource: true,
        showMetric: true,
        showValue: true,
        showThreshold: true,
        themeColor: "#6366f1",
        badgeText: "HIGH CPU USAGE ON DEMO SERVER DETECTED",
        titleText: "[ URGENT ]",
        subtitleText: "Your infrastructure requires immediate attention.",
        recoveryShowBadge: true,
        recoveryShowTitle: true,
        recoveryShowSubtitle: true,
        recoveryShowProject: true,
        recoveryShowResource: true,
        recoveryShowMetric: true,
        recoveryShowValue: true,
        recoveryShowThreshold: false,
        recoveryThemeColor: "#22c55e",
        recoveryBadgeText: "RESOLVED",
        recoveryTitleText: "Resource Stabilized",
        recoverySubtitleText: "The resource has returned to a normal state.",
        footerText: "Sent via {{company}} Monitoring Stack",
        layoutTheme: "light",
        logoUrl: "",
        companyName: "",
    });

    const [previewStatus, setPreviewStatus] = useState<"ALERT" | "RECOVERY">("ALERT");

    const alertTypes = [
        { id: "Server", label: "Server Alerts", description: "Templates for CPU, Memory, and Storage alerts." },
        { id: "Database", label: "Database Alerts", description: "Templates for Database storage and connection alerts." },
        { id: "Web", label: "Web Monitor Alerts", description: "Templates for Web status, response time, and SSL alerts." },
        { id: "Cluster", label: "Cluster Alerts", description: "Templates for K8s cluster CPU and Memory alerts." },
        { id: "Domain", label: "Domain Alerts", description: "Templates for Domain name expiry alerts." },
    ];

    const [expandedSections, setExpandedSections] = useState<string[]>(["content", "metrics"]);
    const toggleSection = (section: string) => {
        setExpandedSections((prev: string[]) =>
            prev.includes(section) ? prev.filter((s: string) => s !== section) : [...prev, section]
        );
    };

    const getC = (key: string) => {
        const isRecovery = previewStatus === "RECOVERY";
        const recoveryKeys = ["showLogo", "showCompany", "showFooter", "showBadge", "showTitle", "showSubtitle", "showProject", "showResource", "showMetric", "showValue", "showThreshold", "themeColor", "badgeText", "titleText", "subtitleText"];
        const fullKey = (isRecovery && recoveryKeys.includes(key)) ? `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
        return simpleConfig[fullKey] !== undefined ? simpleConfig[fullKey] : simpleConfig[key];
    };

    const setV = (key: string, val: any) => {
        const isRecovery = previewStatus === "RECOVERY";
        const recoveryKeys = ["showLogo", "showCompany", "showFooter", "showBadge", "showTitle", "showSubtitle", "showProject", "showResource", "showMetric", "showValue", "showThreshold", "themeColor", "badgeText", "titleText", "subtitleText"];
        if (isRecovery && recoveryKeys.includes(key)) {
            const fullKey = `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}`;
            setSimpleConfig((prev: any) => ({ ...prev, [fullKey]: val }));
        } else {
            setSimpleConfig((prev: any) => ({ ...prev, [key]: val }));
        }
    };

    const LAYOUT_PRESETS = [
        {
            id: 'light',
            name: 'Modern Light',
            icon: Sparkles,
            desc: 'Standard clean light-mode experience',
            config: { layoutTheme: 'light', showBadge: true, showTitle: true, showSubtitle: true, showProject: true, showResource: true, showMetric: true, showValue: true, showThreshold: true }
        },
        {
            id: 'dark',
            name: 'Modern Dark',
            icon: Shield,
            desc: 'Sleek dark-mode experience for contrast',
            config: { layoutTheme: 'dark', showBadge: true, showTitle: true, showSubtitle: true, showProject: true, showResource: true, showMetric: true, showValue: true, showThreshold: true }
        }
    ];

    const generateSimpleHtml = (config: any, forcedMode?: "ALERT" | "RECOVERY") => {
        const isDomain = editingType === "Domain";
        const isRecovery = (forcedMode || previewStatus) === "RECOVERY";

        const getV = (key: string) => {
            const fullKey = isRecovery ? `recovery${key.charAt(0).toUpperCase()}${key.slice(1)}` : key;
            const val = config[fullKey] !== undefined ? config[fullKey] : config[key];
            if (val === undefined) {
                if (key === 'logoUrl') return projectSettings?.logoUrl;
                if (key === 'companyName') return projectSettings?.companyName;
            }
            return val;
        };

        const primaryColor = isRecovery ? config.recoveryThemeColor : (isDomain ? "#f59e0b" : config.themeColor || "#dc2626");
        const badgeBg = isRecovery ? "#f0fdf4" : (isDomain ? "#fffbeb" : "#fef2f2");
        const badgeBorder = isRecovery ? "#dcfce7" : (isDomain ? "#fef3c7" : "#fee2e2");

        const getUnit = (label: string) => {
            if (isDomain) return "";
            if (label.toLowerCase().includes("cpu") || label.toLowerCase().includes("memory") || label.toLowerCase().includes("usage")) return "%";
            return "";
        };

        const rows = [
            getV('showProject') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Project:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">{{project}}</td></tr>`,
            getV('showResource') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Domain' : 'Resource'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">{{resource}}</td></tr>`,
            getV('showMetric') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Status' : 'Metric'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">${isDomain ? 'Expiring Soon' : '{{type}}'}</td></tr>`,
            isDomain && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Expiry Date:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">{{expiry_date}}</td></tr>`,
            getV('showValue') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Days Remaining' : 'Current Value'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">${isDomain ? '{{days_left}}' : '{{value}}'}${getUnit("Value")}</td></tr>`,
            getV('showThreshold') && !isDomain && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Threshold:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: #64748b; font-weight: bold;">{{threshold}}${getUnit("Threshold")}</td></tr>`,
        ].filter(Boolean).join('');

        const theme = config.layoutTheme || 'light';
        const isDark = theme === 'dark';
        const bgColor = isDark ? '#0f172a' : '#ffffff';
        const textColor = isDark ? '#f8fafc' : '#0f172a';
        const mutedColor = isDark ? '#94a3b8' : '#64748b';
        const borderColor = isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0';
        const contentBg = isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc';
        const contentBorder = isDark ? 'rgba(255,255,255,0.05)' : '#f1f5f9';

        const brandHeader = ((getV('logoUrl') && getV('showLogo')) || (getV('companyName') && getV('showCompany'))) ? (
            `<table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                <tr>
                    <td style="text-align: left; vertical-align: middle;">
                        ${(getV('logoUrl') && getV('showLogo')) ? '{{logo}}' : ''}
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                        ${(getV('companyName') && getV('showCompany')) ? `<span style="color: ${textColor}; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">{{company_name}}</span>` : ''}
                    </td>
                </tr>
            </table>`
        ) : '';

        const footerMarkup = config.showFooter ? `<div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid ${contentBorder}; text-align: center; color: ${mutedColor}; font-size: 11px; font-weight: 500;">${config.footerText}</div>` : '';

        return `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 16px;">
    ${brandHeader}
    <div style="text-align: center; margin-bottom: 32px;">
        ${getV('showBadge') ? `<div style="display: inline-block; padding: 8px 16px; background-color: ${badgeBg}; border: 1px solid ${badgeBorder}; border-radius: 99px; color: ${primaryColor}; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">${isRecovery ? config.recoveryBadgeText : config.badgeText}</div>` : ''}
        ${getV('showTitle') ? `<h1 style="margin: 16px 0 8px; color: ${textColor}; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">${isRecovery ? config.recoveryTitleText : config.titleText}</h1>` : ''}
        ${getV('showSubtitle') ? `<p style="margin: 0; color: ${mutedColor}; font-size: 16px;">${isRecovery ? config.recoverySubtitleText : config.subtitleText}</p>` : ''}
    </div>
    <div style="padding: 24px; background-color: ${contentBg}; border-radius: 12px; border: 1px solid ${contentBorder};">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: ${textColor};">
            ${rows.replace(/#eee/g, isDark ? 'rgba(255,255,255,0.1)' : '#eee')}
        </table>
    </div>
    ${footerMarkup}
</div>`.trim();
    };

    useEffect(() => {
        if (isSimpleMode && editingType) {
            const alertBody = generateSimpleHtml(simpleConfig, "ALERT");
            const recoveryBody = generateSimpleHtml(simpleConfig, "RECOVERY");
            const persistentConfig = { ...simpleConfig, alertSubject, recoverySubject };
            const combined = `<!-- ALERT_START -->\n${alertBody}\n<!-- ALERT_END -->\n<!-- RECOVERY_START -->\n${recoveryBody}\n<!-- RECOVERY_END -->\n\n<!-- SIMPLE_CONFIG: ${JSON.stringify(persistentConfig)} -->`;
            setEditBody(combined);
        }
    }, [simpleConfig, isSimpleMode, editingType, alertSubject, recoverySubject, projectSettings]);

    const handleEdit = (type: string) => {
        const template = templates?.find(t => t.alertType === type);
        const body = template?.body || "";
        const configMatch = body.match(/<!-- SIMPLE_CONFIG: (.*) -->/);

        if (configMatch) {
            try {
                const config = JSON.parse(configMatch[1]);
                setSimpleConfig({ themeColor: "#6366f1", ...config });
                if (config.alertSubject) setAlertSubject(config.alertSubject);
                if (config.recoverySubject) setRecoverySubject(config.recoverySubject);
                setIsSimpleMode(true);
            } catch (e) { setIsSimpleMode(false); }
        } else {
            setIsSimpleMode(!body);
            if (!body) {
                setSimpleConfig((prev: any) => ({
                    ...prev,
                    badgeText: type === "Domain" ? "Expiry Warning" : "Critical Alert",
                    titleText: type === "Domain" ? "Domain Expiry Alert" : "High usage detected",
                    subtitleText: type === "Domain" ? "One of your domains is about to expire." : "Your infrastructure requires immediate attention.",
                }));
                setAlertSubject(`Alert: High {{type}} on {{resource}}`);
                setRecoverySubject(`Fixed: {{type}} on {{resource}} stabilized`);
            } else {
                setAlertSubject(template?.subject || `Alert: High {{type}} on {{resource}}`);
                setRecoverySubject(`Fixed: {{type}} on {{resource}} stabilized`);
            }
        }
        setEditingType(type);
        setEditBody(body);
        setViewMode("edit");
    };

    const handleSave = (shouldClose = true) => {
        if (!editingType) return;
        updateTemplate.mutate({
            alertType: editingType,
            data: { subject: alertSubject, body: editBody }
        }, {
            onSuccess: () => {
                toast({ title: "Template Saved", description: projectId ? "Project override persisted." : "Global template updated." });
                if (shouldClose) {
                    setEditingType(null);
                }
            }
        });
    };

    const handleReset = () => {
        if (!editingType || !projectId) return;
        deleteTemplate.mutate(editingType, {
            onSuccess: () => {
                toast({ title: "Reset Successful", description: "Reverted to global template defaults." });
                setEditingType(null);
            }
        });
    };

    if (isLoading) return <div className="text-center py-8">Loading templates...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alertTypes.map((type) => {
                    const template = templates?.find(t => t.alertType === type.id);
                    const isOverride = !!(projectId && template?.projectId === projectId);
                    const isInherited = !!(projectId && template && !template.projectId);
                    
                    return (
                        <Card key={type.id} className="relative overflow-hidden group hover:shadow-lg transition-all border-border/40">
                            <div className="absolute top-0 right-0 p-4 flex gap-2">
                                {isOverride && (
                                    <span className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded-full border border-amber-500/20 text-[9px] font-black uppercase">Project Override</span>
                                )}
                                {isInherited && (
                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-600 rounded-full border border-blue-500/20 text-[9px] font-black uppercase">Inherited</span>
                                )}
                                {!projectId && template && (
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase">Global master</span>
                                )}
                                {!template && (
                                    <span className="px-2 py-1 bg-muted text-muted-foreground/60 rounded-full border border-border/40 text-[9px] font-black uppercase">Default</span>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle className="text-lg font-bold">{type.label}</CardTitle>
                                <CardDescription className="text-xs">{type.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full rounded-xl font-bold" variant="outline" onClick={() => handleEdit(type.id)}>
                                    {(isOverride || !projectId) ? "Edit Template" : "Customize Override"}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
                <DialogContent className="max-w-[98vw] w-[1600px] h-[98vh] flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-xl rounded-[3rem] border-none shadow-[0_0_100px_rgba(0,0,0,0.1)] gap-0">
                    <DialogHeader className="pt-8 px-8 pb-6 border-b shrink-0 flex flex-row items-center justify-between bg-white h-auto">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-500/10">
                                <Mail className="h-7 w-7" />
                            </div>
                            <div className="flex flex-col">
                                <DialogTitle className="text-3xl font-black tracking-tight text-slate-900 capitalize leading-none mb-1">Configure {editingType} Alerts</DialogTitle>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-0.5 mt-1">Interactive Email Template Designer</p>
                            </div>
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="rounded-2xl h-12 px-6 font-black uppercase tracking-widest text-[9px] flex items-center gap-3 border-2 border-indigo-500/10 hover:border-indigo-500/30 hover:bg-indigo-50/30 text-indigo-600 transition-all shadow-sm">
                                    <Info className="h-4 w-4" />
                                    Available Variables
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0 rounded-[2rem] border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] bg-white overflow-hidden ring-1 ring-black/5" side="bottom" align="end">
                                <div className="p-5 bg-indigo-600 text-white">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Dynamic Placeholders</h4>
                                    <p className="text-[11px] font-medium opacity-90 leading-tight">Use these variables to inject live data from your projects and resources.</p>
                                </div>
                                <div className="p-4 space-y-1 bg-white">
                                    {[
                                        { v: '{{project}}', d: 'Project Name' },
                                        { v: '{{resource}}', d: 'Target Resource Name' },
                                        { v: '{{type}}', d: 'Alert Metric Type' },
                                        { v: '{{value}}', d: 'Current Violating Value' },
                                        { v: '{{threshold}}', d: 'Configured Alert Threshold' },
                                        { v: '{{company_name}}', d: 'Global Brand Name' },
                                        { v: '{{logo}}', d: 'Brand Logo Image' },
                                    ].map(item => (
                                        <div key={item.v} className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors group border border-transparent hover:border-slate-100">
                                            <code className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg group-hover:scale-105 transition-transform">{item.v}</code>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.d}</span>
                                        </div>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </DialogHeader>

                    <div className="flex-1 flex overflow-hidden bg-white gap-0">
                        {/* Editor Controls */}
                        <div className="flex-[0_0_540px] pt-6 px-8 pb-8 overflow-y-auto overflow-x-hidden border-r border-slate-200 scrollbar-none flex flex-col gap-8 bg-white">
                            <Tabs defaultValue="design" className="mt-0">
                                <TabsList className="grid w-full grid-cols-2 bg-slate-200/40 p-1.5 rounded-3xl h-16 border-none gap-2 overflow-hidden mb-10">
                                    <TabsTrigger 
                                        value="design" 
                                        className="rounded-2xl h-full data-[state=active]:bg-white data-[state=active]:shadow-[0_4px_20px_rgba(0,0,0,0.08)] data-[state=active]:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 group border border-transparent data-[state=active]:border-slate-200/50 hover:bg-white/40"
                                    >
                                        <Palette className="w-4 h-4 opacity-70 group-data-[state=active]:opacity-100 group-data-[state=active]:scale-110 transition-transform" />
                                        Design
                                    </TabsTrigger>
                                    <TabsTrigger 
                                        value="content" 
                                        className="rounded-2xl h-full data-[state=active]:bg-white data-[state=active]:shadow-[0_4px_20px_rgba(0,0,0,0.08)] data-[state=active]:text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-3 group border border-transparent data-[state=active]:border-slate-200/50 hover:bg-white/40"
                                    >
                                        <Type className="w-4 h-4 opacity-70 group-data-[state=active]:opacity-100 group-data-[state=active]:scale-110 transition-transform" />
                                        Content
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="design" className="space-y-8 mt-0 outline-none animate-in fade-in duration-500">
                                    {/* BRANDING & IDENTITY */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-6 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branding & Layout</Label>
                                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className={cn("flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border bg-white shadow-sm", getC('showLogo') ? "border-indigo-500/30 ring-1 ring-indigo-500/5" : "border-slate-200/60 opacity-60")}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                                        <ImageIcon className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Logo</span>
                                                </div>
                                                <Switch checked={getC('showLogo')} onCheckedChange={(v) => setV('showLogo', v)} className="data-[state=checked]:bg-indigo-600" />
                                            </div>
                                            <div className={cn("flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border bg-white shadow-sm", getC('showCompany') ? "border-indigo-500/30 ring-1 ring-indigo-500/5" : "border-slate-200/60 opacity-60")}>
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
                                                        <Building2 className="h-4 w-4" />
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Brand</span>
                                                </div>
                                                <Switch checked={getC('showCompany')} onCheckedChange={(v) => setV('showCompany', v)} className="data-[state=checked]:bg-indigo-600" />
                                            </div>
                                        </div>

                                        {projectId && (
                                            <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Custom Logo URL (Project Override)</Label>
                                                    <Input 
                                                        value={simpleConfig.logoUrl} 
                                                        onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, logoUrl: e.target.value }))} 
                                                        placeholder="https://example.com/logo.png"
                                                        className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500/20 transition-all font-medium text-xs" 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Custom Brand Name (Project Override)</Label>
                                                    <Input 
                                                        value={simpleConfig.companyName} 
                                                        onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, companyName: e.target.value }))} 
                                                        placeholder="Acme Corp"
                                                        className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500/20 transition-all font-medium text-xs" 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* EMAIL THEMES */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-4 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email Themes</Label>
                                            <div className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-500/20">Design</div>
                                        </div>
                                        <div className="space-y-3">
                                            {LAYOUT_PRESETS.map(p => (
                                                <Button
                                                    key={p.id}
                                                    variant="ghost"
                                                    className={cn(
                                                        "w-full h-auto p-4 rounded-[1.5rem] flex items-center justify-between group transition-all duration-300 border-2",
                                                        getC('layoutTheme') === p.id 
                                                            ? "bg-white border-indigo-500/60 shadow-xl shadow-indigo-500/5" 
                                                            : "bg-white/40 border-transparent hover:bg-white hover:border-slate-200/60"
                                                    )}
                                                    onClick={() => setV('layoutTheme', p.id)}
                                                >
                                                    <div className="flex items-center gap-4 text-left">
                                                        <div className={cn(
                                                            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                                                            getC('layoutTheme') === p.id 
                                                                ? "bg-indigo-600 text-white shadow-indigo-200" 
                                                                : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            <p.icon className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <h4 className={cn("font-black text-xs uppercase tracking-tight", getC('layoutTheme') === p.id ? "text-indigo-600" : "text-slate-700")}>{p.name}</h4>
                                                            <p className="text-[10px] font-medium text-slate-400 leading-tight">{p.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "h-6 w-6 rounded-full flex items-center justify-center border-2 transition-all",
                                                        getC('layoutTheme') === p.id 
                                                            ? "bg-indigo-600 border-indigo-600 text-white scale-110" 
                                                            : "border-slate-200"
                                                    )}>
                                                        {getC('layoutTheme') === p.id && <Check className="h-3 w-3" strokeWidth={4} />}
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* THEME AESTHETICS */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-5 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Theme Aesthetics</Label>
                                        <div className="flex items-center gap-4 flex-wrap px-1">
                                            {[
                                                { id: 'red', val: '#ef4444' },
                                                { id: 'blue', val: '#6366f1' },
                                                { id: 'purple', val: '#c026d3' },
                                                { id: 'emerald', val: '#10b981' },
                                                { id: 'amber', val: '#f59e0b' },
                                                { id: 'slate', val: '#0f172a' },
                                            ].map(color => (
                                                <button
                                                    key={color.id}
                                                    className={cn(
                                                        "h-10 w-10 rounded-2xl transition-all duration-300 shadow-lg hover:scale-110 active:scale-95 flex items-center justify-center",
                                                        getC('themeColor') === color.val ? "scale-110 ring-4 ring-indigo-500/20 shadow-indigo-500/10" : "opacity-80 hover:opacity-100"
                                                    )}
                                                    style={{ backgroundColor: color.val }}
                                                    onClick={() => setV('themeColor', color.val)}
                                                >
                                                    {getC('themeColor') === color.val && <Check className="h-4 w-4 text-white stroke-[4px]" />}
                                                </button>
                                            ))}
                                            <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center group hover:border-indigo-500 transition-colors cursor-pointer relative shadow-sm">
                                                <input
                                                    type="color"
                                                    value={getC('themeColor')}
                                                    onChange={(e) => setV('themeColor', e.target.value)}
                                                    className="absolute inset-0 h-full w-full border-none bg-transparent cursor-pointer opacity-0 z-10"
                                                />
                                                <Palette className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                            </div>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="content" className="space-y-8 mt-0 outline-none animate-in fade-in duration-500">
                                    {/* EMAIL WELL */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-5 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</Label>
                                            <div className={cn(
                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                                                previewStatus === 'ALERT' 
                                                    ? "bg-red-500/10 text-red-600 border-red-500/20" 
                                                    : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                            )}>
                                                {previewStatus} Mode
                                            </div>
                                        </div>

                                        <div className="space-y-4 bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Subject Line</Label>
                                                <Input 
                                                    value={previewStatus === 'ALERT' ? alertSubject : recoverySubject} 
                                                    onChange={(e) => previewStatus === 'ALERT' ? setAlertSubject(e.target.value) : setRecoverySubject(e.target.value)} 
                                                    placeholder={previewStatus === 'ALERT' ? "CRITICAL: Resource Failure..." : "RESOLVED: Resource Stabilized..."}
                                                    className="h-11 rounded-xl bg-slate-50 border-transparent focus:border-indigo-500/20 focus:bg-white transition-all font-bold text-xs" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* MESSAGING CONTENT WELL */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-5 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Messaging Content</Label>
                                        <div className="space-y-4">
                                            {/* Badge */}
                                            <div className={cn("flex flex-col gap-3 p-4 rounded-3xl transition-all duration-300 border bg-white shadow-sm", getC('showBadge') ? "border-indigo-500/30 ring-1 ring-indigo-500/5" : "border-slate-200/60 opacity-60")}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Display Badge</span>
                                                    <Switch checked={getC('showBadge')} onCheckedChange={(v) => setV('showBadge', v)} className="scale-75 data-[state=checked]:bg-indigo-600" />
                                                </div>
                                                {getC('showBadge') && (
                                                    <Input 
                                                        value={previewStatus === 'ALERT' ? simpleConfig.badgeText : simpleConfig.recoveryBadgeText}
                                                        onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, [previewStatus === 'ALERT' ? 'badgeText' : 'recoveryBadgeText']: e.target.value }))}
                                                        className="h-8 rounded-lg text-[9px] font-bold bg-slate-50 border-slate-200 uppercase tracking-tight"
                                                    />
                                                )}
                                            </div>

                                            {/* Heading */}
                                            <div className={cn("flex flex-col gap-3 p-4 rounded-3xl transition-all duration-300 border bg-white shadow-sm", getC('showTitle') ? "border-indigo-500/30 ring-1 ring-indigo-500/5" : "border-slate-200/60 opacity-60")}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Main Heading</span>
                                                    <Switch checked={getC('showTitle')} onCheckedChange={(v) => setV('showTitle', v)} className="scale-75 data-[state=checked]:bg-indigo-600" />
                                                </div>
                                                {getC('showTitle') && (
                                                    <Input 
                                                        value={previewStatus === 'ALERT' ? simpleConfig.titleText : simpleConfig.recoveryTitleText} 
                                                        onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, [previewStatus === 'ALERT' ? 'titleText' : 'recoveryTitleText']: e.target.value }))} 
                                                        className="h-8 rounded-lg text-[9px] font-black bg-slate-50 border-slate-200 uppercase tracking-tight"
                                                    />
                                                )}
                                            </div>

                                            {/* Description */}
                                            <div className={cn("flex flex-col gap-3 p-4 rounded-3xl transition-all duration-300 border bg-white shadow-sm", getC('showSubtitle') ? "border-indigo-500/30 ring-1 ring-indigo-500/5" : "border-slate-200/60 opacity-60")}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Description Text</span>
                                                    <Switch checked={getC('showSubtitle')} onCheckedChange={(v) => setV('showSubtitle', v)} className="scale-75 data-[state=checked]:bg-indigo-600" />
                                                </div>
                                                {getC('showSubtitle') && (
                                                    <Input 
                                                        value={previewStatus === 'ALERT' ? simpleConfig.subtitleText : simpleConfig.recoverySubtitleText} 
                                                        onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, [previewStatus === 'ALERT' ? 'subtitleText' : 'recoverySubtitleText']: e.target.value }))} 
                                                        className="h-8 rounded-lg text-[9px] font-medium bg-slate-50 border-slate-200"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* COMPONENT VISIBILITY WELL */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-5 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Alert Details Visibility</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { key: 'showProject', label: 'Project' },
                                                { key: 'showResource', label: 'Resource' },
                                                { key: 'showMetric', label: 'Metric Type' },
                                                { key: 'showValue', label: 'Current Value' },
                                                { key: 'showThreshold', label: 'Threshold' }
                                            ].map(opt => (
                                                <div key={opt.key} className={cn("flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border bg-white shadow-sm", getC(opt.key) ? "border-emerald-500/30 ring-1 ring-emerald-500/5" : "border-slate-200/60 opacity-60")}>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{opt.label}</span>
                                                    <Switch checked={getC(opt.key)} onCheckedChange={(v) => setV(opt.key, v)} className="scale-75 data-[state=checked]:bg-emerald-600" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* FOOTER WELL */}
                                    <div className="bg-slate-50/50 rounded-[2rem] border border-slate-200/50 p-6 space-y-4 transition-all duration-500 hover:border-indigo-500/20 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
                                        <div className="flex items-center justify-between px-1">
                                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Footer Attribution</Label>
                                            <Switch checked={getC('showFooter')} onCheckedChange={(v) => setV('showFooter', v)} className="data-[state=checked]:bg-indigo-600" />
                                        </div>
                                        {getC('showFooter') && (
                                            <div className="animate-in fade-in slide-in-from-top-2 duration-300 px-1">
                                                <Input
                                                    value={simpleConfig.footerText}
                                                    onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, footerText: e.target.value }))}
                                                    className="h-11 rounded-xl bg-white border-slate-200 focus:border-indigo-500/20 shadow-sm font-medium text-[10px] text-slate-500 italic"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                            </Tabs>
                            <div className="mt-auto pt-6 border-t border-slate-200 flex items-center justify-between gap-2">
                                <div className="flex gap-2">
                                    <Button variant="ghost" className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px] border-2 border-slate-100 hover:bg-white transition-all shadow-sm" onClick={() => setEditingType(null)}>Discard</Button>
                                    {projectId && templates?.find(t => t.alertType === editingType)?.projectId === projectId && (
                                        <Button variant="ghost" className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px] text-rose-500 hover:bg-rose-50/50 hover:text-rose-600 transition-all border-2 border-transparent hover:border-rose-100/50 flex items-center gap-2" onClick={handleReset}>
                                            <Trash2 className="h-4 w-4 opacity-70" />
                                            Reset
                                        </Button>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="rounded-xl h-10 px-4 font-black uppercase tracking-widest text-[9px] bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100 transition-all border-2" onClick={() => handleSave(false)}>Save</Button>
                                    <Button className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[9px] bg-indigo-600 shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 transition-all" onClick={() => handleSave(true)}>Submit</Button>
                                </div>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="flex-1 bg-slate-50 pt-6 px-8 pb-8 flex flex-col gap-8 overflow-hidden items-center justify-start">
                            <div className="w-full max-w-full xl:max-w-[850px] flex items-center justify-between h-14 shrink-0">
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Live Preview</span>
                                    <div className="flex items-center gap-2">
                                        <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", previewStatus === "ALERT" ? "bg-rose-500" : "bg-emerald-500")} />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{previewStatus} STATE</span>
                                    </div>
                                </div>
                                <div className="flex p-1.5 bg-slate-200/50 rounded-2xl border border-slate-300/30 backdrop-blur-sm shadow-sm ring-1 ring-white/50">
                                    <Button variant={previewStatus === "ALERT" ? "default" : "ghost"} size="sm" onClick={() => setPreviewStatus("ALERT")} className={cn("rounded-xl font-black uppercase tracking-widest text-[9px] px-8 h-10 transition-all duration-300", previewStatus === "ALERT" && "bg-white text-rose-500 shadow-xl shadow-rose-500/5 hover:bg-white")}>Alert</Button>
                                    <Button variant={previewStatus === "RECOVERY" ? "default" : "ghost"} size="sm" onClick={() => setPreviewStatus("RECOVERY")} className={cn("rounded-xl font-black uppercase tracking-widest text-[9px] px-8 h-10 transition-all duration-300", previewStatus === "RECOVERY" && "bg-white text-emerald-500 shadow-xl shadow-emerald-500/5 hover:bg-white")}>Recovery</Button>
                                </div>
                            </div>

                            {/* Browser Mockup */}
                            <div className="w-full max-w-full xl:max-w-[850px] bg-slate-900 rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden border border-white/10 flex flex-col transform hover:scale-[1.01] transition-all duration-500">
                                {/* Browser Header */}
                                <div className="px-6 py-4 bg-[#1e293b] border-b border-white/5 flex items-center gap-6">
                                    <div className="flex gap-1.5">
                                        <div className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                                        <div className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                                        <div className="h-3 w-3 rounded-full bg-[#27c93f]" />
                                    </div>
                                    <div className="flex-1 bg-black/40 rounded-xl px-4 py-2.5 border border-white/5 flex items-center justify-between overflow-hidden">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className="text-[#64748b] text-[10px] font-bold uppercase tracking-widest shrink-0">Subject:</span>
                                            <span className="text-white/80 text-[11px] font-medium truncate">{previewStatus === 'ALERT' ? alertSubject : recoverySubject}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Content Container */}
                                <div className="flex-1 bg-slate-100/50 p-8 overflow-y-auto scrollbar-none min-h-[500px] ring-1 ring-black/5 rounded-[1.5rem]">
                                    <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden mx-auto transition-all duration-500">
                                        <div dangerouslySetInnerHTML={{ __html: generateSimpleHtml(simpleConfig).replace(/{{project}}/g, "Demo Project").replace(/{{resource}}/g, "Demo Server").replace(/{{type}}/g, "CPU Usage").replace(/{{value}}/g, previewStatus === "ALERT" ? "86" : "12").replace(/{{threshold}}/g, "80").replace(/{{company_name}}/g, projectSettings?.companyName || "Big Oh Tech").replace(/{{logo}}/g, `<img src="${projectSettings?.logoUrl || 'https://antigravity-demo.s3.amazonaws.com/logo-placeholder.png'}" style="max-height:40px">`) }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
