"use client";

interface LogFiltersProps {
  provider: string;
  onProviderChange: (v: string) => void;
}

export function LogFilters({ provider, onProviderChange }: LogFiltersProps) {
  return (
    <div className="flex gap-3">
      <select
        value={provider}
        onChange={(e) => onProviderChange(e.target.value)}
        className="flex h-8 w-[180px] items-center rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
      >
        <option value="all">All Providers</option>
        <option value="anthropic">Anthropic</option>
        <option value="openai">OpenAI</option>
      </select>
    </div>
  );
}
