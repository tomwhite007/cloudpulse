import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <Skeleton className="h-16 w-full motion-reduce:animate-none" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 w-full motion-reduce:animate-none" />
          <Skeleton className="h-28 w-full motion-reduce:animate-none" />
          <Skeleton className="h-28 w-full motion-reduce:animate-none" />
          <Skeleton className="h-28 w-full motion-reduce:animate-none" />
        </div>
        <Skeleton className="h-64 w-full motion-reduce:animate-none" />
      </div>
    </div>
  );
}
