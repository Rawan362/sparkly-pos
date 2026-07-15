import { supabase } from "./supabaseClient";

export async function logActivity(
  chatId: string,
  actorName: string,
  actionDescription: string
) {
  await supabase.from("activity_log").insert({
    chat_id: chatId,
    actor_name: actorName,
    action_description: actionDescription,
  });
}
