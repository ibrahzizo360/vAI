import { cn } from "@/lib/utils"

interface NoteCompletenessIndicatorProps {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function NoteCompletenessIndicator({ 
  score, 
  size = "md", 
  className 
}: NoteCompletenessIndicatorProps) {
  const sizeClasses = {
    sm: "h-2 w-2",
    md: "h-3 w-3",
    lg: "h-4 w-4",
  };

  const color = score >= 80 
    ? "bg-green-500" 
    : score >= 60 
      ? "bg-yellow-500" 
      : "bg-red-500";

  return (
    <div className={cn(
      "rounded-full",
      sizeClasses[size],
      color,
      className
    )} />
  );
}