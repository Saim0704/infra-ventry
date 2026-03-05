import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateDomainMonitor } from "@/hooks/use-domain-monitors";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Globe } from "lucide-react";

interface AddDomainDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: number;
}

export function AddDomainDialog({ open, onOpenChange, projectId }: AddDomainDialogProps) {
    const { toast } = useToast();
    const [domain, setDomain] = useState("");
    const createDomainMonitor = useCreateDomainMonitor();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!domain) {
            toast({ title: "Please enter a domain name", variant: "destructive" });
            return;
        }

        let formattedDomain = domain.trim().toLowerCase();

        // Remove http/https if present
        if (formattedDomain.startsWith('http://')) {
            formattedDomain = formattedDomain.substring(7);
        } else if (formattedDomain.startsWith('https://')) {
            formattedDomain = formattedDomain.substring(8);
        }

        // Remove trailing paths
        formattedDomain = formattedDomain.split('/')[0];

        try {
            await createDomainMonitor.mutateAsync({
                projectId,
                domain: formattedDomain
            });

            toast({ title: "Domain monitor added successfully" });
            setDomain("");
            onOpenChange(false);
        } catch (error) {
            toast({ title: "Failed to add domain monitor", variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-background/95 backdrop-blur-md border-border/50 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5 text-indigo-500" />
                        Add Domain Monitor
                    </DialogTitle>
                    <DialogDescription>
                        Monitor domain expiration effectively. You will be alerted before expiration based on your project settings.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="domain">Domain Name</Label>
                            <Input
                                id="domain"
                                placeholder="e.g. example.com"
                                value={domain}
                                onChange={(e) => setDomain(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={createDomainMonitor.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={createDomainMonitor.isPending || !domain}
                            className="bg-indigo-500 hover:bg-indigo-600 font-bold"
                        >
                            {createDomainMonitor.isPending ? "Adding..." : "Start Monitoring"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
