import type { PosObraItem } from "../app/components/unitTypes";

export function parsePosObra(raw: string | null): PosObraItem[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
