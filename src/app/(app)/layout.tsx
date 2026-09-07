import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import Header from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex flex-col">
      <Header name={user.name} role={user.role} />
      <main className="flex-1 mx-auto w-full max-w-[1400px] px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}
