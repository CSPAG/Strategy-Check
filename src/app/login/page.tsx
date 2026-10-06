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
    <div className="mx-auto max-w-xl py-6 sm:py-12">
      <p className="kicker mb-4">CSPstrategie 2026+</p>
      <h1 className="titel">
        Strategie-Check.
        <br />
        <span className="text-csp-grau-titel">Wo steht Ihr Team?</span>
      </h1>
      <p className="fliesstext mt-6">
        Melden Sie sich mit Ihrem CSP-Konto an, um die Selbsteinschätzung für Ihr Team
        durchzuführen.
      </p>
      <form
        className="mt-8"
        action={async () => {
          "use server";
          await signIn("keycloak", { redirectTo: callbackUrl });
        }}
      >
        <button type="submit" className="btn-primaer px-7 py-3.5 text-[15px]">
          Mit CSP-Konto anmelden →
        </button>
      </form>
      <div className="mt-14 flex gap-2" aria-hidden>
        {["bg-csp-rot", "bg-csp-gelb", "bg-csp-gruen", "bg-csp-blau"].map((c) => (
          <span key={c} className={`h-3 w-3 rounded-full ${c}`} />
        ))}
      </div>
    </div>
  );
}
