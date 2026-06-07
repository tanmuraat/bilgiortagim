import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-10 w-full rounded-lg border border-[#2A2A2A] bg-[#141414] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#737373] transition-colors outline-none file:border-0 file:bg-transparent file:text-sm focus-visible:border-[#E02424] focus-visible:ring-2 focus-visible:ring-[#E02424]/25 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
