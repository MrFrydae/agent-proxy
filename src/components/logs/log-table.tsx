"use client";

import React from "react";
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
import type { RequestLog } from "@/types";

interface LogTableProps {
  logs: RequestLog[];
  page: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function LogTable({ logs, page, total, limit, onPageChange }: LogTableProps): React.JSX.Element {
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Path</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tokens</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Failover</TableHead>
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
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs">
                    {new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.provider}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-xs font-mono">
                    {log.path}
                  </TableCell>
                  <TableCell className="text-xs">{log.model || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={log.statusCode < 400 ? "default" : "destructive"}>
                      {log.statusCode}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {log.inputTokens != null
                      ? `${log.inputTokens.toLocaleString()} / ${(log.outputTokens ?? 0).toLocaleString()}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-xs">{log.latencyMs}ms</TableCell>
                  <TableCell>
                    {log.isFailover === 1 && <Badge variant="secondary">Yes</Badge>}
                  </TableCell>
                </TableRow>
              ))
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
