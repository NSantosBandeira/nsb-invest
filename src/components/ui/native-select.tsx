import { cn } from "@/lib/utils";

type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function NativeSelect({ className, children, ...props }: NativeSelectProps) {
  return (
    <select
      className={cn(
        "flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}
