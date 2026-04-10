"use client";

import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://rsslbgfbdoqxgogbuuzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzc2xiZ2ZiZG9xeGdvZ2J1dXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjE2NTUsImV4cCI6MjA3NjEzNzY1NX0.lBL-KUrQbT9N4ACc-CdMauvXmhtuG9_Jr7nhIhQz-g0";
const ANTHROPIC_KEY = ""; // ← Add your Anthropic API key here

const H = {
  "Content-Type": "application/json",
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

const sb = async (path: string, opts: any = {}) => {
  const { prefer, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...H, Prefer: prefer ?? "return=representation" },
    ...rest,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const C = {
  bg: "#212121", lift1: "#2f2f2f", lift2: "#3a3a3a", lift3: "#484848",
  text: "#ececec", muted: "#8e8ea0", dim: "#555",
  white: "#fff", green: "#4caf6e", amber: "#f0a500", red: "#e05a4e", blue: "#4a9eff",
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const TAG_TYPE_LABELS: Record<string, string> = {
  "color": "Color", "color intensity": "Intensity", "color complexity": "Complexity",
  "color palette": "Palette", "garment types": "Garment", "silhouettes": "Silhouette",
  "length": "Length", "materials": "Material", "patterns": "Pattern",
  "pattern-scale": "Scale", "surface texture": "Texture", "techniques": "Technique",
  "construction": "Construction",
};

// ── Tag chip ──────────────────────────────────────────────────────────────────
function TagChip({ tag, onRemove }: { tag: any; onRemove?: () => void }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 12, background: C.lift2, color: C.text,
      padding: "3px 10px", borderRadius: 20, fontWeight: 500,
    }}>
      {tag.name}
      <span style={{ fontSize: 10, color: C.muted }}>
        {TAG_TYPE_LABELS[tag.tag_type] || tag.tag_type}
      </span>
      {onRemove && (
        <button tabIndex={-1} onClick={onRemove}
          style={{ background: "none", border: "none", color: C.muted, fontSize: 16, cursor: "pointer", padding: 0, lineHeight: 1, marginLeft: 2 }}>
          ×
        </button>
      )}
    </span>
  );
}

