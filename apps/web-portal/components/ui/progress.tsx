'use client';

import { Progress as ProgressPrimitive } from '@base-ui/react/progress';
import { cn } from '@/lib/utils';

function Progress({
  className,
  value = 0,
  ...props
}: ProgressPrimitive.Root.Props) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn('flex w-full items-center', className)}
      {...props}
    >
      <ProgressPrimitive.Track
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted"
        data-slot="progress-track"
      >
        <ProgressPrimitive.Indicator
          className="h-full bg-primary transition-all"
          data-slot="progress-indicator"
        />
      </ProgressPrimitive.Track>
    </ProgressPrimitive.Root>
  );
}

export { Progress };
