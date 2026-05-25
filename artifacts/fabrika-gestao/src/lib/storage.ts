import { supabase } from "./supabase";

export const storage = {
  async get(key: string): Promise<{ value: string } | null> {
    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from("app_storage")
        .select("value")
        .eq("key", key)
        .maybeSingle();

      if (!error && data) {
        // Keep localStorage in sync
        localStorage.setItem(key, data.value);
        return { value: data.value };
      }
      if (error) {
        console.warn("Supabase read failed, using localStorage:", error.message);
      }
    } catch (e) {
      console.warn("Supabase unavailable, using localStorage:", e);
    }

    // Fallback to localStorage
    const local = localStorage.getItem(key);
    return local ? { value: local } : null;
  },

  async set(key: string, value: string): Promise<void> {
    // Always write to localStorage immediately (instant persistence)
    localStorage.setItem(key, value);

    // Also sync to Supabase (best effort)
    try {
      const { error } = await supabase
        .from("app_storage")
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: "key" }
        );
      if (error) {
        console.warn("Supabase write failed (data saved locally):", error.message);
      }
    } catch (e) {
      console.warn("Supabase unavailable (data saved locally):", e);
    }
  },
};
