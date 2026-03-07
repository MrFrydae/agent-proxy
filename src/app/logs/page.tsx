"use client";

import { useEffect, useState, useCallback } from "react";
import { Header } from "@/components/layout/header";
import { LogTable } from "@/components/logs/log-table";
import { LogFilters } from "@/components/logs/log-filters";
import type { RequestLog } from "@/types";

export default function LogsPage() {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [provider, setProvider] = useState("all");
  const limit = 50;

  const fetchLogs = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (provider !== "all") params.set("provider", provider);

    fetch(`/api/logs?${params}`)
      .then((r) => r.json())
      .then((r) => {
        setLogs(r.data || []);
        setTotal(r.total || 0);
      })
      .catch(() => {});
  }, [page, provider]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div>
      <Header title="Request Logs" subtitle="Monitor API requests and responses" />
      <div className="space-y-4 p-6">
        <LogFilters provider={provider} onProviderChange={(v) => { setProvider(v); setPage(1); }} />
        <LogTable logs={logs} page={page} total={total} limit={limit} onPageChange={setPage} />
      </div>
    </div>
  );
}
