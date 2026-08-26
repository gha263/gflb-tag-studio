// ─────────────────────────────────────────────────────────────────────────────
// lib/supabase.ts
// Single source of truth for Supabase REST access across Look 47 Studio.
// All tabs (Tag Studio, Intake, Review, Frames) import sb / sbAll from here.
// ─────────────────────────────────────────────────────────────────────────────

export const SUPABASE_URL = "https://rsslbgfbdoqxgogbuuzc.supabase.co";
export const SUPABASE_KEY =
  "sb_publishable_Za4xbjnaWzvebzzuZMDPPA_MuSaDXRe";

// Shared headers — every REST call needs both apikey AND Authorization: Bearer.
export const H = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

// Standard fetch helper. Subject to PostgREST's default per-request row cap
// (1000 rows). Use for individual reads, writes, and any query where you
// have a specific `limit=` in the path or know the result is small.
export const sb = async (path: string, opts: any = {}) => {
  const { prefer, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      ...H,
      Prefer: prefer ?? "return=representation",
    },
    ...rest,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

// Exhaustive fetch — paginates through the entire result set regardless of
// table size, bypassing PostgREST's per-request row cap. Use for reference
// tables that populate typeaheads (people, brands, credit_roles, etc.)
// where a silent truncation would let the UI offer "+ Create" for a name
// that actually already exists and blow up on the unique constraint.
//
// Pagination uses HTTP Range: 0-999, 1000-1999, ... and stops when a page
// returns fewer rows than requested. No caller has to think about page size
// or write their own Range header.
export const sbAll = async (path: string): Promise<any[]> => {
  const pageSize = 1000;
  const results: any[] = [];
  let offset = 0;
  // Hard cap on iterations as a paranoia guard against an infinite loop
  // (would only trigger if PostgREST returns a full page indefinitely,
  // which shouldn't happen — but 500,000 rows is well past anything this
  // codebase would legitimately fetch through a typeahead helper).
  const maxIterations = 500;
  for (let i = 0; i < maxIterations; i++) {
    const rangeStart = offset;
    const rangeEnd = offset + pageSize - 1;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: {
        ...H,
        "Range-Unit": "items",
        "Range": `${rangeStart}-${rangeEnd}`,
      },
    });
    if (!res.ok) throw new Error(await res.text());
    const text = await res.text();
    const page: any[] = text ? JSON.parse(text) : [];
    results.push(...page);
    if (page.length < pageSize) break;
    offset += pageSize;
  }
  return results;
};

// Fetch the set of look IDs that carry a given tag.
// Includes both human-tagged and AI-approved (Ring 1 auto-applied).
// This powers Browse mode, Frames look counts, and tag filter in Tag Studio.
export const fetchLookIdsForTag = async (tagId: string): Promise<Set<string>> => {
  const rows = await sbAll(
    `entity_tags?tag_id=eq.${tagId}&entity_type=eq.look&select=entity_id,source,status&order=entity_id`
  );
  return new Set<string>(
    (rows || [])
      .filter((r: any) => r.source === "human" || (r.source === "ai" && r.status === "approved"))
      .map((r: any) => r.entity_id as string)
  );
};
