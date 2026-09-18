import { requireSession } from "@modules/auth";
import { OfficerChat } from "@modules/operations/ui/officer-chat";
import { Navbar } from "@/components/navigation/navbar";

export const dynamic = "force-dynamic";

export default async function OfficerChatPage() {
  const session = await requireSession();
  if (session.role !== "FARM_OFFICER") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <h1>Access Restricted</h1>
          <p className="error">Only farm officers can access this chat.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <OfficerChat currentUserId={session.userId} />
      </main>
    </>
  );
}
