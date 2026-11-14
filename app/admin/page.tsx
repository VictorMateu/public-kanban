import { redirect } from "next/navigation";
import { requireAdministrator } from "../../lib/auth/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdministrator();
  redirect("/projects");
}
