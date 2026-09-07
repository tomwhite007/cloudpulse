import { Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

export function CopilotPlaceholder() {
  return (
    <aside className="h-full" aria-label="FinOps AI Copilot placeholder">
      <Card className="h-full min-h-[28rem] border-dashed bg-card/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 ring-1 ring-sky-500/20">
              <Sparkles className="size-4 text-sky-300" aria-hidden="true" />
            </span>
            FinOps AI Copilot (GenUI)
          </CardTitle>
          <CardDescription>
            Reserved for Day 4. Conversational remediation, Terraform previews,
            and generative UI will land in this pane.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Separator />
          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-16 w-full" />
          </div>
          <div className="ml-6 space-y-3 rounded-lg border border-sky-500/20 bg-sky-500/5 p-3">
            <Skeleton className="h-3 w-20 bg-sky-500/20" />
            <Skeleton className="h-12 w-full bg-sky-500/15" />
          </div>
          <p className="text-xs text-muted-foreground">
            Ask the copilot to explain waste, draft a resize plan, or queue a
            1-click action without leaving the dashboard.
          </p>
        </CardContent>
      </Card>
    </aside>
  );
}
