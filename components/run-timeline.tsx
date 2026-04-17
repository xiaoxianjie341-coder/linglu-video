import type { ReactNode } from "react";

interface RunTimelineProps {
  children: ReactNode;
}

export function RunTimeline({ children }: RunTimelineProps) {
  return <div className="space-y-6 pb-40">{children}</div>;
}
