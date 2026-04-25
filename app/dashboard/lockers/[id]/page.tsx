import LockerForm from "@/components/LockerForm";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = {
  params: { id: string };
  searchParams: { saved?: string };
};

export default async function EditLockerPage({ params, searchParams }: Props) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: locker, error: lockerError } = await supabase
    .from("lockers")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (lockerError || !locker || locker.seller_id !== user.id) {
    redirect("/");
  }

  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("locker_id", locker.id)
    .order("number", { ascending: true });

  return (
    <LockerForm
      mode="edit"
      initialLocker={locker}
      initialItems={items ?? []}
      savedFromCreate={searchParams.saved === "1"}
    />
  );
}
