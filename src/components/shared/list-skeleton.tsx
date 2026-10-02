import { Skeleton } from "@/components/ui/skeleton";

export function ListSkeleton({ rows = 3, className = "h-[74px]" }: { rows?: number; className?: string }) {
  return (
    <div className="grid gap-2" aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={`${className} rounded-xl`} />
      ))}
    </div>
  );
}
