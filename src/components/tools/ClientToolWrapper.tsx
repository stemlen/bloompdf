"use client";

import dynamic from "next/dynamic";
import type { Tool } from "@/lib/tools";

const ToolShell = dynamic(() => import("./ToolShell").then(m => m.ToolShell), { ssr: false });

interface Props {
  tool: Tool;
}

export function ClientToolWrapper({ tool }: Props) {
  return <ToolShell tool={tool} />;
}
