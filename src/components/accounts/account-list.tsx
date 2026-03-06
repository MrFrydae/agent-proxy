"use client";

import { useEffect, useState, useCallback } from "react";
import { AccountCard } from "./account-card";
import { AccountForm } from "./account-form";
import type { AccountPublic } from "@/types";

export function AccountList() {
  const [accounts, setAccounts] = useState<AccountPublic[]>([]);

  const fetchAccounts = useCallback(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then(setAccounts)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const anthropicAccounts = accounts.filter((a) => a.provider === "anthropic");
  const openaiAccounts = accounts.filter((a) => a.provider === "openai");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        <AccountForm onCreated={fetchAccounts} />
      </div>

      {accounts.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
          No accounts yet. Add one to get started.
        </div>
      ) : (
        <div className="space-y-6">
          {anthropicAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Anthropic (Claude)</h3>
              {anthropicAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onUpdate={fetchAccounts}
                  onDelete={fetchAccounts}
                />
              ))}
            </div>
          )}
          {openaiAccounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">OpenAI (Codex)</h3>
              {openaiAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  onUpdate={fetchAccounts}
                  onDelete={fetchAccounts}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
