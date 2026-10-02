import { Gauge } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
        <Gauge className="size-5" />
      </span>
      <span className="text-xl font-bold tracking-tight">{APP_NAME}</span>
    </div>
  );
}
