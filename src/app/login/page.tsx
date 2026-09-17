import { redirect } from "next/navigation";
import { getSession, clearSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { LoginForm } from "@modules/onboarding/ui/login-form";
import { AgronomyShowcasePanel } from "@modules/agronomy/ui/agronomy-showcase-panel";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, active: true },
    });
    if (user?.active) {
      redirect("/dashboard");
    } else {
      await clearSession();
    }
  }

  return (
    <>
      <style>{`
        .agaate-login-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          padding: 6px;
          box-sizing: border-box;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          background-color: #f5f5f5;
          overflow: hidden;
          z-index: 1;
        }
        [data-theme="dark"] .agaate-login-screen {
          background-color: #070707;
        }
        .agaate-login-left {
          height: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: clamp(16px, 2.5vw, 32px);
          box-sizing: border-box;
          overflow-y: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .agaate-login-left::-webkit-scrollbar {
          display: none;
        }
        .agaate-login-right {
          height: 100%;
          min-width: 0;
          border-radius: 20px;
          overflow: hidden;
          position: relative;
          box-shadow: 0 12px 36px rgba(0, 0, 0, 0.25);
        }
        .showcase-bottom-quote {
          display: flex;
        }
        @media (max-width: 1024px) {
          .agaate-login-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            padding: 8px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            overflow-y: auto;
            scrollbar-width: none;
          }
          .agaate-login-screen::-webkit-scrollbar {
            display: none;
          }
          .agaate-login-left {
            flex: 1;
            width: 100%;
            min-height: 100%;
            padding: clamp(16px, 4vw, 32px) clamp(16px, 4vw, 24px);
            border-radius: 18px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            overflow-y: auto;
            scrollbar-width: none;
          }
          .agaate-login-left::-webkit-scrollbar {
            display: none;
          }
          .agaate-login-right,
          .agaate-showcase-panel {
            display: none !important;
          }
        }
      `}</style>

      <main className="agaate-login-screen">
        {/* Left Side: 50% Clean ID & Password Login Form */}
        <div className="agaate-login-left">
          <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", display: "flex", flexDirection: "column" }}>
            <LoginForm />
          </div>
        </div>

        {/* Right Side: 50% Clean GrainGradient Showcase */}
        <div className="agaate-login-right">
          <AgronomyShowcasePanel />
        </div>
      </main>
    </>
  );
}
