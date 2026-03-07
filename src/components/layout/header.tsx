"use client";

import React, { type ReactNode } from "react";

export function Header({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: ReactNode }): React.JSX.Element {
  return (
    <header className="flex items-start justify-between px-6 py-6 lg:px-8">
      <div>
        <h2 className="text-3xl font-bold gradient-text">{title}</h2>
        {subtitle && <p className="text-muted-foreground mt-2">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
