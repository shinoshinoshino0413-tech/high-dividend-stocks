import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth, signOut } from "@/lib/auth";
import { UserMenu } from "@/components/user-menu";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "高配当株モニター",
  description: "日本株の配当金と株価を更新・監視するためのWebアプリ"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/auth/signin" });
  }

  return (
    <html lang="ja">
      <body>
        {session?.user && (
          <header className="flex items-center justify-end gap-3 px-4 py-3 sm:px-6">
            <UserMenu user={session.user} signOutAction={handleSignOut} />
          </header>
        )}
        {children}
      </body>
    </html>
  );
}
