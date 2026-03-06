import { Header } from "@/components/layout/header";
import { AccountList } from "@/components/accounts/account-list";

export default function AccountsPage() {
  return (
    <div>
      <Header title="Accounts" />
      <div className="p-6">
        <AccountList />
      </div>
    </div>
  );
}
