"use client";

import { useState, useEffect, useRef } from "react";

const SUPABASE_URL = "https://rsslbgfbdoqxgogbuuzc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzc2xiZ2ZiZG9xeGdvZ2J1dXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjE2NTUsImV4cCI6MjA3NjEzNzY1NX0.lBL-KUrQbT9N4ACc-CdMauvXmhtuG9_Jr7nhIhQz-g0";

const sb = async (path: string, opts: any = {}) => {
  const { prefer, ...rest } = opts;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "return=representation",
    },
    ...rest,
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const C = {
  bg: "#212121", lift1: "#2f2f2f", lift2: "#3a3a3a", lift3: "#484848",
  text: "#ececec", muted: "#8e8ea0", dim: "#555",
  white: "#fff", green: "#4caf6e", red: "#e05a4e", amber: "#f0a500",
};

// ── Mini Typeahead ─────────────────────────────────────────────────────────────

function Typeahead({ label, items, value, onChange, onClear, placeholder }: any) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.length > 0
    ? items.filter((i: any) => i.name.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  if (value) return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, background: C.lift3, borderRadius: 10, padding: "8px 12px" }}>
      <span style={{ flex: 1, fontSize: 13, color: C.text }}>{value.name}</span>
      <button onClick={onClear} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
    </div>
  );

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <input
        value={query}
        placeholder={placeholder || `Search ${label?.toLowerCase() || ""}...`}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "Inter,sans-serif" }}
      />
      {open && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.lift2, borderRadius: 10, zIndex: 300, marginTop: 3, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", maxHeight: 200, overflowY: "auto" }}>
          {filtered.map((item: any) => (
            <div key={item.id} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.lift1}` }}
              onMouseDown={() => { onChange(item); setQuery(""); setOpen(false); }}>
              {item.name}
              {item.primary_role && <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>{item.primary_role}</span>}
              {item.location_type && <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>{item.location_type}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Field wrapper ──────────────────────────────────────────────────────────────

function F({ label, children, span2 = false }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: span2 ? "1 / -1" : undefined }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>}
      {children}
    </div>
  );
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.lift2}`, paddingBottom: 6, marginBottom: 2, gridColumn: "1 / -1" }}>
      {title}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

type Look = {
  id: string; status: string; cloudinary_url: string;
  source_url: string | null; source_name: string | null;
  scene: string | null; gender: string | null;
  season_display: string | null; season_term: string | null; season_year: number | null;
  date_published: string | null; is_key_look: boolean; notes: string | null;
  created_at: string; brand_id: string | null; brand_name: string;
  event_id: string | null; photo_city_id: string | null; photo_country_id: string | null;
  courtesy_brand_id: string | null; collection_title: string | null; collection_description: string | null;
  credit_count: number; tag_count: number;
};

export default function ReviewQueue() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all"|"draft"|"published"|"archived">("draft");
  const [selected, setSelected] = useState<Look | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");

  // Entity lists for typeaheads
  const [brands, setBrands] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Edit state — look fields
  const [editBrand, setEditBrand] = useState<any>(null);
  const [editScene, setEditScene] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editSeasonTerm, setEditSeasonTerm] = useState("");
  const [editSeasonYear, setEditSeasonYear] = useState("");
  const [editPublishDate, setEditPublishDate] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editSourceName, setEditSourceName] = useState("");
  const [editEvent, setEditEvent] = useState<any>(null);
  const [editPhotoCity, setEditPhotoCity] = useState<any>(null);
  const [editPhotoCountry, setEditPhotoCountry] = useState<any>(null);
  const [editCollectionTitle, setEditCollectionTitle] = useState("");
  const [editCollectionDesc, setEditCollectionDesc] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editKeyLook, setEditKeyLook] = useState(false);
  const [editCourtesy, setEditCourtesy] = useState(false);

  // Edit state — credits
  const [existingCredits, setExistingCredits] = useState<any[]>([]);
  const [editCD, setEditCD] = useState<any>(null);
  const [editPhotog, setEditPhotog] = useState<any>(null);
  const [editStylist, setEditStylist] = useState<any>(null);

  useEffect(() => { loadEntities(); }, []);
  useEffect(() => { loadLooks(); }, [statusFilter]);

  const loadEntities = async () => {
    try {
      const [b, p, e, l] = await Promise.all([
        sb("brands?select=id,name&order=name"),
        sb("people?select=id,name,primary_role&order=name"),
        sb("events?select=id,name,event_type&order=name"),
        sb("locations?select=id,name,location_type&order=location_type,name"),
      ]);
      setBrands(b); setPeople(p); setEvents(e); setLocations(l);
    } catch(e) { console.error(e); }
  };

  const loadLooks = async () => {
    setLoading(true); setSelected(null);
    try {
      const allLooks = await sb("looks?select=status");
      const c: Record<string, number> = { draft: 0, published: 0, archived: 0 };
      allLooks.forEach((l: any) => { c[l.status] = (c[l.status] || 0) + 1; });
      setCounts(c);

      const filter = statusFilter === "all" ? "" : `status=eq.${statusFilter}&`;
      const [data, tagCounts] = await Promise.all([
        sb(`looks?${filter}select=id,status,cloudinary_url,source_url,source_name,scene,gender,season_display,season_term,season_year,date_published,is_key_look,notes,created_at,brand_id,event_id,photo_city_id,photo_country_id,courtesy_brand_id,collaborating_brand_id,collection_title,collection_description,brand:brand_id(name),look_credits!look_credits_look_id_fkey(id)&order=created_at.desc&limit=200`),
        sb(`entity_tags?entity_type=eq.look&select=entity_id`),
      ]);

      // Build tag count map from entity_tags
      const tagCountMap: Record<string, number> = {};
      (tagCounts || []).forEach((t: any) => {
        tagCountMap[t.entity_id] = (tagCountMap[t.entity_id] || 0) + 1;
      });

      setLooks(data.map((l: any) => ({
        ...l,
        brand_name: l.brand?.name || "",
        credit_count: l.look_credits?.length || 0,
        tag_count: tagCountMap[l.id] || 0,
      })));
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const loadCredits = async (lookId: string) => {
    const credits = await sb(`look_credits?look_id=eq.${lookId}&select=id,role,person_id,people(id,name,primary_role)`);
    setExistingCredits(credits || []);
    const cd = credits?.find((c: any) => c.role === "creative director");
    const ph = credits?.find((c: any) => c.role === "photographer");
    const st = credits?.find((c: any) => c.role === "stylist");
    setEditCD(cd?.people || null);
    setEditPhotog(ph?.people || null);
    setEditStylist(st?.people || null);
  };

  const selectLook = (look: Look) => {
    setSelected(look);
    setEditBrand(look.brand_id ? { id: look.brand_id, name: look.brand_name } : null);
    setEditScene(look.scene || "");
    setEditGender(look.gender || "");
    setEditSeasonTerm(look.season_term || "");
    setEditSeasonYear(look.season_year?.toString() || "");
    setEditPublishDate(look.date_published || "");
    setEditSourceUrl(look.source_url || "");
    setEditSourceName(look.source_name || "");
    setEditCollectionTitle(look.collection_title || "");
    setEditCollectionDesc(look.collection_description || "");
    setEditNotes(look.notes || "");
    setEditKeyLook(look.is_key_look);
    setEditCourtesy(!!look.courtesy_brand_id);
    // Resolve FKs for event, city, country
    setEditEvent(look.event_id ? events.find(e => e.id === look.event_id) || { id: look.event_id, name: look.event_id } : null);
    setEditPhotoCity(look.photo_city_id ? locations.find(l => l.id === look.photo_city_id) || null : null);
    setEditPhotoCountry(look.photo_country_id ? locations.find(l => l.id === look.photo_country_id) || null : null);
    loadCredits(look.id);
  };

  const saveEdits = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      // Save look fields
      await sb(`looks?id=eq.${selected.id}`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({
          brand_id: editBrand?.id || null,
          scene: editScene || null,
          gender: editGender || null,
          season_term: editSeasonTerm || null,
          season_year: editSeasonYear ? parseInt(editSeasonYear) : null,
          date_published: editPublishDate || null,
          source_url: editSourceUrl || null,
          source_name: editSourceName || null,
          event_id: editEvent?.id || null,
          photo_city_id: editPhotoCity?.id || null,
          photo_country_id: editPhotoCountry?.id || null,
          collection_title: editCollectionTitle || null,
          collection_description: editCollectionDesc || null,
          notes: editNotes || null,
          is_key_look: editKeyLook,
          courtesy_brand_id: editCourtesy ? (editBrand?.id || null) : null,
        }),
      });

      // Save credits — delete existing, reinsert
      await sb(`look_credits?look_id=eq.${selected.id}`, { method: "DELETE", prefer: "" });
      const newCredits = [
        editCD && { look_id: selected.id, person_id: editCD.id, role: "creative director" },
        !editCourtesy && editPhotog && { look_id: selected.id, person_id: editPhotog.id, role: "photographer" },
        editStylist && { look_id: selected.id, person_id: editStylist.id, role: "stylist" },
      ].filter(Boolean);
      if (newCredits.length > 0) {
        await sb("look_credits", { method: "POST", body: JSON.stringify(newCredits) });
      }

      await loadLooks();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const setStatus = async (lookId: string, status: string, takedownReason?: string) => {
    setSaving(true);
    try {
      const body: any = { status };
      if (takedownReason) { body.takedown_reason = takedownReason; body.takedown_at = new Date().toISOString(); }
      await sb(`looks?id=eq.${lookId}`, { method: "PATCH", prefer: "", body: JSON.stringify(body) });
      await loadLooks();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const publishAll = async () => {
    if (!counts.draft) return;
    if (!confirm(`Publish all ${counts.draft} draft looks?`)) return;
    setSaving(true);
    try {
      await sb("looks?status=eq.draft", { method: "PATCH", prefer: "", body: JSON.stringify({ status: "published" }) });
      await loadLooks();
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const missingFields = (look: Look) => {
    const m = [];
    if (!look.brand_name) m.push("brand");
    if (!look.scene) m.push("scene");
    if (!look.gender) m.push("gender");
    if (!look.season_year) m.push("season");
    if (look.credit_count === 0) m.push("credits");
    if (look.tag_count === 0) m.push("tags");
    return m;
  };

  const cities = locations.filter(l => l.location_type === "city");
  const countries = locations.filter(l => l.location_type === "country");
  const inp = { background: C.lift3, border: "none" as const, color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "Inter,sans-serif" };
  const sel = { ...inp, cursor: "pointer" as const };

  const filteredLooks = search.trim()
    ? looks.filter(l => l.brand_name.toLowerCase().includes(search.toLowerCase()) || (l.source_name || "").toLowerCase().includes(search.toLowerCase()))
    : looks;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
        .look-row:hover { background: #2a2a2a !important; }
        .look-row.active { background: #2f2f2f !important; border-left: 2px solid #ececec !important; }
        input::placeholder, textarea::placeholder { color: #666; }
      `}</style>

      <div style={{ fontFamily: "Inter,sans-serif", background: C.bg, color: C.text, height: "calc(100vh - 44px)", display: "flex", flexDirection: "column", overflow: "hidden", fontSize: 14 }}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", borderBottom: `1px solid ${C.lift1}`, flexShrink: 0, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["draft","published","archived","all"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ background: statusFilter===s ? C.lift2 : "transparent", border: "none", color: statusFilter===s ? C.text : C.muted, padding: "6px 14px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", fontWeight: statusFilter===s ? 600 : 400 }}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
                {s !== "all" && counts[s] !== undefined && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: s==="draft" ? C.amber : C.muted }}>{counts[s]}</span>
                )}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by brand or account..."
            style={{ background: C.lift2, border: "none", color: C.text, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", width: 240, fontFamily: "Inter,sans-serif" }} />
          <div style={{ flex: 1 }} />
          {statusFilter === "draft" && !!counts.draft && (
            <button onClick={publishAll} disabled={saving}
              style={{ background: C.green, border: "none", color: "#fff", padding: "7px 18px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
              Publish all drafts ({counts.draft})
            </button>
          )}
          <span style={{ fontSize: 12, color: C.muted }}>{filteredLooks.length} looks</span>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* List */}
          <div style={{ width: selected ? "44%" : "100%", flexShrink: 0, overflowY: "auto", borderRight: selected ? `1px solid ${C.lift1}` : "none", transition: "width 0.2s" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted }}>Loading…</div>
            ) : filteredLooks.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 8, color: C.muted }}>
                <div style={{ fontSize: 32 }}>✓</div>
                <div>No {statusFilter === "all" ? "" : statusFilter} looks{search ? ` matching "${search}"` : ""}</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.lift1}` }}>
                    {["Image","Brand","Scene","Season","Credits","Tags","Missing","Status",""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: C.muted, textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLooks.map(look => {
                    const missing = missingFields(look);
                    const isActive = selected?.id === look.id;
                    return (
                      <tr key={look.id} className={`look-row${isActive?" active":""}`}
                        onClick={() => selectLook(look)}
                        style={{ borderBottom: `1px solid ${C.lift1}`, cursor: "pointer", background: isActive ? C.lift1 : "transparent", borderLeft: isActive ? `2px solid ${C.white}` : "2px solid transparent" }}>
                        <td style={{ padding: "6px 10px", width: 52 }}>
                          {look.cloudinary_url
                            ? <img src={look.cloudinary_url} alt="" style={{ width: 40, height: 48, objectFit: "cover", borderRadius: 4, display: "block" }} />
                            : <div style={{ width: 40, height: 48, background: C.lift2, borderRadius: 4 }} />}
                        </td>
                        <td style={{ padding: "6px 10px", maxWidth: 130 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: look.brand_name ? C.text : C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{look.brand_name || "—"}</div>
                          {look.source_name && !look.brand_name && <div style={{ fontSize: 11, color: C.muted }}>{look.source_name}</div>}
                        </td>
                        <td style={{ padding: "6px 10px" }}><span style={{ fontSize: 12, color: look.scene ? C.text : C.dim }}>{look.scene || "—"}</span></td>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}><span style={{ fontSize: 12, color: look.season_display ? C.text : C.dim }}>{look.season_display || (look.season_year?.toString()) || "—"}</span></td>
                        <td style={{ padding: "6px 10px" }}><span style={{ fontSize: 12, color: look.credit_count > 0 ? C.green : C.dim }}>{look.credit_count}</span></td>
                        <td style={{ padding: "6px 10px" }}><span style={{ fontSize: 12, color: look.tag_count > 0 ? C.text : C.dim }}>{look.tag_count}</span></td>
                        <td style={{ padding: "6px 10px", maxWidth: 140 }}>
                          {missing.length > 0
                            ? <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{missing.map(m => <span key={m} style={{ fontSize: 10, background: "#3a2a1a", color: C.amber, padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>{m}</span>)}</div>
                            : <span style={{ fontSize: 12, color: C.green }}>✓</span>}
                        </td>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11, color: look.status==="draft" ? C.amber : look.status==="published" ? C.green : C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{look.status}</span>
                          {look.is_key_look && <span style={{ marginLeft: 5, fontSize: 10, color: C.white, background: C.lift2, padding: "1px 5px", borderRadius: 10 }}>key</span>}
                        </td>
                        <td style={{ padding: "6px 10px" }} onClick={e => e.stopPropagation()}>
                          {look.status==="draft" && <button onClick={() => setStatus(look.id,"published")} style={{ background: C.green, border: "none", color: "#fff", padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>Publish</button>}
                          {look.status==="published" && <button onClick={() => setStatus(look.id,"archived","manual")} style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>Archive</button>}
                          {look.status==="archived" && <button onClick={() => setStatus(look.id,"published")} style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>Restore</button>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Detail panel */}
          {selected && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>

              {/* Image */}
              <div style={{ position: "relative", background: "#181818", flexShrink: 0 }}>
                <img src={selected.cloudinary_url} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} />
                <button onClick={() => setSelected(null)}
                  style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: "none", color: C.text, width: 30, height: 30, borderRadius: 15, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>
                  ×
                </button>
                {selected.source_url && (
                  <a href={selected.source_url} target="_blank" rel="noreferrer"
                    style={{ position: "absolute", top: 10, left: 10, fontSize: 12, color: C.text, textDecoration: "none", background: "rgba(0,0,0,0.7)", padding: "5px 10px", borderRadius: 12, fontWeight: 500, fontFamily: "Inter,sans-serif" }}>
                    ↗ source
                  </a>
                )}
              </div>

              {/* Fields */}
              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

                {/* Meta */}
                <div style={{ fontSize: 12, color: C.muted }}>
                  Ingested {new Date(selected.created_at).toLocaleDateString()} · {selected.credit_count} credits · {selected.tag_count} tags
                </div>

                {/* Grid of all fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  {/* ATTRIBUTION */}
                  <SectionHead title="Attribution" />

                  <F label="Brand" span2>
                    <Typeahead items={brands} value={editBrand} onChange={setEditBrand} onClear={() => { setEditBrand(null); setEditCourtesy(false); }} placeholder="Search brand..." />
                  </F>

                  <F label="Creative Director" span2>
                    <Typeahead items={people.filter((p:any) => p.primary_role==="creative_director")} value={editCD} onChange={setEditCD} onClear={() => setEditCD(null)} placeholder="Search creative director..." />
                  </F>

                  <F label="" span2>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: editBrand?"pointer":"default", fontSize: 13, color: editBrand ? C.text : C.dim, userSelect: "none" }}>
                      <input type="checkbox" checked={editCourtesy} disabled={!editBrand} onChange={e => { setEditCourtesy(e.target.checked); if(e.target.checked) setEditPhotog(null); }} style={{ accentColor: C.white, cursor: "pointer" }} />
                      Courtesy of brand
                      {!editBrand && <span style={{ fontSize: 11, color: C.dim, fontStyle: "italic" }}>— select a brand first</span>}
                    </label>
                  </F>

                  {!editCourtesy && (
                    <F label="Photographer" span2>
                      <Typeahead items={people.filter((p:any) => p.primary_role==="photographer")} value={editPhotog} onChange={setEditPhotog} onClear={() => setEditPhotog(null)} placeholder="Search photographer..." />
                    </F>
                  )}

                  <F label="Stylist" span2>
                    <Typeahead items={people.filter((p:any) => p.primary_role==="stylist")} value={editStylist} onChange={setEditStylist} onClear={() => setEditStylist(null)} placeholder="Search stylist..." />
                  </F>

                  {/* CONTEXT */}
                  <SectionHead title="Context" />

                  <F label="Scene">
                    <select value={editScene} onChange={e => setEditScene(e.target.value)} style={sel}>
                      <option value="">— select —</option>
                      <option value="runway">Runway</option>
                      <option value="street">Street</option>
                      <option value="editorial">Editorial</option>
                      <option value="designer_showcase">Designer Showcase</option>
                      <option value="lookbook">Lookbook</option>
                      <option value="presentation">Presentation</option>
                      <option value="other">Other</option>
                    </select>
                  </F>

                  <F label="Gender">
                    <select value={editGender} onChange={e => setEditGender(e.target.value)} style={sel}>
                      <option value="">— select —</option>
                      <option value="womenswear">Womenswear</option>
                      <option value="menswear">Menswear</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </F>

                  <F label="Season">
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={editSeasonTerm} onChange={e => setEditSeasonTerm(e.target.value)} style={{ ...sel, flex: 1 }}>
                        <option value="">— term —</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="Fall">Fall</option>
                        <option value="Winter">Winter</option>
                        <option value="Resort">Resort</option>
                        <option value="Pre-Fall">Pre-Fall</option>
                        <option value="No Season">No Season</option>
                      </select>
                      <input value={editSeasonYear} onChange={e => setEditSeasonYear(e.target.value)} placeholder="2025" maxLength={4} style={{ ...inp, width: 68, flexShrink: 0 }} />
                    </div>
                  </F>

                  <F label="Publish Date">
                    <input type="date" value={editPublishDate} onChange={e => setEditPublishDate(e.target.value)} style={inp} />
                  </F>

                  <F label="Event" span2>
                    <Typeahead items={events} value={editEvent} onChange={setEditEvent} onClear={() => setEditEvent(null)} placeholder="Search event..." />
                  </F>

                  <F label="Key Look" span2>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.text, userSelect: "none", paddingTop: 2 }}>
                      <input type="checkbox" checked={editKeyLook} onChange={e => setEditKeyLook(e.target.checked)} style={{ accentColor: C.white, cursor: "pointer", width: 15, height: 15 }} />
                      Mark as key look
                    </label>
                  </F>

                  {/* LOCATION */}
                  <SectionHead title="Photo Location" />

                  <F label="City">
                    <Typeahead items={cities} value={editPhotoCity} onChange={setEditPhotoCity} onClear={() => setEditPhotoCity(null)} placeholder="Search city..." />
                  </F>

                  <F label="Country">
                    <Typeahead items={countries} value={editPhotoCountry} onChange={setEditPhotoCountry} onClear={() => setEditPhotoCountry(null)} placeholder="Search country..." />
                  </F>

                  {/* SOURCE */}
                  <SectionHead title="Source" />

                  <F label="Post URL" span2>
                    <input value={editSourceUrl} onChange={e => setEditSourceUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." style={inp} />
                  </F>

                  <F label="Source Account" span2>
                    <input value={editSourceName} onChange={e => setEditSourceName(e.target.value)} placeholder="@account_handle" style={inp} />
                  </F>

                  {/* COLLECTION */}
                  <SectionHead title="Collection" />

                  <F label="Collection Title" span2>
                    <input value={editCollectionTitle} onChange={e => setEditCollectionTitle(e.target.value)} placeholder="e.g. Folklorics, Dual Mandate" style={inp} />
                  </F>

                  <F label="Collection Description" span2>
                    <textarea value={editCollectionDesc} onChange={e => setEditCollectionDesc(e.target.value)} rows={3} placeholder="Editorial narrative about this collection..." style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
                  </F>

                  {/* NOTES */}
                  <SectionHead title="Notes" />

                  <F label="" span2>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} placeholder="Internal scratchpad..." style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
                  </F>
                </div>

                {/* Missing fields */}
                {missingFields(selected).length > 0 && (
                  <div style={{ background: "#2a1f0a", border: "1px solid #5a3a0a", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginBottom: 3 }}>Missing fields</div>
                    <div style={{ fontSize: 12, color: "#c8a060" }}>{missingFields(selected).join(", ")}</div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: 10, paddingBottom: 20 }}>
                  <button onClick={saveEdits} disabled={saving}
                    style={{ background: C.white, border: "none", color: "#212121", padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  {selected.status==="draft" && (
                    <button onClick={() => setStatus(selected.id,"published")} disabled={saving}
                      style={{ background: C.green, border: "none", color: "#fff", padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                      Publish
                    </button>
                  )}
                  {selected.status==="published" && (
                    <button onClick={() => setStatus(selected.id,"archived","manual")} disabled={saving}
                      style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                      Archive
                    </button>
                  )}
                  {selected.status==="archived" && (
                    <button onClick={() => setStatus(selected.id,"published")} disabled={saving}
                      style={{ background: C.lift2, border: "none", color: C.text, padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                      Restore
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
