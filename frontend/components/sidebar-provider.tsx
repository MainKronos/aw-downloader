"use client";

import { useState } from "react";
import { SidebarProvider as ShadcnSidebarProvider } from "@/components/ui/sidebar";

export function SidebarProvider({
  children,
  ...props
}: React.ComponentProps<typeof ShadcnSidebarProvider>) {
  const [open, setOpen] = useState(false);

  return (
    <ShadcnSidebarProvider open={open} onOpenChange={setOpen} {...props}>
      {children}
    </ShadcnSidebarProvider>
  );
}
