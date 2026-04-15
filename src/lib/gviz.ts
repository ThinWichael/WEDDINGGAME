import { SHEET_ID } from "./config";

interface GvizCell {
  v: string | number | boolean | null;
  f?: string;
}

interface GvizRow {
  c: (GvizCell | null)[];
}

interface GvizColumn {
  id: string;
  label: string;
  type: string;
}

interface GvizTable {
  cols: GvizColumn[];
  rows: GvizRow[];
}

interface GvizResponse {
  status: "ok" | "error";
  table?: GvizTable;
  errors?: { message: string }[];
}

export interface GvizOptions {
  sheet: string;
  query?: string;
  headers?: number;
}

/**
 * Fetch rows from a published Google Sheet via the gviz endpoint.
 * Returns an array of row objects keyed by column label.
 * The sheet must be shared as "Anyone with the link can view".
 */
export async function gvizFetch<T extends Record<string, unknown>>(
  options: GvizOptions
): Promise<T[]> {
  const { sheet, query, headers = 1 } = options;
  const params = new URLSearchParams({
    tqx: "out:json",
    sheet,
    headers: String(headers),
  });
  if (query) params.set("tq", query);
  params.set("_t", String(Date.now()));

  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`gviz fetch failed: ${res.status}`);
  const text = await res.text();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("gviz: unexpected response format");
  const json: GvizResponse = JSON.parse(text.substring(start, end + 1));

  if (json.status !== "ok" || !json.table) {
    const msg = json.errors?.[0]?.message ?? "unknown gviz error";
    throw new Error(`gviz error: ${msg}`);
  }

  const cols = json.table.cols.map((c) => c.label || c.id);
  return json.table.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    cols.forEach((col, i) => {
      const cell = row.c[i];
      obj[col] = cell?.v ?? "";
    });
    return obj as T;
  });
}
