import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from '@/lib/utils';

function Progress({
  className,
  value = 0,
  trackClassName,
  indicatorClassName,
  ...props
}: ProgressPrimitive.Root.Props & { trackClassName?: string; indicatorClassName?: string }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn('flex w-full items-center', className)}
      {...props}
    >
      <ProgressPrimitive.Track
        className={cn(
          'relative h-1.5 w-full overflow-hidden rounded-full bg-muted',
          trackClassName,
        )}
        data-slot="progress-track"
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full bg-primary transition-all', indicatorClassName)}
          data-slot="progress-indicator"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