// ── Tag selector ──────────────────────────────────────────────────────────────
function TagSelector({ allTags, selected, onChange }: {
  allTags: any[]; selected: any[]; onChange: (tags: any[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagType, setNewTagType] = useState("silhouettes");
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allTagTypes = [...new Set(allTags.map(t => t.tag_type))].sort();

  const filtered = query.length > 0
    ? allTags
        .filter(t => t.name.toLowerCase().includes(query.toLowerCase()) && !selected.find(s => s.id === t.id))
        .slice(0, 10)
    : [];

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const addTag = (tag: any) => {
    onChange([...selected, tag]);
    setQuery(""); setOpen(false);
  };

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setCreating(true);
    try {
      const result = await sb("tags", {
        method: "POST",
        body: JSON.stringify({ name: newTagName.trim(), slug: slugify(newTagName), tag_type: newTagType }),
      });
      const created = Array.isArray(result) ? result[0] : result;
      onChange([...selected, created]);
      setNewTagName(""); setShowCreate(false); setQuery(""); setOpen(false);
    } catch (e: any) { alert(e.message); }
    setCreating(false);
  };

  return (
    <div ref={ref} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {selected.map(tag => (
            <TagChip key={tag.id} tag={tag} onRemove={() => onChange(selected.filter(t => t.id !== tag.id))} />
          ))}
        </div>
      )}

      <div style={{ position: "relative" }}>
        <input
          value={query}
          placeholder={selected.length === 0 ? "Search tags… or type to create" : "Add another tag…"}
          onChange={e => { setQuery(e.target.value); setOpen(true); setShowCreate(false); }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => { if (e.key === "Escape") { setOpen(false); setShowCreate(false); } }}
          style={{
            background: C.lift3, border: "none", color: C.text,
            padding: "9px 14px", fontSize: 13, borderRadius: 12,
            outline: "none", width: "100%", fontFamily: "Inter,sans-serif",
          }}
        />

        {open && (filtered.length > 0 || query.length > 1) && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: C.lift2, borderRadius: 12, zIndex: 400,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            maxHeight: 240, overflowY: "auto",
          }}>
            {filtered.map(tag => (
              <div key={tag.id} onMouseDown={() => addTag(tag)}
                style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.lift1}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{tag.name}</span>
                <span style={{ fontSize: 11, color: C.muted }}>{TAG_TYPE_LABELS[tag.tag_type] || tag.tag_type}</span>
              </div>
            ))}
            {query.length > 1 && !filtered.find(t => t.name.toLowerCase() === query.toLowerCase()) && (
              <div onMouseDown={() => { setShowCreate(true); setNewTagName(query); setQuery(""); setOpen(false); }}
                style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, color: C.blue, fontWeight: 500 }}>
                + Create tag "{query}"
              </div>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div style={{ background: C.lift1, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>New Tag</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input value={newTagName} onChange={e => setNewTagName(e.target.value)} placeholder="Tag name"
              autoFocus
              style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", fontFamily: "Inter,sans-serif" }} />
            <select value={newTagType} onChange={e => setNewTagType(e.target.value)}
              style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
              {allTagTypes.map(t => <option key={t} value={t}>{TAG_TYPE_LABELS[t] || t}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={createTag} disabled={creating || !newTagName.trim()}
              style={{ background: C.white, border: "none", color: "#212121", padding: "7px 16px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: creating || !newTagName.trim() ? 0.4 : 1 }}>
              {creating ? "Creating…" : "Create & Add"}
            </button>
            <button tabIndex={-1} onClick={() => { setShowCreate(false); setNewTagName(""); }}
              style={{ background: C.lift2, border: "none", color: C.muted, padding: "7px 16px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Live look count ───────────────────────────────────────────────────────────
function LookCountPreview({ tags }: { tags: any[] }) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (tags.length === 0) { setCount(null); return; }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => resolve(tags), 450);
    return () => clearTimeout(timerRef.current);
  }, [tags.map(t => t.id).join(",")]);

  const resolve = async (tags: any[]) => {
    setLoading(true);
    try {
      let ids: string[] | null = null;
      for (const tag of tags) {
        const rows = await sb(`entity_tags?tag_id=eq.${tag.id}&entity_type=eq.look&select=entity_id`);
        const tagIds = rows.map((r: any) => r.entity_id);
        ids = ids === null ? tagIds : ids.filter((id: string) => new Set(tagIds).has(id));
        if ((ids || []).length === 0) break;
      }
      if (!ids || ids.length === 0) { setCount(0); setLoading(false); return; }
      const filter = ids.map(id => `id=eq.${id}`).join(",");
      const published = await sb(`looks?or=(${filter})&status=eq.published&select=id`);
      setCount(published.length);
    } catch { setCount(null); }
    setLoading(false);
  };

  if (count === null && !loading) return null;

  const color = loading ? C.muted : count === 0 ? C.red : count! < 10 ? C.amber : C.green;
  return (
    <div style={{ fontSize: 12, color, display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
      {loading ? "Checking looks…" : (
        <>
          <span style={{ fontWeight: 700, fontSize: 13 }}>{count}</span>
          published {count === 1 ? "look" : "looks"} match
          {count === 0 && " — frame will be empty for now, that's fine"}
          {count! > 0 && count! < 10 && " — needs more looks before snapshotting"}
          {count! >= 10 && " ✓ snapshot-ready"}
        </>
      )}
    </div>
  );
}

// ── AI description draft ──────────────────────────────────────────────────────
async function draftAIDescription(title: string, tags: any[]): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 120,
      system: `You write short editorial descriptions for Look47, a global fashion discovery platform focused on non-Western, African, and diaspora designers.
Descriptions are 15–25 words. Precise, cultural, non-hypey. Never use the word "explore".
Write about what the frame contains, not what the user will do.`,
      messages: [{
        role: "user",
        content: `Frame title: "${title}". Tags: ${tags.map(t => t.name).join(", ")}. Write the description.`,
      }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "";
}

// ── Create frame modal ────────────────────────────────────────────────────────
function CreateModal({ allTags, onSave, onClose }: {
  allTags: any[]; onSave: (frame: any, tags: any[]) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);

  const handleDraft = async () => {
    if (!title.trim() || selectedTags.length === 0 || !ANTHROPIC_KEY) return;
    setDraftingAI(true);
    try { setDescription(await draftAIDescription(title, selectedTags)); }
    catch (e) { console.error(e); }
    setDraftingAI(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const queryConfig = {
        type: "tag_ids",
        tag_slugs: selectedTags.map(t => t.slug),
        diversity: { min_looks: 10, max_per_designer: 1, fallback_increment: 1, prefer_country_spread: true },
      };
      const result = await sb("sets", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          slug: slugify(title),
          description: description.trim() || null,
          status: "staging",
          set_type: "frame",
          query_config: queryConfig,
          look_count_cache: 0,
          times_shown: 0,
        }),
      });
      const created = Array.isArray(result) ? result[0] : result;
      onSave(created, selectedTags);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.lift1, borderRadius: 20, width: "100%", maxWidth: 520, boxShadow: "0 24px 64px rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", maxHeight: "88vh" }}>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: `1px solid ${C.lift2}`, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>New Frame</span>
          <button tabIndex={-1} onClick={onClose} style={{ background: "none", border: "none", color: C.dim, fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Sculptural Draping"
              autoFocus
              style={{ background: C.lift3, border: "none", color: C.text, padding: "10px 14px", fontSize: 14, fontWeight: 600, borderRadius: 12, outline: "none", fontFamily: "Inter,sans-serif" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Query Tags
              <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, color: C.dim }}>looks must match ALL of these</span>
            </label>
            <TagSelector allTags={allTags} selected={selectedTags} onChange={setSelectedTags} />
            <LookCountPreview tags={selectedTags} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Description</label>
              <button onClick={handleDraft} disabled={draftingAI || !title.trim() || selectedTags.length === 0 || !ANTHROPIC_KEY}
                style={{ fontSize: 11, background: "none", border: `1px solid ${C.lift3}`, color: C.blue, padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "Inter,sans-serif", opacity: (!title.trim() || selectedTags.length === 0 || !ANTHROPIC_KEY) ? 0.35 : 1 }}>
                {draftingAI ? "Drafting…" : "✦ AI Draft"}
              </button>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={3} placeholder="Editorial description — or hit AI Draft above after adding tags..."
              style={{ background: C.lift3, border: "none", color: C.text, padding: "10px 14px", fontSize: 13, borderRadius: 12, outline: "none", resize: "vertical", lineHeight: 1.6, fontFamily: "Inter,sans-serif" }} />
          </div>
        </div>

        <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10, flexShrink: 0 }}>
          <button tabIndex={-1} onClick={onClose}
            style={{ background: C.lift2, border: "none", color: C.muted, padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !title.trim()}
            style={{ background: C.white, border: "none", color: "#212121", padding: "9px 22px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving || !title.trim() ? 0.4 : 1 }}>
            {saving ? "Creating…" : "Create Frame"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function FramesPage() {
  const [frames, setFrames] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  // Detail panel state
  const [selected, setSelected] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editTags, setEditTags] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [draftingAI, setDraftingAI] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Looks preview
  const [looks, setLooks] = useState<any[]>([]);
  const [loadingLooks, setLoadingLooks] = useState(false);
  const looksTimer = useRef<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "staging">("all");
  const [search, setSearch] = useState("");

  useEffect(() => { loadData(); }, []);

  // Re-fetch looks whenever editTags change (live preview)
  useEffect(() => {
    if (!selected) return;
    clearTimeout(looksTimer.current);
    looksTimer.current = setTimeout(() => fetchLooks(editTags), 500);
    return () => clearTimeout(looksTimer.current);
  }, [editTags.map(t => t.id).join(",")]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, t] = await Promise.all([
        sb("sets?select=*&set_type=eq.frame&order=status,look_count_cache.desc"),
        sb("tags?select=id,name,slug,tag_type&order=tag_type,name"),
      ]);
      setFrames(f || []);
      setAllTags(t || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchLooks = async (tags: any[]) => {
    setLoadingLooks(true);
    setLooks([]);
    try {
      if (tags.length === 0) { setLoadingLooks(false); return; }
      let ids: string[] | null = null;
      for (const tag of tags) {
        const rows = await sb(`entity_tags?tag_id=eq.${tag.id}&entity_type=eq.look&select=entity_id`);
        const tagIds = rows.map((r: any) => r.entity_id);
        ids = ids === null ? tagIds : ids.filter((id: string) => new Set(tagIds).has(id));
        if ((ids || []).length === 0) break;
      }
      if (!ids || ids.length === 0) { setLoadingLooks(false); return; }
      const filter = ids.map((id: string) => `id=eq.${id}`).join(",");
      const data = await sb(
        `looks?or=(${filter})&status=eq.published&select=id,cloudinary_url,season_display,scene,created_at,brand:brand_id(name)&order=created_at.desc&limit=120`
      );
      setLooks(data.map((l: any) => ({ ...l, brand_name: l.brand?.name || "" })));
    } catch (e) { console.error(e); }
    setLoadingLooks(false);
  };

  const selectFrame = (frame: any) => {
    setSelected(frame);
    setEditTitle(frame.title);
    setEditDescription(frame.description || "");
    setEditStatus(frame.status);
    setConfirmDelete(false);
    const slugs: string[] = frame.query_config?.tag_slugs || [];
    const resolved = slugs.map((slug: string) => allTags.find(t => t.slug === slug)).filter(Boolean);
    setEditTags(resolved);
    fetchLooks(resolved);
  };

  const saveEdits = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const newConfig = { ...selected.query_config, tag_slugs: editTags.map(t => t.slug) };
      await sb(`sets?id=eq.${selected.id}`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          status: editStatus,
          query_config: newConfig,
          look_count_cache: looks.length,
        }),
      });
      await loadData();
      setSelected((prev: any) => prev ? {
        ...prev, title: editTitle, description: editDescription,
        status: editStatus, query_config: newConfig, look_count_cache: looks.length,
      } : null);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const deleteFrame = async () => {
    if (!selected) return;
    try {
      await sb(`sets?id=eq.${selected.id}`, { method: "DELETE", prefer: "" });
      setSelected(null);
      await loadData();
    } catch (e: any) { alert(e.message); }
  };

  const handleDraft = async () => {
    if (!editTitle.trim() || editTags.length === 0 || !ANTHROPIC_KEY) return;
    setDraftingAI(true);
    try { setEditDescription(await draftAIDescription(editTitle, editTags)); }
    catch (e) { console.error(e); }
    setDraftingAI(false);
  };

  const filtered = frames.filter(f => {
    if (statusFilter !== "all" && f.status !== statusFilter) return false;
    if (search && !f.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: frames.length,
    published: frames.filter(f => f.status === "published").length,
    staging: frames.filter(f => f.status === "staging").length,
  };

  const inp = {
    background: C.lift3, border: "none" as const, color: C.text,
    padding: "9px 14px", fontSize: 13, borderRadius: 12,
    outline: "none", width: "100%", fontFamily: "Inter,sans-serif",
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
        .fr:hover { background: #272727 !important; }
        .fr.active { background: #2f2f2f !important; border-left: 2px solid #ececec !important; }
        input::placeholder, textarea::placeholder { color: #555; }
        .look-thumb { transition: transform 0.18s; }
        .look-thumb:hover { transform: scale(1.05); }
      `}</style>

      <div style={{ fontFamily: "Inter,sans-serif", background: C.bg, color: C.text, height: "calc(100vh - 44px)", display: "flex", flexDirection: "column", overflow: "hidden", fontSize: 14 }}>

        {/* ── Toolbar ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${C.lift1}`, flexShrink: 0 }}>
          <div style={{ display: "flex", gap: 3 }}>
            {(["all", "published", "staging"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ background: statusFilter === s ? C.lift2 : "transparent", border: "none", color: statusFilter === s ? C.text : C.muted, padding: "6px 14px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", fontWeight: statusFilter === s ? 600 : 400 }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                <span style={{ marginLeft: 5, fontSize: 11, color: s === "published" ? C.green : s === "staging" ? C.amber : C.muted }}>{counts[s]}</span>
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search frames…"
            style={{ background: C.lift2, border: "none", color: C.text, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", width: 200, fontFamily: "Inter,sans-serif" }} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: C.muted }}>{filtered.length} frames</span>
          <button onClick={() => setShowCreate(true)}
            style={{ background: C.white, border: "none", color: "#212121", padding: "8px 18px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
            + New Frame
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* ── Summary list ── */}
          <div style={{ width: selected ? "38%" : "100%", flexShrink: 0, overflowY: "auto", borderRight: selected ? `1px solid ${C.lift1}` : "none", transition: "width 0.2s" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted }}>Loading…</div>
            ) : filtered.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, color: C.muted, gap: 8 }}>
                <div style={{ fontSize: 13 }}>No frames{search ? ` matching "${search}"` : ""}</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.lift1}` }}>
                    {["Frame", "Tags", "Looks", "Status"].map(h => (
                      <th key={h} style={{ padding: "8px 14px", fontSize: 11, fontWeight: 600, color: C.muted, textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(frame => {
                    const isActive = selected?.id === frame.id;
                    const tagSlugs: string[] = frame.query_config?.tag_slugs || [];
                    return (
                      <tr key={frame.id}
                        className={`fr${isActive ? " active" : ""}`}
                        onClick={() => selectFrame(frame)}
                        style={{ borderBottom: `1px solid ${C.lift1}`, cursor: "pointer", background: isActive ? C.lift1 : "transparent", borderLeft: isActive ? `2px solid ${C.white}` : "2px solid transparent" }}>
                        <td style={{ padding: "12px 14px", maxWidth: 180 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{frame.title}</div>
                          {frame.description && (
                            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                              {frame.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                            {tagSlugs.slice(0, 3).map(slug => (
                              <span key={slug} style={{ fontSize: 10, background: C.lift2, color: C.muted, padding: "2px 7px", borderRadius: 10 }}>{slug}</span>
                            ))}
                            {tagSlugs.length > 3 && <span style={{ fontSize: 10, color: C.dim }}>+{tagSlugs.length - 3}</span>}
                          </div>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: frame.look_count_cache >= 10 ? C.green : frame.look_count_cache > 0 ? C.amber : C.dim }}>
                            {frame.look_count_cache}
                          </span>
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                            color: frame.status === "published" ? C.green : frame.status === "staging" ? C.amber : C.dim,
                            background: `${frame.status === "published" ? C.green : frame.status === "staging" ? C.amber : C.dim}22`,
                            padding: "3px 8px", borderRadius: 20,
                          }}>{frame.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* ── Detail panel ── */}
          {selected && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* Header */}
              <div style={{ padding: "18px 22px", borderBottom: `1px solid ${C.lift1}`, flexShrink: 0, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{selected.title}</div>
                  <div style={{ fontSize: 11, color: C.dim, marginTop: 2 }}>/{selected.slug}</div>
                </div>
                <button tabIndex={-1} onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", color: C.dim, fontSize: 22, cursor: "pointer", padding: 0, lineHeight: 1, marginTop: 2 }}>×</button>
              </div>

              <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Title */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Title</label>
                  <input value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ ...inp, fontWeight: 600, fontSize: 14 }} />
                </div>

                {/* Tags — live */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                    Query Tags
                    <span style={{ fontWeight: 400, textTransform: "none", marginLeft: 6, fontSize: 11, color: C.dim }}>looks update live as you change these</span>
                  </label>
                  <TagSelector allTags={allTags} selected={editTags} onChange={setEditTags} />
                  <LookCountPreview tags={editTags} />
                </div>

                {/* Description */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Description</label>
                    <button onClick={handleDraft} disabled={draftingAI || !editTitle.trim() || editTags.length === 0 || !ANTHROPIC_KEY}
                      style={{ fontSize: 11, background: "none", border: `1px solid ${C.lift3}`, color: C.blue, padding: "3px 10px", borderRadius: 12, cursor: "pointer", fontFamily: "Inter,sans-serif", opacity: (!editTitle.trim() || editTags.length === 0 || !ANTHROPIC_KEY) ? 0.35 : 1 }}>
                      {draftingAI ? "Drafting…" : "✦ AI Draft"}
                    </button>
                  </div>
                  <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                    rows={3} placeholder="Editorial description…"
                    style={{ ...inp, resize: "vertical" as const, lineHeight: "1.6" }} />
                </div>

                {/* Status */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Status</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value)}
                    style={{ ...inp, cursor: "pointer" }}>
                    <option value="staging">Staging</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                {/* Save / Delete */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <button onClick={saveEdits} disabled={saving}
                    style={{ background: C.white, border: "none", color: "#212121", padding: "9px 22px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  {!confirmDelete ? (
                    <button onClick={() => setConfirmDelete(true)}
                      style={{ background: "none", border: "none", color: C.dim, fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif", padding: "6px 0" }}>
                      Delete frame
                    </button>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: C.red }}>Are you sure?</span>
                      <button onClick={deleteFrame}
                        style={{ background: C.red, border: "none", color: "#fff", padding: "5px 12px", fontSize: 12, cursor: "pointer", borderRadius: 12, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
                        Delete
                      </button>
                      <button tabIndex={-1} onClick={() => setConfirmDelete(false)}
                        style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Looks preview ── */}
                <div style={{ borderTop: `1px solid ${C.lift1}`, paddingTop: 18 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Looks in this frame</div>
                    <div style={{ fontSize: 12, color: loadingLooks ? C.dim : looks.length >= 10 ? C.green : looks.length > 0 ? C.amber : C.dim }}>
                      {loadingLooks ? "Loading…" : `${looks.length} published`}
                    </div>
                  </div>

                  {loadingLooks ? (
                    <div style={{ color: C.muted, fontSize: 13, padding: "12px 0" }}>Resolving…</div>
                  ) : looks.length === 0 ? (
                    <div style={{ color: C.dim, fontSize: 13, padding: "16px 0" }}>
                      {editTags.length === 0
                        ? "Add tags above to see matching looks."
                        : "No published looks match these tags yet — this is fine for a draft frame."}
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))", gap: 6 }}>
                      {looks.map(look => (
                        <div key={look.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "3/4", background: C.lift2 }}>
                          <img
                            className="look-thumb"
                            src={look.cloudinary_url} alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "18px 5px 5px", background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }}>
                            <div style={{ fontSize: 9, color: C.white, fontWeight: 600, lineHeight: 1.3 }}>{look.brand_name}</div>
                            {look.season_display && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>{look.season_display}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <CreateModal
          allTags={allTags}
          onClose={() => setShowCreate(false)}
          onSave={async (created, tags) => {
            setShowCreate(false);
            await loadData();
            setSelected(created);
            setEditTitle(created.title);
            setEditDescription(created.description || "");
            setEditStatus(created.status);
            setEditTags(tags);
            setConfirmDelete(false);
            fetchLooks(tags);
          }}
        />
      )}
    </>
  );
}
