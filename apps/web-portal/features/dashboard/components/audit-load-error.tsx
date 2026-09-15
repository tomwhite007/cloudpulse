import { Button } from '@/components/ui/button';

export function AuditLoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const errorMessage = error instanceof Error ? error.message : 'The auditor API request failed.';

  return (
    <section
      aria-labelledby="audit-error-heading"
      className="rounded-xl bg-card/80 p-6 ring-1 ring-rose-500/20"
    >
      <h2 id="audit-error-heading" className="text-sm font-semibold tracking-tight">
        Unable to load audit data
      </h2>
      <p role="alert" className="mt-2 text-sm text-muted-foreground">
        {errorMessage}
      </p>
      <Button type="button" variant="outline" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </section>
  );
}
