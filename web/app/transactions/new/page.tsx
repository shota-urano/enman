import RequireAuth from "@/components/auth/RequireAuth";
import TransactionForm from "@/components/TransactionForm";

export default function NewTransactionPage() {
  return (
    <RequireAuth>
      <div className="mx-auto max-w-5xl px-4 pb-24 pt-8 md:px-8">
        <TransactionForm />
      </div>
    </RequireAuth>
  );
}
