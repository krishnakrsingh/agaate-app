import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function HqSecurityPage() {
  redirect("/hq/profile");
}
