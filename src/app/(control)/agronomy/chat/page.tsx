import { requireSession } from "@modules/auth";
import { Navbar } from "@/components/navigation/navbar";
import { AgronomyChat } from "@modules/agronomy/ui/agronomy-chat";

export const dynamic = "force-dynamic";

export default async function AgronomyChatPage() {
  const session = await requireSession();
  if (session.role !== "AGRONOMIST" && session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <h1>Access Restricted</h1>
          <p className="error">Only agronomists can access field messages.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ maxWidth: "100%", padding: "14px 20px 32px" }}>
        <AgronomyChat currentUserId={session.userId} />
      </main>
    </>
  );
}
