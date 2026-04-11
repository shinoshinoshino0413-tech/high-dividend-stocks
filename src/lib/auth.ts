import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!
    })
  ],
  pages: {
    signIn: "/auth/signin"
  },
  callbacks: {
    authorized({ auth: session }) {
      const allowedEmails = process.env.ALLOWED_EMAILS?.split(",").map((e) => e.trim()) ?? [];
      if (allowedEmails.length === 0) return !!session?.user;
      return !!session?.user?.email && allowedEmails.includes(session.user.email);
    }
  }
});
