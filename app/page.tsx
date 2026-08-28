"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { sb, fetchLookIdsForTag } from "@/lib/supabase";
import { C, FONT_IMPORT } from "@/lib/theme";

const TAG_TYPE_ORDER = [
  "color", "form", "craft", "pattern", "design_language", "mood", "garment_types",
];

const TYPE_LABELS: {[key: string]: string} = {
  "color": "Color", "form": "Form", "craft": "Craft",
  "pattern": "Pattern", "design_language": "Design Language",
  "mood": "Mood", "garment_types": "Garment",
};

const EXCLUDED = ["brand","season","event","brand_category","brand_production","event_format"];

export default function TagStudio() {
  const [looks, setLooks] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [tagsByType, setTagsByType] = useState<Record<string,any[]>>({});
  const [idx, setIdx] = useState(() => { try { return parseInt(localStorage.getItem("ts_idx") || "0") || 0; } catch { return 0; } });
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [humanTagIds, setHumanTagIds] = useState<Set<string>>(new Set());
  const [aiApprovedTagIds, setAiApprovedTagIds] = useState<Set<string>>(new Set());
  const [primaryTagId, setPrimaryTagId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  const pendingLookId = useRef<string | null>(null);
  const [brandFilter, setBrandFilter] = useState(() => { try { return localStorage.getItem("ts_brand") || "all"; } catch { return "all"; } });
  const [statusFilter, setStatusFilter] = useState<string>(() => { try { return localStorage.getItem("ts_status") || "published"; } catch { return "published"; } });
  const [untaggedOnly, setUntaggedOnly] = useState(false);
  const [primaryOnly, setPrimaryOnly] = useState(() => { try { return localStorage.getItem("ts_primary_only") === "true"; } catch { return false; } });
  const [sortMode, setSortMode] = useState<"newest" | "oldest">(() => { try { return (localStorage.getItem("ts_sort") as any) || "newest"; } catch { return "newest"; } });
  const [taggedLookIds, setTaggedLookIds] = useState<Set<string>>(new Set());
  const [jumpInput, setJumpInput] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [imageMode, setImageMode] = useState<string | null>(null);
  const [savingImageMode, setSavingImageMode] = useState(false);

  // ── Tag filter (toolbar dropdown) ────────────────────────────────────────────
  const [tagFilterId, setTagFilterId] = useState("all");
  const [tagFilterLookIds, setTagFilterLookIds] = useState<Set<string> | null>(null);
  const [tagFilterLoading, setTagFilterLoading] = useState(false);

  // ── Browse mode ──────────────────────────────────────────────────────────────
  const [browseMode, setBrowseMode] = useState(false);
  const [browseTagIds, setBrowseTagIds] = useState<Set<string>>(new Set());
  const [lookIdCache, setLookIdCache] = useState<Record<string, Set<string>>>({});
  const [browseScrollPos, setBrowseScrollPos] = useState(0);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["color"]));
  const [tagCounts, setTagCounts] = useState<Record<string, number>>({});
  const [loadingCounts, setLoadingCounts] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let f = looks;
    if (statusFilter !== "all") f = f.filter(l => l.status === statusFilter);
    if (brandFilter === "__unattributed__") f = f.filter(l => !l.primaryBrandId);
    else if (brandFilter !== "all") f = f.filter(l => l.primaryBrandId === brandFilter);
    if (tagFilterLookIds !== null) f = f.filter(l => tagFilterLookIds.has(l.id));
    if (untaggedOnly) f = f.filter(l => !taggedLookIds.has(l.id));
    if (sortMode === "newest") f = [...f].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    if (sortMode === "oldest") f = [...f].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""));
    setFiltered(f);
    setIdx(i => Math.min(i, Math.max(0, f.length - 1)));
  }, [brandFilter, statusFilter, untaggedOnly, sortMode, tagFilterLookIds, looks, taggedLookIds]);

  // Read ?look= URL param once loading completes, set status filter if needed
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(window.location.search);
    const lookId = params.get("look");
    const lookStatus = params.get("status");
    if (!lookId) return;
    pendingLookId.current = lookId;
    if (lookStatus && lookStatus !== statusFilter) setStatusFilter(lookStatus);
  }, [loading]); // eslint-disable-line

  // Once filtered list updates, jump to pending look
  useEffect(() => {
    if (!pendingLookId.current) return;
    const i = filtered.findIndex(l => l.id === pendingLookId.current);
    if (i >= 0) {
      setIdx(i);
      pendingLookId.current = null;
    }
  }, [filtered]);

  useEffect(() => { try { localStorage.setItem("ts_idx", String(idx)); } catch {} }, [idx]);
  useEffect(() => { try { localStorage.setItem("ts_brand", brandFilter); } catch {} }, [brandFilter]);
  useEffect(() => { try { localStorage.setItem("ts_status", statusFilter); } catch {} }, [statusFilter]);
  useEffect(() => { try { localStorage.setItem("ts_sort", sortMode); } catch {} }, [sortMode]);
  useEffect(() => { try { localStorage.setItem("ts_primary_only", String(primaryOnly)); } catch {} }, [primaryOnly]);

  useEffect(() => {
    if (filtered[idx]) {
      loadTags(filtered[idx].id);
      setNotes(filtered[idx].notes || "");
      setEditingNotes(false);
      setImageMode(filtered[idx].image_mode || null);
    }
  }, [idx, filtered]);

  const next = useCallback(() => { if (idx < filtered.length - 1) setIdx(i => i + 1); }, [idx, filtered.length]);
  const prev = useCallback(() => { if (idx > 0) setIdx(i => i - 1); }, [idx]);

  const handleBrandFilter = (val: string) => { setBrandFilter(val); setIdx(0); };

  const handleTagFilter = async (tagId: string) => {
    setTagFilterId(tagId);
    setIdx(0);
    if (tagId === "all") {
      setTagFilterLookIds(null);
      return;
    }
    setTagFilterLoading(true);
    // Color tag + primaryOnly: query looks.grid_bucket_tag_id directly (Living
    // Grid semantics — only starred primaries, matches what would render in the
    // Grid bucket). Anything else falls back to the broad entity_tags filter.
    const isColor = (tagsByType["color"] || []).some((t: any) => t.id === tagId);
    let ids: Set<string>;
    if (isColor && primaryOnly) {
      const rows = await sb(`looks?grid_bucket_tag_id=eq.${tagId}&select=id`);
      ids = new Set<string>((rows || []).map((r: any) => r.id));
    } else {
      ids = lookIdCache[tagId] ?? await fetchLookIdsForTag(tagId);
      if (!lookIdCache[tagId]) {
        setLookIdCache(prev => ({ ...prev, [tagId]: ids }));
      }
    }
    setTagFilterLookIds(ids);
    setTagFilterLoading(false);
  };

  // Re-fetch the tag filter when primaryOnly toggles while a color tag is selected.
  // Non-color tags and "all" are unaffected — primaryOnly only reshapes color queries.
  useEffect(() => {
    if (tagFilterId === "all") return;
    const isColor = (tagsByType["color"] || []).some((t: any) => t.id === tagFilterId);
    if (!isColor) return;

    let cancelled = false;
    (async () => {
      setTagFilterLoading(true);
      try {
        let ids: Set<string>;
        if (primaryOnly) {
          const rows = await sb(`looks?grid_bucket_tag_id=eq.${tagFilterId}&select=id`);
          ids = new Set<string>((rows || []).map((r: any) => r.id));
        } else {
          ids = lookIdCache[tagFilterId] ?? await fetchLookIdsForTag(tagFilterId);
          if (!lookIdCache[tagFilterId]) {
            setLookIdCache(prev => ({ ...prev, [tagFilterId]: ids }));
          }
        }
        if (!cancelled) setTagFilterLookIds(ids);
      } catch (e) {
        console.error(e);
      }
      if (!cancelled) setTagFilterLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryOnly]);

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const n = parseInt(jumpInput) - 1;
    if (!isNaN(n) && n >= 0 && n < filtered.length) setIdx(n);
    setJumpInput("");
  };

  // ── Browse mode helpers ──────────────────────────────────────────────────────

  const getOrFetchIds = async (tagId: string): Promise<Set<string>> => {
    if (lookIdCache[tagId]) return lookIdCache[tagId];
    const ids = await fetchLookIdsForTag(tagId);
    setLookIdCache(prev => ({ ...prev, [tagId]: ids }));
    return ids;
  };

  const toggleBrowseTag = async (tagId: string) => {
    const next = new Set(browseTagIds);
    if (next.has(tagId)) {
      next.delete(tagId);
      setBrowseTagIds(next);
      return;
    }
    await getOrFetchIds(tagId);
    next.add(tagId);
    setBrowseTagIds(next);
  };

  const toggleExpandedType = async (type: string) => {
    const next = new Set(expandedTypes);
    if (next.has(type)) { next.delete(type); setExpandedTypes(next); return; }
    next.add(type);
    setExpandedTypes(next);
    const tags = (tagsByType[type] || []).filter((t: any) => tagCounts[t.id] === undefined);
    if (tags.length === 0) return;
    setLoadingCounts(prev => { const s = new Set(prev); tags.forEach((t: any) => s.add(t.id)); return s; });
    await Promise.all(tags.map(async (tag: any) => {
      const ids = await getOrFetchIds(tag.id);
      setTagCounts(prev => ({ ...prev, [tag.id]: ids.size }));
      setLoadingCounts(prev => { const s = new Set(prev); s.delete(tag.id); return s; });
    }));
  };

  const browseLooks = (() => {
    if (browseTagIds.size === 0) return filtered;
    const selectedIds = Array.from(browseTagIds);
    const sets = selectedIds.map(tid => lookIdCache[tid]).filter(Boolean);
    if (sets.length !== selectedIds.length) return filtered;
    return filtered.filter(l => sets.every(s => s.has(l.id)));
  })();

  const enterEditFromBrowse = (lookId: string) => {
    const grid = document.getElementById("browse-grid");
    if (grid) setBrowseScrollPos(grid.scrollTop);
    const i = filtered.findIndex(l => l.id === lookId);
    if (i >= 0) { setIdx(i); }
    else {
      const allIdx = looks.findIndex(l => l.id === lookId);
      if (allIdx >= 0) { handleBrandFilter("all"); setIdx(allIdx); }
    }
    setBrowseMode(false);
  };

  const returnToBrowse = () => {
    setBrowseMode(true);
    setTimeout(() => {
      const grid = document.getElementById("browse-grid");
      if (grid) grid.scrollTop = browseScrollPos;
    }, 50);
  };

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (["INPUT","SELECT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === "ArrowRight" || e.key === "l") next();
      if (e.key === "ArrowLeft" || e.key === "h") prev();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [next, prev]);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const [l, t, humanTagged, aiTagged] = await Promise.all([
        // credit_order was dropped from look_brand_credits by the Aug 2026
        // flip_designer_attribution migration — pull created_at instead so
        // the "primary brand" derived from credits[0] is deterministic
        // across renders (earliest INSERT wins, ties broken by brand_id).
        sb("looks?select=id,cloudinary_url,caption,season_display,source_url,notes,status,created_at,image_mode,look_brand_credits(brand_id,created_at,brands(id,name))&order=created_at.desc&limit=2000"),
        sb("tags?select=*&order=tag_type,name"),
        // Two separate queries to avoid row limit issues on large tables
        sb("entity_tags?entity_type=eq.look&source=eq.human&select=entity_id&limit=10000"),
        sb("entity_tags?entity_type=eq.look&source=eq.ai&status=eq.approved&select=entity_id&limit=10000"),
      ]);
      // Build brand name from primary look_brand_credits entry (earliest
      // created_at wins; brand_id lexicographic breaks ties for rows
      // inserted in the same batch that share a millisecond timestamp).
      const looksWithBrand = l.map((look: any) => {
        const credits = (look.look_brand_credits || []).slice().sort((a: any, b: any) => {
          const aC = a?.created_at || "";
          const bC = b?.created_at || "";
          if (aC !== bC) return aC.localeCompare(bC);
          return (a?.brand_id || "").localeCompare(b?.brand_id || "");
        });
        const primaryBrand = credits[0]?.brands || null;
        return { ...look, primaryBrandId: primaryBrand?.id || null, brands: { name: primaryBrand?.name || "" } };
      });
      const usable = t.filter((t: any) => !EXCLUDED.includes(t.tag_type));
      const grouped = usable.reduce((acc: Record<string,any[]>, tag: any) => {
        if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
        acc[tag.tag_type].push(tag);
        return acc;
      }, {});
      const taggedSet = new Set<string>([
        ...(humanTagged || []).map((r: any) => r.entity_id as string),
        ...(aiTagged || []).map((r: any) => r.entity_id as string),
      ]);
      // Derive brand list from loaded looks — only brands that actually have looks
      const brandsMap = new Map<string, string>();
      looksWithBrand.forEach((look: any) => {
        if (look.primaryBrandId && look.brands?.name) {
          brandsMap.set(look.primaryBrandId, look.brands.name);
        }
      });
      const derivedBrands = [...brandsMap.entries()]
        .map(([id, name]) => ({ id, name }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      setLooks(looksWithBrand);
      setFiltered(looksWithBrand);
      setBrands(derivedBrands);
      setTagsByType(grouped);
      setTaggedLookIds(taggedSet);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const loadTags = async (lookId: string) => {
    // Primary color lives on looks.grid_bucket_tag_id (scalar column) now.
    // Entity_tags is only queried for active/human/AI membership.
    const [data, lookRows] = await Promise.all([
      sb(`entity_tags?entity_id=eq.${lookId}&entity_type=eq.look&select=tag_id,source,status`),
      sb(`looks?id=eq.${lookId}&select=grid_bucket_tag_id`),
    ]);
    const human = new Set<string>(
      data.filter((t: any) => t.source === "human").map((t: any) => t.tag_id)
    );
    const aiApproved = new Set<string>(
      data.filter((t: any) => t.source === "ai" && t.status === "approved").map((t: any) => t.tag_id)
    );
    setHumanTagIds(human);
    setAiApprovedTagIds(aiApproved);
    setActiveTags(new Set<string>([...human, ...aiApproved]));
    setPrimaryTagId(lookRows?.[0]?.grid_bucket_tag_id ?? null);
  };

  const toggleTag = async (tagId: string) => {
    const look = filtered[idx];
    if (!look) return;
    setSaving(true);
    try {
      const isHuman = humanTagIds.has(tagId);
      const isAI = aiApprovedTagIds.has(tagId);

      if (isHuman) {
        // Remove human source — if AI-approved exists, tag stays active (AI-only)
        await sb(
          `entity_tags?entity_id=eq.${look.id}&tag_id=eq.${tagId}&entity_type=eq.look&source=eq.human`,
          { method: "DELETE", prefer: "" }
        );
        const newHuman = new Set(humanTagIds);
        newHuman.delete(tagId);
        setHumanTagIds(newHuman);
        if (primaryTagId === tagId) {
          // If this was the primary color, clear looks.grid_bucket_tag_id too
          await sb(`looks?id=eq.${look.id}`, {
            method: "PATCH", prefer: "",
            body: JSON.stringify({ grid_bucket_tag_id: null }),
          });
          setPrimaryTagId(null);
        }

        if (!isAI) {
          // No AI fallback — remove entirely from active
          const next = new Set(activeTags);
          next.delete(tagId);
          setActiveTags(next);
          setTagCounts(prev => ({ ...prev, [tagId]: Math.max(0, (prev[tagId] ?? 1) - 1) }));
          setLookIdCache(prev => {
            if (!prev[tagId]) return prev;
            const s = new Set(prev[tagId]); s.delete(look.id);
            return { ...prev, [tagId]: s };
          });
          if (tagFilterId === tagId) {
            setTagFilterLookIds(prev => {
              if (!prev) return prev;
              const s = new Set(prev); s.delete(look.id); return s;
            });
          }
          setTaggedLookIds(prev => {
            const s = new Set(prev);
            if (newHuman.size === 0) s.delete(look.id);
            return s;
          });
        }
        // If AI exists: stays in activeTags, just loses human badge — no other updates needed

      } else if (isAI) {
        // AI-only — promote to human (confirm it)
        await sb("entity_tags", {
          method: "POST",
          body: JSON.stringify({ entity_id: look.id, entity_type: "look", tag_id: tagId, source: "human", model: null }),
          prefer: "resolution=merge-duplicates",
        });
        const newHuman = new Set(humanTagIds);
        newHuman.add(tagId);
        setHumanTagIds(newHuman);

      } else {
        // Off tag — add as human
        await sb("entity_tags", {
          method: "POST",
          body: JSON.stringify({ entity_id: look.id, entity_type: "look", tag_id: tagId, source: "human", model: null }),
          prefer: "resolution=merge-duplicates",
        });
        const newHuman = new Set(humanTagIds);
        newHuman.add(tagId);
        setHumanTagIds(newHuman);
        const next = new Set(activeTags);
        next.add(tagId);
        setActiveTags(next);
        setTaggedLookIds(prev => { const s = new Set(prev); s.add(look.id); return s; });
        setTagCounts(prev => ({ ...prev, [tagId]: (prev[tagId] ?? 0) + 1 }));
        setLookIdCache(prev => {
          if (!prev[tagId]) return prev;
          const s = new Set(prev[tagId]); s.add(look.id);
          return { ...prev, [tagId]: s };
        });
        if (tagFilterId === tagId) {
          setTagFilterLookIds(prev => {
            if (!prev) return prev;
            const s = new Set(prev); s.add(look.id); return s;
          });
        }
      }
    } catch(e) { console.error(e); }
    setSaving(false); setFlash(true); setTimeout(() => setFlash(false), 900);
  };

  const rejectTag = async (tagId: string) => {
    const look = filtered[idx];
    if (!look) return;
    setSaving(true);
    try {
      // Soft-reject: keep the row for audit trail, just flip status off "approved"
      await sb(
        `entity_tags?entity_id=eq.${look.id}&tag_id=eq.${tagId}&entity_type=eq.look&source=eq.ai`,
        { method: "PATCH", prefer: "", body: JSON.stringify({ status: "rejected" }) }
      );
      const newAi = new Set(aiApprovedTagIds);
      newAi.delete(tagId);
      setAiApprovedTagIds(newAi);

      if (!humanTagIds.has(tagId)) {
        const next = new Set(activeTags);
        next.delete(tagId);
        setActiveTags(next);
        setTagCounts(prev => ({ ...prev, [tagId]: Math.max(0, (prev[tagId] ?? 1) - 1) }));
        setLookIdCache(prev => {
          if (!prev[tagId]) return prev;
          const s = new Set(prev[tagId]); s.delete(look.id);
          return { ...prev, [tagId]: s };
        });
        if (tagFilterId === tagId) {
          setTagFilterLookIds(prev => {
            if (!prev) return prev;
            const s = new Set(prev); s.delete(look.id); return s;
          });
        }
      }
      if (primaryTagId === tagId) {
        // If the rejected color was primary, clear looks.grid_bucket_tag_id too
        await sb(`looks?id=eq.${look.id}`, {
          method: "PATCH", prefer: "",
          body: JSON.stringify({ grid_bucket_tag_id: null }),
        });
        setPrimaryTagId(null);
      }
    } catch(e) { console.error(e); }
    setSaving(false); setFlash(true); setTimeout(() => setFlash(false), 900);
  };

  const setPrimary = async (tagId: string) => {
    const look = filtered[idx];
    if (!look) return;
    setSaving(true);
    try {
      // Toggle: click starred = clear, click unstarred = set.
      // grid_bucket_tag_id is a scalar column on `looks` — the single source
      // of truth for a look's primary color. Legacy entity_tags is_primary /
      // is_primary_confirmed flags are no longer written or read.
      const newPrimary = primaryTagId === tagId ? null : tagId;
      await sb(`looks?id=eq.${look.id}`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({ grid_bucket_tag_id: newPrimary }),
      });
      setPrimaryTagId(newPrimary);
      // If the current tag filter is this color tag AND primaryOnly is on, keep
      // the active look inside the filtered set as its primary status changes.
      if (tagFilterId === tagId && primaryOnly) {
        setTagFilterLookIds(prev => {
          if (!prev) return prev;
          const s = new Set(prev);
          if (newPrimary) s.add(look.id); else s.delete(look.id);
          return s;
        });
      } else if (primaryOnly && tagFilterId !== "all") {
        // We may have just removed this look from a different color's primary bucket.
        const wasFilteredColor = (tagsByType["color"] || []).some((t: any) => t.id === tagFilterId);
        if (wasFilteredColor) {
          setTagFilterLookIds(prev => {
            if (!prev) return prev;
            const s = new Set(prev); s.delete(look.id); return s;
          });
        }
      }
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const saveNotes = async () => {
    const look = filtered[idx];
    if (!look) return;
    setSavingNotes(true);
    try {
      await sb(`looks?id=eq.${look.id}`, { method:"PATCH", body: JSON.stringify({ notes }), prefer:"" });
      setFiltered(prev => prev.map(l => l.id === look.id ? { ...l, notes } : l));
      setLooks(prev => prev.map(l => l.id === look.id ? { ...l, notes } : l));
      setEditingNotes(false);
    } catch(e) { console.error(e); }
    setSavingNotes(false);
  };

  const saveImageMode = async (mode: string | null) => {
    const look = filtered[idx];
    if (!look) return;
    const newMode = look.image_mode === mode ? null : mode; // toggle off if already set
    setSavingImageMode(true);
    try {
      await sb(`looks?id=eq.${look.id}`, { method: "PATCH", body: JSON.stringify({ image_mode: newMode }), prefer: "" });
      setImageMode(newMode);
      setFiltered(prev => prev.map(l => l.id === look.id ? { ...l, image_mode: newMode } : l));
      setLooks(prev => prev.map(l => l.id === look.id ? { ...l, image_mode: newMode } : l));
    } catch(e) { console.error(e); }
    setSavingImageMode(false);
  };

  const addTag = async () => {
    if (!newName.trim() || !newType) return;
    setAdding(true);
    try {
      const slug = newName.trim().toLowerCase().replace(/\s+/g,"-");
      const [created] = await sb("tags", { method:"POST", body: JSON.stringify({ name:newName.trim(), slug, tag_type:newType }) });
      setTagsByType(prev => {
        const u = {...prev};
        if (!u[newType]) u[newType] = [];
        u[newType] = [...u[newType], created].sort((a,b) => a.name.localeCompare(b.name));
        return u;
      });
      setNewName(""); setNewType(""); setShowAdd(false);
      await toggleTag(created.id);
    } catch(e) { console.error(e); }
    setAdding(false);
  };

  const look = filtered[idx];
  const pct = filtered.length > 0 ? ((idx + 1) / filtered.length) * 100 : 0;
  const orderedTypes = [
    ...TAG_TYPE_ORDER.filter(t => tagsByType[t]),
    ...Object.keys(tagsByType).filter(t => !TAG_TYPE_ORDER.includes(t)),
  ];

  if (loading) return (
    <>
      <style>{FONT_IMPORT}</style>
      <div style={{background:C.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>
        <span style={{fontSize:15,color:C.muted}}>Loading…</span>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 3px; }
        button:hover { filter: brightness(1.12); }
        a:hover { opacity: 1 !important; }
        .tag-btn:hover { background: #4a4a4a !important; }
        .tag-btn.on:hover { filter: brightness(0.9) !important; }
        input::placeholder { color: #888 !important; }
        textarea::placeholder { color: #888 !important; }
      `}</style>

      <div style={{fontFamily:"Inter,sans-serif",background:C.bg,color:C.text,height:"calc(100vh - 44px)",display:"flex",flexDirection:"column",overflow:"hidden",fontSize:14,lineHeight:1.5}}>

        {/* ── Toolbar ── */}
        <div style={{display:"flex",alignItems:"center",padding:"8px 20px",background:C.bg,gap:16,flexShrink:0,borderBottom:`1px solid ${C.lift1}`}}>
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:3,background:C.lift2,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:C.white,width:`${pct}%`,transition:"width 0.3s",borderRadius:2}}/>
            </div>
            <span style={{fontSize:13,color:C.muted,whiteSpace:"nowrap",fontWeight:500}}>{idx+1} / {filtered.length}</span>
          </div>

          <select value={brandFilter} onChange={e => handleBrandFilter(e.target.value)}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500}}>
            <option value="all">All Brands</option>
            <option value="__unattributed__">Unattributed</option>
            {brands.map((b:any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          <select value={tagFilterId} onChange={e => handleTagFilter(e.target.value)}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500,opacity:tagFilterLoading?0.6:1}}>
            <option value="all">{tagFilterLoading ? "Loading…" : "All Tags"}</option>
            {TAG_TYPE_ORDER.filter(type => tagsByType[type]).map(type => (
              <optgroup key={type} label={TYPE_LABELS[type] || type}>
                {(tagsByType[type] || []).map((tag: any) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setIdx(0); }}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500}}>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
            <option value="draft">Draft</option>
            <option value="all">All Status</option>
          </select>

          <select value={sortMode} onChange={e => { setSortMode(e.target.value as any); setIdx(0); }}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500}}>
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
          </select>

          <button onClick={() => { setUntaggedOnly(v => !v); setIdx(0); }}
            style={{background:untaggedOnly?C.white:"#484848",border:"1px solid #606060",color:untaggedOnly?"#212121":C.text,padding:"7px 12px",fontSize:13,borderRadius:20,cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:untaggedOnly?600:500}}>
            Untagged only
          </button>

          <button onClick={() => { setPrimaryOnly(v => !v); setIdx(0); }}
            title="Filter color tag results to looks whose primary star matches — same as the Living Grid bucket"
            style={{background:primaryOnly?C.amber:"#484848",border:"1px solid #606060",color:primaryOnly?"#212121":C.text,padding:"7px 12px",fontSize:13,borderRadius:20,cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:primaryOnly?600:500}}>
            ★ Primary only
          </button>

          <input value={jumpInput} onChange={e => setJumpInput(e.target.value)} onKeyDown={handleJump}
            placeholder="Go to #"
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",fontFamily:"Inter,sans-serif",width:80,textAlign:"center"}}
          />

          <div style={{display:"flex",background:C.lift1,borderRadius:20,padding:2,gap:2}}>
            <button onClick={() => setBrowseMode(false)}
              style={{background:!browseMode?C.white:"transparent",border:"none",color:!browseMode?"#212121":C.muted,padding:"5px 14px",fontSize:13,cursor:"pointer",borderRadius:18,fontFamily:"Inter,sans-serif",fontWeight:!browseMode?600:400,transition:"all 0.15s"}}>
              Edit
            </button>
            <button onClick={() => setBrowseMode(true)}
              style={{background:browseMode?C.white:"transparent",border:"none",color:browseMode?"#212121":C.muted,padding:"5px 14px",fontSize:13,cursor:"pointer",borderRadius:18,fontFamily:"Inter,sans-serif",fontWeight:browseMode?600:400,transition:"all 0.15s"}}>
              Browse
            </button>
          </div>

          <span style={{fontSize:12,color:flash&&!saving?C.green:C.muted,opacity:saving||flash?1:0,transition:"opacity 0.3s",minWidth:60,textAlign:"right",fontWeight:500}}>
            {saving ? "saving…" : "saved ✓"}
          </span>
        </div>

        {/* ── Browse Mode ── */}
        {browseMode && (
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>
            <div style={{width:220,flexShrink:0,borderRight:`1px solid ${C.lift1}`,overflowY:"auto",padding:"16px 12px",display:"flex",flexDirection:"column",gap:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted}}>Filter</span>
                {browseTagIds.size > 0 && (
                  <button onClick={() => setBrowseTagIds(new Set())}
                    style={{background:"transparent",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:0,fontFamily:"Inter,sans-serif"}}>
                    Clear {browseTagIds.size}
                  </button>
                )}
              </div>

              <div style={{fontSize:13,color:C.text,fontWeight:500}}>
                <span style={{color:C.white,fontWeight:700}}>{browseLooks.length}</span>
                <span style={{color:C.muted}}> looks</span>
              </div>

              {TAG_TYPE_ORDER.filter(type => tagsByType[type]).map(type => {
                const isExpanded = expandedTypes.has(type);
                const tags = tagsByType[type] || [];
                return (
                  <div key={type}>
                    <button onClick={() => toggleExpandedType(type)}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:"0 0 6px 0",marginBottom:6,borderBottom:`1px solid ${C.lift1}`}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#b0aec0"}}>
                        {TYPE_LABELS[type] || type}
                      </span>
                      <span style={{fontSize:10,color:C.dim}}>{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    {isExpanded && (
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        {tags.map((tag: any) => {
                          const checked = browseTagIds.has(tag.id);
                          const count = tagCounts[tag.id];
                          const counting = loadingCounts.has(tag.id);
                          if (count === 0 && !checked) return null;
                          return (
                            <label key={tag.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"3px 4px",borderRadius:6,background:checked?C.lift2:"transparent"}}>
                              <input type="checkbox" checked={checked}
                                onChange={() => toggleBrowseTag(tag.id)}
                                style={{accentColor:C.white,width:13,height:13,cursor:"pointer"}}
                              />
                              <span style={{fontSize:13,color:checked?C.text:C.muted,flex:1}}>{tag.name}</span>
                              <span style={{fontSize:11,color:C.dim}}>
                                {counting ? "…" : count !== undefined ? count : ""}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div id="browse-grid" style={{flex:1,overflowY:"auto",padding:16}}>
              {browseLooks.length === 0 ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:C.dim,fontSize:14}}>
                  No looks match the selected tags
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(5, 1fr)",gap:8}}>
                  {browseLooks.map((l: any) => (
                    <div key={l.id} onClick={() => enterEditFromBrowse(l.id)}
                      style={{cursor:"pointer",borderRadius:10,overflow:"hidden",background:C.lift1,transition:"transform 0.1s"}}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                      <div style={{paddingTop:"133%",position:"relative",background:"#181818"}}>
                        <img src={l.cloudinary_url} alt="" loading="lazy"
                          style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}
                        />
                        <span style={{
                          position:"absolute", top:6, right:6,
                          fontSize:9, fontWeight:700, letterSpacing:"0.07em",
                          textTransform:"uppercase", padding:"2px 6px", borderRadius:6,
                          background: l.status === "published" ? "rgba(76,175,110,0.85)" : l.status === "draft" ? "rgba(240,165,0,0.85)" : "rgba(80,80,80,0.85)",
                          color: "#fff",
                        }}>{l.status}</span>
                      </div>
                      <div style={{padding:"5px 8px"}}>
                        <span style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",display:"block"}}>
                          {l.brands?.name || "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Edit Mode ── */}
        {!browseMode && (
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>

            <div style={{position:"absolute",top:52,left:8,zIndex:10}}>
              <button onClick={returnToBrowse}
                style={{background:C.lift2,border:"none",color:C.muted,padding:"5px 12px",fontSize:12,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",gap:6}}>
                ← Browse
              </button>
            </div>

            <div style={{width:"50%",flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",borderRight:`1px solid ${C.lift1}`}}>
              {look ? (
                <>
                  <div style={{flex:1,minHeight:0,background:"#181818",position:"relative",overflow:"hidden"}}>
                    <img key={look.cloudinary_url} src={look.cloudinary_url} alt=""
                      style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}
                    />
                  </div>

                  <div style={{flexShrink:0,background:C.lift1,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                        <span style={{fontSize:15,fontWeight:600,color:C.text}}>{look.brands?.name || "—"}</span>
                        {look.season_display && <span style={{fontSize:12,color:C.muted}}>{look.season_display}</span>}
                        {look.status && (
                          <span style={{
                            fontSize:10,fontWeight:700,letterSpacing:"0.06em",textTransform:"uppercase",
                            color: look.status === "published" ? C.green : look.status === "archived" ? C.muted : C.amber,
                            background: `${look.status === "published" ? C.green : look.status === "archived" ? C.muted : C.amber}22`,
                            padding:"2px 7px",borderRadius:10
                          }}>{look.status}</span>
                        )}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        {/* Image mode toggle */}
                        <div style={{display:"flex",background:C.lift2,borderRadius:20,padding:2,gap:2,opacity:savingImageMode?0.5:1}}>
                          {[
                            { value: "color", label: "Color" },
                            { value: "black_and_white", label: "B&W" },
                          ].map(({ value, label }) => (
                            <button key={value} onClick={() => saveImageMode(value)}
                              style={{
                                background: imageMode === value ? C.white : "transparent",
                                border: "none",
                                color: imageMode === value ? "#212121" : C.muted,
                                padding: "4px 10px", fontSize: 12,
                                cursor: "pointer", borderRadius: 18,
                                fontFamily: "Inter,sans-serif",
                                fontWeight: imageMode === value ? 600 : 400,
                                transition: "all 0.15s",
                              }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {look.source_url && (
                          <a href={look.source_url} target="_blank" rel="noreferrer"
                            style={{fontSize:12,color:C.text,textDecoration:"none",background:C.lift2,padding:"5px 12px",borderRadius:20,fontWeight:500}}>
                            ↗ source
                          </a>
                        )}
                        <a href={`/review?look=${look.id}`}
                          style={{fontSize:12,color:C.muted,textDecoration:"none",background:C.lift2,padding:"5px 12px",borderRadius:20,fontWeight:500}}>
                          → Review
                        </a>
                        <span style={{fontSize:13,color:C.muted,fontWeight:500}}>
                          <span style={{color:C.text,fontWeight:600}}>{activeTags.size}</span> tags
                          {aiApprovedTagIds.size > 0 && humanTagIds.size < activeTags.size && (
                            <span style={{color:C.green,fontSize:11,marginLeft:4}}>
                              ({activeTags.size - humanTagIds.size} AI)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {!editingNotes ? (
                      <div onClick={() => setEditingNotes(true)}
                        style={{fontSize:14,color:notes?C.text:C.dim,background:C.lift2,borderRadius:10,padding:"8px 12px",cursor:"pointer",lineHeight:1.5,fontStyle:notes?"normal":"italic",maxHeight:72,overflowY:"auto"}}>
                        {notes || "Add notes…"}
                      </div>
                    ) : (
                      <div style={{display:"flex",flexDirection:"column",gap:6}}>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} autoFocus rows={2}
                          style={{background:"#484848",border:"1.5px solid #fff",color:C.text,padding:"8px 12px",fontSize:14,borderRadius:10,outline:"none",resize:"none",fontFamily:"Inter,sans-serif",lineHeight:1.5,width:"100%"}}
                        />
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={saveNotes} disabled={savingNotes}
                            style={{background:C.white,border:"none",color:"#212121",padding:"6px 16px",fontSize:13,cursor:"pointer",borderRadius:20,fontWeight:600,fontFamily:"Inter,sans-serif"}}>
                            {savingNotes?"…":"Save"}
                          </button>
                          <button onClick={() => { setEditingNotes(false); setNotes(filtered[idx]?.notes||""); }}
                            style={{background:C.lift2,border:"none",color:C.muted,padding:"6px 16px",fontSize:13,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif"}}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",paddingTop:2}}>
                      <button onClick={prev}
                        style={{background:C.lift2,border:"none",color:C.text,padding:"8px 20px",fontSize:13,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif",fontWeight:500,opacity:idx===0?0.25:1}}>
                        ← Prev
                      </button>
                      <span style={{fontSize:11,color:C.dim}}>arrow keys</span>
                      <button onClick={next}
                        style={{background:C.lift2,border:"none",color:C.text,padding:"8px 20px",fontSize:13,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif",fontWeight:500,opacity:idx===filtered.length-1?0.25:1}}>
                        Next →
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:C.dim,fontSize:13}}>No looks</div>
              )}
            </div>

            <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:20,background:C.bg}}>

              {/* AI tag legend — shown when current look has AI-only tags */}
              {aiApprovedTagIds.size > humanTagIds.size && (
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:"rgba(76,175,110,0.08)",borderRadius:10,border:"1px solid rgba(76,175,110,0.2)"}}>
                  <span style={{fontSize:12,color:C.green}}>✦</span>
                  <span style={{fontSize:12,color:C.muted}}>Green tags were applied automatically — click to confirm, or leave as-is</span>
                </div>
              )}

              {orderedTypes.map(type => (
                <div key={type}>
                  <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#b0aec0",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.lift1}`}}>
                    {TYPE_LABELS[type]||type}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {(tagsByType[type]||[]).map(tag => {
                      const on = activeTags.has(tag.id);
                      const isHumanConfirmed = humanTagIds.has(tag.id);
                      const isAiOnly = on && !isHumanConfirmed;
                      const isColor = type === "color";
                      const isPrimary = primaryTagId === tag.id;
                      return (
                        <div key={tag.id} style={{display:"inline-flex",alignItems:"center",gap:0}}>
                          {isColor && on && (
                            <button onClick={e => { e.stopPropagation(); setPrimary(tag.id); }}
                              title={isPrimary ? "Primary color — click to clear" : "Set as primary color"}
                              style={{background:isPrimary?C.amber:C.lift2,border:"none",color:isPrimary?"#212121":C.muted,padding:"6px 8px 6px 10px",fontSize:12,cursor:"pointer",borderRadius:"20px 0 0 20px",fontFamily:"Inter,sans-serif",lineHeight:1,transition:"all 0.1s"}}>
                              {isPrimary ? "★" : "☆"}
                            </button>
                          )}
                          <button
                            className={`tag-btn${on ? " on" : ""}`}
                            onClick={() => toggleTag(tag.id)}
                            title={isAiOnly ? "AI-tagged — click to confirm" : (tag.definition || undefined)}
                            style={{
                              background: isHumanConfirmed ? C.white : isAiOnly ? "rgba(76,175,110,0.18)" : C.lift1,
                              border: isAiOnly ? "1px solid rgba(76,175,110,0.35)" : "none",
                              borderRight: isAiOnly ? "none" : undefined,
                              color: isHumanConfirmed ? "#212121" : isAiOnly ? C.green : C.text,
                              padding: "6px 14px",
                              fontSize: 13,
                              fontWeight: isHumanConfirmed ? 600 : 400,
                              cursor: "pointer",
                              borderRadius: `${isColor && on ? 0 : 20}px ${isAiOnly ? 0 : 20}px ${isAiOnly ? 0 : 20}px ${isColor && on ? 0 : 20}px`,
                              fontFamily: "Inter,sans-serif",
                              transition: "all 0.1s",
                              textDecoration: tag.definition ? "underline dotted" : "none",
                              textUnderlineOffset: 3,
                            }}>
                            {tag.name}
                            {isHumanConfirmed && !isColor ? " ✓" : ""}
                            {isAiOnly ? " ✦" : ""}
                          </button>
                          {isAiOnly && (
                            <button onClick={e => { e.stopPropagation(); rejectTag(tag.id); }}
                              title="Dismiss — not a match"
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(224,90,78,0.25)"; e.currentTarget.style.color = C.red; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(76,175,110,0.18)"; e.currentTarget.style.color = C.green; }}
                              style={{
                                background: "rgba(76,175,110,0.18)",
                                border: "1px solid rgba(76,175,110,0.35)",
                                borderLeft: "1px solid rgba(255,255,255,0.15)",
                                color: C.green,
                                padding: "6px 10px",
                                fontSize: 13,
                                lineHeight: 1,
                                cursor: "pointer",
                                borderRadius: "0 20px 20px 0",
                                fontFamily: "Inter,sans-serif",
                                transition: "all 0.1s",
                              }}>
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted,paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.lift1}`}}>
                  New Tag
                </div>
                {!showAdd ? (
                  <button onClick={() => setShowAdd(true)}
                    style={{background:"transparent",border:`1.5px dashed ${C.lift2}`,color:C.muted,padding:"6px 16px",fontSize:13,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif"}}>
                    + Add tag
                  </button>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8,maxWidth:300}}>
                    <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tag name"
                      onKeyDown={e => e.key==="Enter" && addTag()} autoFocus
                      style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"9px 14px",fontSize:13,borderRadius:12,outline:"none",fontFamily:"Inter,sans-serif"}}/>
                    <select value={newType} onChange={e => setNewType(e.target.value)}
                      style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"9px 14px",fontSize:13,borderRadius:12,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                      <option value="">Select type…</option>
                      {orderedTypes.map(t => <option key={t} value={t}>{TYPE_LABELS[t]||t}</option>)}
                    </select>
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={addTag} disabled={adding}
                        style={{background:C.white,border:"none",color:"#212121",padding:"8px 18px",fontSize:13,cursor:"pointer",borderRadius:20,fontWeight:600,fontFamily:"Inter,sans-serif"}}>
                        {adding ? "…" : "Add & Apply"}
                      </button>
                      <button onClick={() => { setShowAdd(false); setNewName(""); setNewType(""); }}
                        style={{background:C.lift2,border:"none",color:C.muted,padding:"8px 18px",fontSize:13,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif"}}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
