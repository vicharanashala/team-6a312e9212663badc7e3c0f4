import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: number | string;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  variant?: "default" | "warning" | "danger" | "success";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  variant = "default",
}: StatCardProps) {
  const variantStyles = {
    default: "bg-card",
    warning: "bg-amber-50/50 border-amber-200",
    danger: "bg-red-50/50 border-red-200",
    success: "bg-green-50/50 border-green-200",
  };

  const iconStyles = {
    default: "bg-primary text-primary-foreground",
    warning: "bg-amber-500 text-white",
    danger: "bg-destructive text-white",
    success: "bg-green-500 text-white",
  };

  return (
    <Card className={cn("border shadow-sm", variantStyles[variant], className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div
                className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "+" : "-"}
                {trend.value}% from last week
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-lg", iconStyles[variant])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}