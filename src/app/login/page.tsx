import { signIn } from "@/auth";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-csp-navy">CSP Strategie Selbsteinschätzung</h1>
      <p className="mt-2 text-sm text-gray-600">
        Melden Sie sich mit Ihrem Microsoft-Konto (CSP) an, um die Selbsteinschätzung für
        Ihr Team durchzuführen.
      </p>
      <form
        className="mt-6"
        action={async () => {
          "use server";
          await signIn("microsoft-entra-id", { redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-csp-cyan px-4 py-3 font-medium text-white hover:opacity-90"
        >
          Mit Microsoft anmelden
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-400">
        Periode H2 2026 · CSPstrategie 2026+
      </p>
    </div>
  );
}
