"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Users, AlertTriangle, XCircle } from "lucide-react";

interface StatsCardsProps {
  totalRequests: number;
  activeAccounts: number;
  failoverEvents: number;
  errorRate: number;
}

export function StatsCards({
  totalRequests, activeAccounts, failoverEvents, errorRate,
}: StatsCardsProps): React.JSX.Element {
  const cards = [
    { title: "Requests Today", value: totalRequests.toLocaleString(), icon: Activity, color: "text-blue-500" },
    { title: "Active Accounts", value: activeAccounts.toString(), icon: Users, color: "text-green-500" },
    { title: "Failover Events", value: failoverEvents.toLocaleString(), icon: AlertTriangle, color: "text-yellow-500" },
    { title: "Error Rate", value: `${errorRate}%`, icon: XCircle, color: "text-red-500" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
