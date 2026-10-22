import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({ label, value, hint, icon: Icon, trend, accent }) {
  const trendPositive = trend?.direction === "up";

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>
          {Icon ? (
            <span
              className={cn(
                "flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground",
                accent,
              )}
            >
              <Icon className="size-4.5" />
            </span>
          ) : null}
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {value}
          </p>
          {(hint || trend) && (
            <div className="flex items-center gap-1.5 text-xs">
              {trend ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    trendPositive ? "text-success" : "text-destructive",
                  )}
                >
                  {trendPositive ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {trend.value}
                </span>
              ) : null}
              {hint ? (
                <span className="text-muted-foreground">{hint}</span>
              ) : null}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
