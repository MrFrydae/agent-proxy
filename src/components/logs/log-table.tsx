"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { RequestLog } from "@/types";

interface LogTableProps {
  logs: RequestLog[];
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

function JsonBlock({ label, content }: { label: string; content: string | null }): React.JSX.Element | null {
  if (!content) return null;

  let formatted = content;
  try {
    formatted = JSON.stringify(JSON.parse(content), null, 2);
  } catch {
    // Not JSON, show raw
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <pre className="max-h-64 overflow-auto rounded-md border bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-all">
        {formatted}
      </pre>
    </div>
  );
}

function LogDetailRow({ log }: { log: RequestLog }): React.JSX.Element {
  const hasDetails = log.requestBody || log.requestHeaders || log.upstreamUrl || log.proxyHeaders || log.responseBody;

  if (!hasDetails) {
    return (
      <TableRow>
        <TableCell colSpan={8} className="bg-muted/30 px-8 py-4">
          <p className="text-sm text-muted-foreground">No request details available for this log entry.</p>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow>
      <TableCell colSpan={8} className="bg-muted/30 px-8 py-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Original Request</h4>
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">URL</span>
              <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">
                {log.method} {log.path}
              </div>
            </div>
            <JsonBlock label="Headers" content={log.requestHeaders} />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Proxied Request</h4>
            {log.upstreamUrl && (
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Upstream URL</span>
                <div className="rounded-md border bg-muted px-3 py-2 text-xs font-mono">
                  {log.method} {log.upstreamUrl}
                </div>
              </div>
            )}
            <JsonBlock label="Headers" content={log.proxyHeaders} />
          </div>

          <div className="space-y-3 md:col-span-2">
            <JsonBlock label="Request Payload" content={log.requestBody} />
          </div>

          {log.responseBody && (
            <div className="space-y-3 md:col-span-2">
              <JsonBlock label="Response Body" content={log.responseBody} />
            </div>
          )}

          {log.errorMessage && (
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-destructive">Error</label>
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-mono text-destructive">
                {log.errorMessage}
              </div>
            </div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function LogTable({ logs, page, total, limit, onPageChange }: LogTableProps): React.JSX.Element {
  const totalPages = Math.ceil(total / limit);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleRow = (id: string): void => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Time</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Latency</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  No logs yet
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-accent/5"
                      onClick={() => toggleRow(log.id)}
                    >
                      <TableCell className="w-8 px-2">
                        {isExpanded
                          ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(log.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.provider}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs font-mono">
                        {log.path}
                      </TableCell>
                      <TableCell className="text-xs">{log.model || "\u2014"}</TableCell>
                      <TableCell>
                        <Badge variant={log.statusCode < 400 ? "default" : "destructive"}>
                          {log.statusCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.inputTokens != null
                          ? `${log.inputTokens.toLocaleString()} / ${(log.outputTokens ?? 0).toLocaleString()}`
                          : "\u2014"}
                      </TableCell>
                      <TableCell className="text-xs">{log.latencyMs}ms</TableCell>
                    </TableRow>
                    {isExpanded && <LogDetailRow log={log} />}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {total} total entries
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center text-sm">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
