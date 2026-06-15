import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/app/lib/dal";
import { NewProjectChat } from "@/app/ui/new-project-chat";

export default async function NewProjectPage() {
  await requireUser("/login");

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/dashboard"
        className="flex w-fit items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Projects
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">New project</h1>
      <div className="mt-6">
        <NewProjectChat />
      </div>
    </div>
  );
}
