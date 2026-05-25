import { supabase } from "./supabase";

export const storage = {
  async get(key: string): Promise<{ value: string } | null> {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();
    if (error) console.error("storage.get error:", error);
    return data ? { value: data.value } : null;
  },

  async set(key: string, value: string): Promise<void> {
    const { error } = await supabase
      .from("app_storage")
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) console.error("storage.set error:", error);
  },
};
