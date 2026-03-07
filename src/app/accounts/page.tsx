"use client";

import { Suspense, useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AccountList } from "@/components/accounts/account-list";
import { AccountForm } from "@/components/accounts/account-form";
import { toast } from "sonner";

function OAuthToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const oauth = searchParams.get("oauth");
    if (oauth === "success") {
      toast.success("Account added via OAuth");
      window.history.replaceState({}, "", "/accounts");
    } else if (oauth === "error") {
      const reason = searchParams.get("reason") || "unknown";
      toast.error(`OAuth failed: ${reason}`);
      window.history.replaceState({}, "", "/accounts");
    }
  }, [searchParams]);

  return null;
}

export default function AccountsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <Header
        title="Account Management"
        subtitle="Manage your API accounts and settings"
        action={<AccountForm onCreated={() => setRefreshKey((k) => k + 1)} />}
      />
      <div className="px-6">
        <Suspense>
          <OAuthToast />
        </Suspense>
        <AccountList refreshKey={refreshKey} />
      </div>
    </div>
  );
}
