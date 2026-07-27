import { signIn } from "@/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const requestedCallback = (await searchParams).callbackUrl;
  const callbackUrl =
    requestedCallback?.startsWith("/") &&
    !requestedCallback.startsWith("//") &&
    !requestedCallback.startsWith("/login")
      ? requestedCallback
      : "/";

  return (
    <div className="mx-auto max-w-md rounded-xl border bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold text-csp-navy">CSP Strategie Selbsteinschätzung</h1>
      <p className="mt-2 text-sm text-gray-600">
        Melden Sie sich mit Ihrem CSP-Konto an, um die Selbsteinschätzung für Ihr Team
        durchzuführen.
      </p>
      <form
        className="mt-6"
        action={async () => {
          "use server";
          await signIn("keycloak", { redirectTo: callbackUrl });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-csp-cyan px-4 py-3 font-medium text-white hover:opacity-90"
        >
          Mit CSP-Konto anmelden
        </button>
      </form>
      <p className="mt-4 text-xs text-gray-400">
        Periode H2 2026 · CSPstrategie 2026+
      </p>
    </div>
  );
}
