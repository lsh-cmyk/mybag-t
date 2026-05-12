import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SchedulesClient from "@/components/SchedulesClient";

export default async function SchedulesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  return <SchedulesClient />;
}
