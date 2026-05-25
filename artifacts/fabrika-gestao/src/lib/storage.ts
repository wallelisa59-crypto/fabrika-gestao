import { supabase } from "./supabase";

export const storage = {
  async get(key: string): Promise<{ value: string } | null> {
    const { data, error } = await supabase
      .from("app_storage")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error("Supabase read error:", error);
      // fallback: localStorage
      const local = localStorage.getItem(key);
      return local ? { value: local } : null;
    }

    if (data) {
      localStorage.setItem(key, data.value); // keep local in sync
      return { value: data.value };
    }

    // no row yet — check localStorage (migration from old data)
    const local = localStorage.getItem(key);
    return local ? { value: local } : null;
  },

  async set(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value); // instant local write

    const { error } = await supabase
      .from("app_storage")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      console.error("Supabase write error:", error);
    }
  },
};
