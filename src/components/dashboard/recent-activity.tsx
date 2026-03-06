"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RequestLog } from "@/types";

export function RecentActivity({ logs }: { logs: RequestLog[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{log.provider}</Badge>
                  <span className="text-muted-foreground">{log.path}</span>
                  {log.model && <span className="text-xs text-muted-foreground">({log.model})</span>}
                </div>
                <div className="flex items-center gap-2">
                  {log.isFailover === 1 && <Badge variant="secondary">Failover</Badge>}
                  <Badge variant={log.statusCode < 400 ? "default" : "destructive"}>
                    {log.statusCode}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{log.latencyMs}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
