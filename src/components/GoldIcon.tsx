import { cn } from "../utils/cn";
import type { LucideIcon } from "lucide-react";

interface GoldIconProps {
  icon: LucideIcon;
  size?: number;
  className?: string;
}

export default function GoldIcon({ icon: Icon, size = 20, className }: GoldIconProps) {
  return (
    <Icon
      size={size}
      className={cn("text-foodiz-gold", className)}
      strokeWidth={1.5}
    />
  );
}
