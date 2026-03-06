"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/header";
import { AccountList } from "@/components/accounts/account-list";
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
  return (
    <div>
      <Header title="Accounts" />
      <div className="p-6">
        <Suspense>
          <OAuthToast />
        </Suspense>
        <AccountList />
      </div>
    </div>
  );
}
