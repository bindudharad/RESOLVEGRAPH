import { redirect } from "next/navigation";
import { getSessionContext } from "@/server/auth/session";

export const dynamic = "force-dynamic";

/**
 * Root Route '/'
 * Unambiguous canonical routing:
 * - Authenticated users are redirected to the Home Investigation Command Center: /dashboard
 * - Unauthenticated visitors are redirected to the public overview landing page: /overview
 */
export default async function RootPage() {
  const { user } = await getSessionContext();

  if (user) {
    redirect("/dashboard");
  } else {
    redirect("/overview");
  }
}
