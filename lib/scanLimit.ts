import { supabase } from "./supabase";

export async function getTodayScanCount(userId: string) {
  const startOfDay = new Date();

  startOfDay.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from("scans")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("user_id", userId)
    .gte("created_at", startOfDay.toISOString());

  if (error) {
    console.warn("Could not read scan count", error);
    return 0;
  }

  return count || 0;
}