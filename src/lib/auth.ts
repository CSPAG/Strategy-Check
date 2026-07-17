import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

function getGlEmails(): Set<string> {
  const raw = process.env.GL_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  providers: [
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: `https://login.microsoftonline.com/${process.env.AUTH_MICROSOFT_ENTRA_ID_TENANT_ID}/v2.0`,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          include: { team: true },
        });
        const email = (session.user.email ?? "").toLowerCase();
        const isGl = getGlEmails().has(email) || dbUser?.role === "GL_VIEWER";

        session.user.id = user.id;
        session.user.role = isGl ? "GL_VIEWER" : (dbUser?.role ?? "TEAM_EDITOR");
        session.user.teamId = dbUser?.teamId ?? null;
        session.user.teamName = dbUser?.team?.name ?? null;
      }
      return session;
    },
  },
  session: { strategy: "database" },
});

export function isGlRole(role: string | undefined): boolean {
  return role === "GL_VIEWER" || role === "ADMIN";
}
