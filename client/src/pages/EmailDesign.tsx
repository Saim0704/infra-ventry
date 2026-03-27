import { Shell } from "@/components/layout/Shell";
import { EmailTemplateDesigner } from "@/components/EmailTemplateDesigner";
import { Palette } from "lucide-react";

export default function EmailDesignPage() {
  return (
    <Shell>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 mt-2">
        <div>
          <h1 className="text-4xl font-display font-black tracking-tight bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-transparent uppercase">
            Global Email Design
          </h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium tracking-wide">
            Master templates and visual identity for all system-wide infrastructure alerts.
          </p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-lg shadow-primary/5">
          <Palette className="h-6 w-6" />
        </div>
      </div>

      <div className="space-y-6">
        <EmailTemplateDesigner projectId={null} />
      </div>
    </Shell>
  );
}
