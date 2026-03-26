import { useState, useEffect } from "react";
import { useProjectEmailTemplates, useUpdateProjectEmailTemplate, useDeleteProjectEmailTemplate, useProjectAlertSettings } from "@/hooks/use-project-settings";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Mail, Info, Terminal, Sparkles, Shield, ImageIcon, Building2, Send, CheckCircle2, Trash2, Check, Save, Layout, Palette, Type, MessageSquare, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailTemplateDesignerProps {
    projectId?: number | null;
}

export function EmailTemplateDesigner({ projectId = null }: EmailTemplateDesignerProps) {
    const { data: templates, isLoading } = useProjectEmailTemplates(projectId);
    const { data: projectSettings } = useProjectAlertSettings(projectId || 0);
    const updateTemplate = useUpdateProjectEmailTemplate(projectId);
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
        badgeText: "Critical Alert",
        titleText: "High usage detected",
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
        recoveryBadgeText: "RECOVERY",
        recoveryTitleText: "Resource Stabilized",
        recoverySubtitleText: "The resource has returned to a normal state.",
        footerText: "Sent via {{company}} Infrastructure Monitoring",
        layoutTheme: "modern", 
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
            return config[fullKey] !== undefined ? config[fullKey] : config[key];
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
            getV('showProject') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Project:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{project}}</td></tr>`,
            getV('showResource') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Domain' : 'Resource'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">{{resource}}</td></tr>`,
            getV('showMetric') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Status' : 'Metric'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">${isDomain ? 'Expiring Soon' : '{{type}}'}</td></tr>`,
            isDomain && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>Expiry Date:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${primaryColor}; font-weight: bold;">{{expiry_date}}</td></tr>`,
            getV('showValue') && `<tr><td style="padding: 10px 0; border-bottom: 1px solid #eee;"><strong>${isDomain ? 'Days Remaining' : 'Current Value'}:</strong></td><td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right; color: ${isRecovery ? config.recoveryThemeColor : '#ef4444'}; font-weight: bold;">${isDomain ? '{{days_left}}' : '{{value}}'}${getUnit("Value")}</td></tr>`,
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

        const brandHeader = ((projectSettings?.logoUrl && getV('showLogo')) || (projectSettings?.companyName && getV('showCompany'))) ? (
            `<table style="width: 100%; border-collapse: collapse; margin-bottom: 32px;">
                <tr>
                    <td style="text-align: left; vertical-align: middle;">
                        ${(projectSettings?.logoUrl && getV('showLogo')) ? '{{logo}}' : ''}
                    </td>
                    <td style="text-align: right; vertical-align: middle;">
                        ${(projectSettings?.companyName && getV('showCompany')) ? `<span style="color: ${textColor}; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">{{company_name}}</span>` : ''}
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

    const handleSave = () => {
        if (!editingType) return;
        updateTemplate.mutate({
            alertType: editingType,
            data: { subject: alertSubject, body: editBody }
        }, {
            onSuccess: () => {
                toast({ title: "Template Saved", description: "Changes persisted globally." });
                setEditingType(null);
            }
        });
    };

    if (isLoading) return <div className="text-center py-8">Loading templates...</div>;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {alertTypes.map((type) => {
                    const hasCustom = templates?.some(t => t.alertType === type.id && (projectId ? t.projectId === projectId : !t.projectId));
                    return (
                        <Card key={type.id} className="relative overflow-hidden group hover:shadow-lg transition-all border-border/40">
                             <div className="absolute top-0 right-0 p-4">
                                {hasCustom ? (
                                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-black uppercase">Customized</span>
                                ) : (
                                    <span className="px-2 py-1 bg-muted text-muted-foreground/60 rounded-full border border-border/40 text-[9px] font-black uppercase">Default</span>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle className="text-lg font-bold">{type.label}</CardTitle>
                                <CardDescription className="text-xs">{type.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full rounded-xl font-bold" variant="outline" onClick={() => handleEdit(type.id)}>
                                    {hasCustom ? "Edit Template" : "Customize"}
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Dialog open={!!editingType} onOpenChange={(open) => !open && setEditingType(null)}>
                <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0 overflow-hidden bg-card/95 backdrop-blur-xl rounded-[2rem]">
                    <DialogHeader className="p-8 border-b shrink-0 flex flex-row items-center justify-between">
                        <div>
                            <DialogTitle className="text-2xl font-black">Design {editingType} Email</DialogTitle>
                            <DialogDescription>Customize the visual layout and content for this alert category.</DialogDescription>
                        </div>
                        <div className="flex gap-2">
                             <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setEditingType(null)}>Cancel</Button>
                             <Button className="rounded-xl font-bold px-8 shadow-lg shadow-primary/20" onClick={handleSave}>Save Design</Button>
                        </div>
                    </DialogHeader>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Editor Controls */}
                        <div className="w-1/2 p-8 overflow-y-auto border-r scrollbar-thin">
                            <Tabs defaultValue="design" className="space-y-8">
                                <TabsList className="w-full grid grid-cols-2 p-1 bg-muted/50 rounded-xl">
                                    <TabsTrigger value="design" className="rounded-lg font-bold">Visual Design</TabsTrigger>
                                    <TabsTrigger value="content" className="rounded-lg font-bold">Email Content</TabsTrigger>
                                </TabsList>

                                <TabsContent value="design" className="space-y-8 mt-0 outline-none">
                                    <div className="space-y-4">
                                         <Label className="text-xs font-black uppercase tracking-widest opacity-50">Theme & Style</Label>
                                         <div className="grid grid-cols-2 gap-4">
                                             {LAYOUT_PRESETS.map(p => (
                                                 <Button 
                                                    key={p.id} 
                                                    variant="outline" 
                                                    className={cn("h-auto p-4 flex flex-col items-start gap-2 rounded-2xl border-2 transition-all", simpleConfig.layoutTheme === p.id ? "border-primary bg-primary/5" : "border-border/40")}
                                                    onClick={() => setSimpleConfig((prev: any) => ({ ...prev, layoutTheme: p.id }))}
                                                 >
                                                     <p.icon className="h-4 w-4 text-primary" />
                                                     <div className="text-left">
                                                         <p className="font-bold text-sm">{p.name}</p>
                                                         <p className="text-[10px] opacity-60 leading-tight">{p.desc}</p>
                                                     </div>
                                                 </Button>
                                             ))}
                                         </div>
                                    </div>

                                    <div className="space-y-6">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-50">Activation Theme</Label>
                                        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border">
                                            <input type="color" value={simpleConfig.themeColor} onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, themeColor: e.target.value }))} className="h-10 w-10 rounded-lg cursor-pointer border-none bg-transparent" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold">Primary Brand Color</p>
                                                <p className="text-[10px] opacity-60 italic">Affects buttons, badges, and highlights in alerts.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-50">Visibility Toggles</Label>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { key: "showBadge", label: "Status Badge", icon: Shield },
                                                { key: "showTitle", label: "Main Title", icon: Type },
                                                { key: "showProject", label: "Project ID", icon: Layout },
                                                { key: "showResource", label: "Resource Name", icon: Shield }
                                            ].map(item => (
                                                <div key={item.key} className="flex items-center justify-between p-4 bg-background border rounded-2xl">
                                                    <div className="flex items-center gap-2">
                                                        <item.icon className="h-3 w-3 opacity-50" />
                                                        <span className="text-xs font-medium">{item.label}</span>
                                                    </div>
                                                    <Switch checked={simpleConfig[item.key]} onCheckedChange={(v) => setSimpleConfig((prev: any) => ({ ...prev, [item.key]: v }))} />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="content" className="space-y-8 mt-0 outline-none">
                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-50">Email Subjects</Label>
                                        <div className="space-y-4 p-6 bg-muted/30 rounded-2xl border border-dashed">
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold opacity-60 uppercase">Alert Subject Line</Label>
                                                <Input value={alertSubject} onChange={(e) => setAlertSubject(e.target.value)} className="h-11 rounded-xl bg-background border-border/40 font-bold" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-[10px] font-bold opacity-60 uppercase">Recovery Subject Line</Label>
                                                <Input value={recoverySubject} onChange={(e) => setRecoverySubject(e.target.value)} className="h-11 rounded-xl bg-background border-border/40 font-bold" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Label className="text-xs font-black uppercase tracking-widest opacity-50">Dynamic Content Titles</Label>
                                        <div className="grid grid-cols-1 gap-4">
                                             <div className="space-y-2">
                                                <Label className="text-[10px] font-bold opacity-60 uppercase">Activation Heading</Label>
                                                <Input value={simpleConfig.titleText} onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, titleText: e.target.value }))} className="h-11 rounded-xl bg-background border-border/40 font-semibold" />
                                             </div>
                                             <div className="space-y-2">
                                                <Label className="text-[10px] font-bold opacity-60 uppercase">Recovery Heading</Label>
                                                <Input value={simpleConfig.recoveryTitleText} onChange={(e) => setSimpleConfig((prev: any) => ({ ...prev, recoveryTitleText: e.target.value }))} className="h-11 rounded-xl bg-background border-border/40 font-semibold" />
                                             </div>
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Preview */}
                        <div className="flex-1 bg-muted/30 p-8 flex flex-col gap-4 overflow-hidden">
                             <div className="flex items-center justify-between bg-background p-2 rounded-2xl border shadow-sm">
                                 <div className="flex p-1 bg-muted rounded-xl">
                                     <Button variant={previewStatus === "ALERT" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewStatus("ALERT")} className="rounded-lg font-bold px-6">Activation</Button>
                                     <Button variant={previewStatus === "RECOVERY" ? "secondary" : "ghost"} size="sm" onClick={() => setPreviewStatus("RECOVERY")} className="rounded-lg font-bold px-6">Recovery</Button>
                                 </div>
                             </div>
                             <div className="flex-1 bg-white rounded-[2rem] border shadow-inner p-8 overflow-y-auto scrollbar-none">
                                 <div dangerouslySetInnerHTML={{ __html: generateSimpleHtml(simpleConfig).replace(/{{project}}/g, "Demo Project").replace(/{{resource}}/g, "Demo Server").replace(/{{type}}/g, "CPU Usage").replace(/{{value}}/g, previewStatus === "ALERT" ? "86" : "12").replace(/{{threshold}}/g, "80").replace(/{{company_name}}/g, projectSettings?.companyName || "InfraWatch").replace(/{{logo}}/g, `<img src="${projectSettings?.logoUrl || 'https://antigravity-demo.s3.amazonaws.com/logo-placeholder.png'}" style="max-height:30px">`) }} />
                             </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
