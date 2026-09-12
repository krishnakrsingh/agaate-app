import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoginForm } from "@/components/login-form";
import { AgronomyShowcasePanel } from "@/components/agronomy-showcase-panel";

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
        @media (max-width: 820px) {
          .agaate-login-screen {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            width: 100vw;
            height: 100vh;
            height: 100dvh;
            padding: 6px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 8px;
            overflow-y: auto;
            scrollbar-width: none;
          }
          .agaate-login-screen::-webkit-scrollbar {
            display: none;
          }
          .agaate-login-left {
            flex: 1 1 0;
            width: 100%;
            min-height: 0;
            padding: clamp(14px, 2.5vw, 22px) clamp(16px, 3.5vw, 24px);
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
          .agaate-login-right {
            flex: 0 0 auto;
            width: 100%;
            height: clamp(250px, 34vh, 320px);
            min-height: 0;
            border-radius: 18px;
            overflow: hidden;
            position: relative;
          }
          .agaate-showcase-panel {
            justify-content: space-between !important;
            padding: clamp(16px, 3.5vw, 24px) !important;
            border-radius: 18px !important;
          }
          .agaate-showcase-top {
            margin: 0 !important;
            max-width: 100% !important;
          }
          .agaate-showcase-top h2 {
            font-size: clamp(19px, 4.6vw, 24px) !important;
            line-height: 1.22 !important;
            letter-spacing: -0.025em !important;
            margin-bottom: 6px !important;
          }
          .agaate-showcase-top p {
            font-size: clamp(12.5px, 2.9vw, 14px) !important;
            line-height: 1.45 !important;
            max-width: 98% !important;
            color: rgba(255, 255, 255, 0.85) !important;
          }
          .showcase-bottom-quote {
            display: flex !important;
            padding-top: 10px !important;
          }
          .showcase-bottom-quote > div {
            font-size: clamp(12.5px, 2.8vw, 14px) !important;
            letter-spacing: -0.01em !important;
            margin-bottom: 3px !important;
          }
          .showcase-bottom-quote > p {
            font-size: clamp(11px, 2.4vw, 12.5px) !important;
            line-height: 1.4 !important;
            max-width: 98% !important;
            color: rgba(255, 255, 255, 0.75) !important;
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
