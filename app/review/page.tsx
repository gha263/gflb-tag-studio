// ── REVIEW PAGE → app/review/page.tsx ────────────────────────────────────────
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { sb, sbAll, H, SUPABASE_URL } from "@/lib/supabase";
import { C, FONT_IMPORT } from "@/lib/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str: string) {
  // Unaccent so global names produce clean ASCII slugs: "Andrés Durán" →
  // "andres-duran", "João" → "joao", "Gökhan Yavaş" → "gokhan-yavas". Without
  // this, the [^a-z0-9] regex below would eat every diacritic and turn
  // "Andrés" into "andr-s". Two-stage:
  //
  //   1. Explicit map for Latin-extended characters that DON'T decompose
  //      under Unicode NFD — Đ/đ, Ø/ø, Ł/ł, ß, Æ/æ, Œ/œ, ı/İ, Ð/ð, Þ/þ.
  //      These stay as-is after NFD, so the regex would strip them without
  //      the map. Ordering matters: apply the map before NFD.
  //
  //   2. NFD decomposes accented characters into base letter + combining
  //      marks (é → e + ◌́), then the combining-marks range (U+0300–U+036F)
  //      is stripped. Handles the vast majority of Latin diacritics.
  const map: Record<string, string> = {
    "Đ": "d", "đ": "d", "Ð": "d", "ð": "d",
    "Ø": "o", "ø": "o",
    "Ł": "l", "ł": "l",
    "ß": "ss",
    "Æ": "ae", "æ": "ae",
    "Œ": "oe", "œ": "oe",
    "ı": "i", "İ": "i",
    "Þ": "th", "þ": "th",
  };
  return str
    .split("").map(c => map[c] ?? c).join("")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Deterministic ordering for brand/person credits after the credit_order
// column was dropped (Aug 2026, flip_designer_attribution migration).
// Primary key is created_at (INSERT order); brand_id / person_id breaks
// ties for rows inserted in the same batch (which share a timestamp). This
// gives the same row-by-row output every render, so the "primary brand"
// derived from credits[0] is stable.
function cmpByCreatedAtThen(idKey: "brand_id" | "person_id") {
  return (a: any, b: any) => {
    const aC = a?.created_at || "";
    const bC = b?.created_at || "";
    if (aC !== bC) return aC.localeCompare(bC);
    return (a?.[idKey] || "").localeCompare(b?.[idKey] || "");
  };
}

// ── Labelled Typeahead ────────────────────────────────────────────────────────

function Typeahead({ items, value, onChange, onClear, placeholder, onCreateClick, onRename, width }: any) {
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

  const wrapStyle = width
    ? { position: "relative" as const, width, flexShrink: 0 }
    : { position: "relative" as const, flex: 1 };

  // When onRename is passed, the chip carries a pencil affordance next to the ×.
  // Used by contributor rows so a handle-shaped placeholder person (e.g.
  // `ivandarioramirez89` captured by the Chrome extension) can be renamed to
  // the real display name in place — without clearing the chip and typing
  // fresh, which would create a new orphaned people row rather than editing
  // the existing one. onRename receives the current value; the parent owns
  // the modal state.
  if (value) return (
    <div style={{ ...wrapStyle, display: "flex", alignItems: "center", gap: 6, background: C.lift3, borderRadius: 10, padding: "8px 12px" }}>
      <span style={{ flex: 1, fontSize: 13, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</span>
      {onRename && (
        <button
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onRename(value); }}
          title="Rename this person"
          style={{ background: "none", border: "none", color: C.muted, fontSize: 13, cursor: "pointer", padding: "0 2px", lineHeight: 1, opacity: 0.7 }}
          onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = C.text; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.color = C.muted; }}
        >✎</button>
      )}
      <button tabIndex={-1} onClick={onClear} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
    </div>
  );

  return (
    <div style={wrapStyle} ref={ref}>
      <input
        value={query}
        placeholder={placeholder || "Search..."}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === "Tab" || e.key === "Escape") setOpen(false); }}
        style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box", fontFamily: "Inter,sans-serif" }}
      />
      {open && (filtered.length > 0 || (query.length > 1 && onCreateClick)) && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: C.lift2, borderRadius: 10, zIndex: 300, marginTop: 3, boxShadow: "0 4px 16px rgba(0,0,0,0.4)", maxHeight: 200, overflowY: "auto" }}>
          {filtered.map((item: any) => (
            <div key={item.id} style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: C.text, borderBottom: `1px solid ${C.lift1}` }}
              onMouseDown={() => { onChange(item); setQuery(""); setOpen(false); }}>
              {item.name}
              {item.primary_role && <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>{item.primary_role}</span>}
              {item.location_type && <span style={{ marginLeft: 8, fontSize: 11, color: C.muted }}>{item.location_type}</span>}
            </div>
          ))}
          {query.length > 1 && onCreateClick && !filtered.find((i: any) => i.name.toLowerCase() === query.toLowerCase()) && (
            <div onMouseDown={() => { onCreateClick(query); setQuery(""); setOpen(false); }}
              style={{ padding: "8px 12px", cursor: "pointer", fontSize: 13, color: "#4a9eff", fontWeight: 500 }}>
              + Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Create modals ─────────────────────────────────────────────────────────────

function CreatePersonModal({ initialName, role, roles, onSave, onClose, onCreateRole }: any) {
  const [name, setName] = useState(initialName || "");
  const [selectedRole, setSelectedRole] = useState<any>(
    () => roles.find((r: any) => r.slug === (role || "").replace(/_/g, "-")) || null
  );
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await fetch(`${SUPABASE_URL}/rest/v1/people`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ name: name.trim(), slug: slugify(name), primary_role: selectedRole?.name || null, instagram_url: ig.trim() || null, website: website.trim() || null }),
      });
      if (!result.ok) throw new Error(await result.text());
      const [created] = await result.json();
      onSave(created);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const inp2 = { background: C.lift3, border: "none" as const, color: "#ececec", padding: "9px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "Inter,sans-serif" };
  const lbl = { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.07em" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.lift1, borderRadius: 18, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.lift2}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#ececec" }}>New Person</span>
          <button tabIndex={-1} onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", padding: 0 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={lbl}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus style={inp2} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={lbl}>Role</label>
            <Typeahead
              items={roles}
              value={selectedRole}
              onChange={(r: any) => setSelectedRole(r)}
              onClear={() => setSelectedRole(null)}
              placeholder="Search or create role..."
              onCreateClick={async (newRoleName: string) => {
                const created = await onCreateRole(newRoleName);
                if (created) setSelectedRole(created);
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={lbl}>Instagram URL</label>
            <input value={ig} onChange={e => setIg(e.target.value)} placeholder="https://instagram.com/handle" style={inp2} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={lbl}>Website</label>
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." style={inp2} />
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button tabIndex={-1} onClick={onClose} style={{ background: C.lift2, border: "none", color: C.muted, padding: "8px 18px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: "#ececec", border: "none", color: "#212121", padding: "8px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving || !name.trim() ? 0.4 : 1 }}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateBrandModal({ initialName, locations, people, onSave, onPersonCreated, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState<any>(null);
  const [city, setCity] = useState<any>(null);
  // directors: multiple rows, each with a person (existing or {isNew,name}) and a role
  // that becomes the new person's primary_role. Roles chosen from what the DB actually
  // uses on brand_directors links (designer=225, creative director=8, founder as an
  // editorial concept). An existing person's primary_role is left untouched.
  type DirectorRow = { key: string; person: any; role: string };
  const [directors, setDirectors] = useState<DirectorRow[]>([
    { key: `d-init-${Date.now()}`, person: null, role: "designer" },
  ]);
  const addDirector = () => setDirectors(prev => [...prev, { key: `d-${Date.now()}-${prev.length}`, person: null, role: "designer" }]);
  const removeDirector = (key: string) => setDirectors(prev => prev.filter(d => d.key !== key));
  const updateDirectorPerson = (key: string, person: any) => setDirectors(prev => prev.map(d => d.key === key ? { ...d, person } : d));
  const updateDirectorRole = (key: string, role: string) => setDirectors(prev => prev.map(d => d.key === key ? { ...d, role } : d));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      // 1. Create brand
      const brandRes = await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ name: name.trim(), slug: slugify(name), instagram_handle: ig.trim() || null, website: website.trim() || null, country_id: country?.id || null, city_id: city?.id || null }),
      });
      if (!brandRes.ok) throw new Error(await brandRes.text());
      const [createdBrand] = await brandRes.json();

      // 2. For each director row that has a person, create the person if new and
      // link via brand_directors. Failures on one row don't abort the others —
      // we collect them and surface at the end. Empty rows (no person picked)
      // are skipped silently.
      const failures: string[] = [];
      for (const d of directors) {
        if (!d.person) continue;
        try {
          let personId = d.person.isNew ? null : d.person.id;
          if (d.person.isNew && d.person.name) {
            const personRes = await fetch(`${SUPABASE_URL}/rest/v1/people`, {
              method: "POST",
              headers: { ...H, Prefer: "return=representation" },
              body: JSON.stringify({ name: d.person.name.trim(), slug: slugify(d.person.name), primary_role: d.role }),
            });
            if (!personRes.ok) throw new Error(await personRes.text());
            const [createdPerson] = await personRes.json();
            personId = createdPerson.id;
            if (onPersonCreated) onPersonCreated(createdPerson);
          }
          if (personId && createdBrand.id) {
            const linkRes = await fetch(`${SUPABASE_URL}/rest/v1/brand_directors`, {
              method: "POST",
              headers: { ...H, Prefer: "return=minimal" },
              body: JSON.stringify({ brand_id: createdBrand.id, person_id: personId, is_current: true }),
            });
            if (!linkRes.ok) throw new Error(await linkRes.text());
          }
        } catch (e: any) {
          failures.push(`${d.person.name || "person"}: ${e.message}`);
        }
      }
      if (failures.length > 0) {
        alert(`Brand created, but some director links failed:\n${failures.join("\n")}`);
      }

      onSave(createdBrand);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const inp2 = { background: C.lift3, border: "none" as const, color: "#ececec", padding: "9px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "Inter,sans-serif" };
  const lbl = { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.07em" };
  const countries = (locations || []).filter((l: any) => l.location_type === "country");
  const cities = (locations || []).filter((l: any) => l.location_type === "city");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.lift1, borderRadius: 18, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.lift2}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#ececec" }}>New Brand</span>
          <button tabIndex={-1} onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", padding: 0 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus style={inp2} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Instagram Handle</label><input value={ig} onChange={e => setIg(e.target.value)} placeholder="@handle" style={inp2} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Website</label><input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." style={inp2} /></div>
          {countries.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Country</label><Typeahead items={countries} value={country} onChange={setCountry} onClear={() => setCountry(null)} placeholder="Search country..." /></div>}
          {cities.length > 0 && <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>City</label><Typeahead items={cities} value={city} onChange={setCity} onClear={() => setCity(null)} placeholder="Search city..." /></div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={lbl}>Directors</label>
            {directors.map(d => (
              <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {d.person ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.lift3, borderRadius: 10, padding: "8px 12px" }}>
                      <span style={{ flex: 1, fontSize: 13, color: "#ececec", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.person.name}</span>
                      {d.person.isNew && <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>new</span>}
                      <button onClick={() => updateDirectorPerson(d.key, null)} tabIndex={-1} style={{ background: "none", border: "none", color: C.muted, fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  ) : (
                    <Typeahead
                      items={people || []}
                      value={null}
                      onChange={(p: any) => updateDirectorPerson(d.key, p)}
                      onClear={() => updateDirectorPerson(d.key, null)}
                      placeholder="Search or create..."
                      onCreateClick={(n: string) => updateDirectorPerson(d.key, { isNew: true, name: n, id: null })}
                    />
                  )}
                </div>
                <select value={d.role} onChange={e => updateDirectorRole(d.key, e.target.value)} style={{ background: C.lift3, border: "none", color: "#ececec", padding: "9px 10px", fontSize: 12, borderRadius: 10, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", flexShrink: 0 }}>
                  <option value="designer">Designer</option>
                  <option value="creative director">Creative Director</option>
                  <option value="founder">Founder</option>
                </select>
                {directors.length > 1 && (
                  <button onClick={() => removeDirector(d.key)} tabIndex={-1} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}>×</button>
                )}
              </div>
            ))}
            <button onClick={addDirector} style={{ alignSelf: "flex-start", background: "transparent", border: `1.5px dashed ${C.lift3}`, color: C.muted, padding: "6px 12px", fontSize: 12, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>+ Add director</button>
          </div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button tabIndex={-1} onClick={onClose} style={{ background: C.lift2, border: "none", color: C.muted, padding: "8px 18px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: "#ececec", border: "none", color: "#212121", padding: "8px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving || !name.trim() ? 0.4 : 1 }}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreatePublicationModal({ initialName, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [pubType, setPubType] = useState("magazine");
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const result = await fetch(`${SUPABASE_URL}/rest/v1/publications`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ name: name.trim(), slug: slugify(name), publication_type: pubType, instagram_handle: ig.trim() || null, website: website.trim() || null }),
      });
      if (!result.ok) throw new Error(await result.text());
      const [created] = await result.json();
      onSave(created);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  const inp2 = { background: C.lift3, border: "none" as const, color: "#ececec", padding: "9px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "Inter,sans-serif" };
  const lbl = { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.07em" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: C.lift1, borderRadius: 18, width: "100%", maxWidth: 400, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.lift2}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#ececec" }}>New Publication</span>
          <button tabIndex={-1} onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", padding: 0 }}>×</button>
        </div>
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Name *</label><input value={name} onChange={e => setName(e.target.value)} autoFocus style={inp2} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label style={lbl}>Type</label>
            <select value={pubType} onChange={e => setPubType(e.target.value)} style={{ ...inp2, cursor: "pointer" }}>
              <option value="magazine">Magazine</option>
              <option value="digital">Digital</option>
              <option value="newspaper">Newspaper</option>
              <option value="trade">Trade</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Instagram Handle</label><input value={ig} onChange={e => setIg(e.target.value)} placeholder="@harpersbazaarserbia" style={inp2} /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}><label style={lbl}>Website</label><input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." style={inp2} /></div>
        </div>
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button tabIndex={-1} onClick={onClose} style={{ background: C.lift2, border: "none", color: C.muted, padding: "8px 18px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !name.trim()} style={{ background: "#ececec", border: "none", color: "#212121", padding: "8px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving || !name.trim() ? 0.4 : 1 }}>
            {saving ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Rename / Merge modal ──────────────────────────────────────────────────────
// Opens from the pencil icon on a Person Typeahead chip. Two views:
//
//   1. RENAME (default)  — name input + auto-computed slug preview → PATCH people.
//      If Postgres rejects on slug uniqueness (23505), we treat that as "the
//      real record already exists" and morph into the merge view.
//
//   2. MERGE CONFIRM     — shows credit counts on both records and confirms
//      → calls the merge_people(source, target) RPC atomically. RPC handles
//      collision inside look_credits (drops source rows that would collide
//      with an existing target row on look_id+role) and returns a summary.
//
// The parent (ReviewQueue) owns after-effects:
//   - onRenamed(updated)  → patch `people` list + swap in-place on any
//     contributor row currently referencing this id
//   - onMerged({source, target, ...counts}) → drop source from `people`,
//     ensure target is in list, then loadDetail() to refresh the snapshot
//     that saveEdits diffs against (stale snapshot after a merge would
//     produce wrong deletes on next save)

function RenamePersonModal({ person, onClose, onRenamed, onMerged }: {
  person: any;
  onClose: () => void;
  onRenamed: (updated: { id: string; name: string; slug: string }) => void;
  onMerged: (result: { source: any; target: any; credits_moved: number; credits_dropped: number; directors_moved: number; directors_dropped: number; education_moved: number; prior_role_moved: number }) => void;
}) {
  const [name, setName] = useState(person.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collision, setCollision] = useState<{
    target: { id: string; name: string; slug: string };
    sourceCredits: number;
    targetCredits: number;
  } | null>(null);

  const newSlug = slugify(name);
  const noChange = name.trim() === (person.name || "") && newSlug === (person.slug || "");
  const canRename = !!name.trim() && !noChange && !saving;

  async function handleRename() {
    if (!canRename) return;
    setSaving(true); setError(null);
    try {
      await sb(`people?id=eq.${person.id}`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({ name: name.trim(), slug: newSlug }),
      });
      onRenamed({ id: person.id, name: name.trim(), slug: newSlug });
      onClose();
    } catch (e: any) {
      const msg = e?.message || "";
      // Postgres 23505 = unique_violation on slug — a person with this
      // display name already exists. Look up the target so the user can
      // confirm the merge instead of forcing a manual reconciliation.
      const isDup = msg.includes("23505") || /duplicate key/i.test(msg);
      if (isDup) {
        try {
          const rows = await sb(`people?slug=eq.${newSlug}&select=id,name,slug`);
          if (Array.isArray(rows) && rows.length > 0) {
            const target = rows[0];
            if (target.id === person.id) {
              // Shouldn't happen (same-slug PATCH would no-op), but guard anyway
              setError("Slug matches the same record — try a different name.");
            } else {
              // Fetch credit counts so the confirm shows what's actually moving
              const [sc, tc] = await Promise.all([
                sb(`look_credits?person_id=eq.${person.id}&select=id`),
                sb(`look_credits?person_id=eq.${target.id}&select=id`),
              ]);
              setCollision({
                target,
                sourceCredits: Array.isArray(sc) ? sc.length : 0,
                targetCredits: Array.isArray(tc) ? tc.length : 0,
              });
            }
          } else {
            setError("Name conflict, but the matching record couldn't be found. Reload and try again.");
          }
        } catch (lookupErr: any) {
          setError(`Name conflict, and lookup of the existing record failed: ${lookupErr?.message || "unknown"}`);
        }
      } else {
        setError(msg || "Rename failed");
      }
    }
    setSaving(false);
  }

  async function handleMerge() {
    if (!collision) return;
    setSaving(true); setError(null);
    try {
      // PostgREST /rpc/ endpoint returns the function's jsonb return value
      // directly as the response body. sb() parses it.
      const result = await sb("rpc/merge_people", {
        method: "POST", prefer: "",
        body: JSON.stringify({ source_id: person.id, target_id: collision.target.id }),
      });
      onMerged({
        source: person,
        target: collision.target,
        credits_moved:     result?.credits_moved     ?? 0,
        credits_dropped:   result?.credits_dropped   ?? 0,
        directors_moved:   result?.directors_moved   ?? 0,
        directors_dropped: result?.directors_dropped ?? 0,
        education_moved:   result?.education_moved   ?? 0,
        prior_role_moved:  result?.prior_role_moved  ?? 0,
      });
      onClose();
    } catch (e: any) {
      setError(e?.message || "Merge failed");
    }
    setSaving(false);
  }

  const inp2 = { background: C.lift3, border: "none" as const, color: "#ececec", padding: "9px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "Inter,sans-serif" };
  const lbl = { fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase" as const, letterSpacing: "0.07em" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={() => { if (!saving) onClose(); }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: C.lift1, borderRadius: 18, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.lift2}` }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#ececec" }}>
            {collision ? "Merge into existing record?" : "Rename person"}
          </span>
          <button tabIndex={-1} onClick={onClose} disabled={saving}
            style={{ background: "none", border: "none", color: C.muted, fontSize: 22, cursor: saving ? "default" : "pointer", padding: 0, opacity: saving ? 0.4 : 1 }}>×</button>
        </div>

        {!collision ? (
          // ── Rename view ────────────────────────────────────────────────────
          <>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={lbl}>Current</label>
                <div style={{ fontSize: 13, color: C.muted, background: C.lift2, padding: "8px 12px", borderRadius: 10, lineHeight: 1.4 }}>
                  {person.name}
                  <span style={{ marginLeft: 8, fontSize: 11, color: C.dim, fontFamily: "monospace" }}>/{person.slug}</span>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={lbl}>New name</label>
                <input value={name} onChange={e => setName(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === "Enter" && canRename) handleRename(); }}
                  placeholder="e.g. Jose Luis Santa"
                  style={inp2} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <label style={lbl}>Slug (auto)</label>
                <div style={{ fontSize: 12, color: C.dim, fontFamily: "monospace", background: C.lift2, padding: "8px 12px", borderRadius: 10 }}>
                  /{newSlug || "—"}
                </div>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: C.red, background: "rgba(224,90,78,0.1)", border: `1px solid ${C.red}`, borderRadius: 8, padding: "8px 12px" }}>
                  {error}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button tabIndex={-1} onClick={onClose} disabled={saving}
                style={{ background: C.lift2, border: "none", color: C.muted, padding: "8px 18px", fontSize: 13, cursor: saving ? "default" : "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={handleRename} disabled={!canRename}
                style={{ background: "#ececec", border: "none", color: "#212121", padding: "8px 20px", fontSize: 13, cursor: canRename ? "pointer" : "default", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: canRename ? 1 : 0.4 }}>
                {saving ? "Saving…" : "Rename"}
              </button>
            </div>
          </>
        ) : (
          // ── Merge confirm view ─────────────────────────────────────────────
          <>
            <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                A person named <strong style={{ color: C.white }}>{collision.target.name}</strong> already exists.
                Instead of creating another record, fold this one into the existing one:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center" }}>
                <div style={{ background: C.lift2, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 3 }}>{person.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{collision.sourceCredits}</div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>credits</div>
                </div>
                <div style={{ fontSize: 18, color: C.muted }}>→</div>
                <div style={{ background: C.lift2, borderRadius: 10, padding: "10px 12px", textAlign: "center", border: `1px solid ${C.green}` }}>
                  <div style={{ fontSize: 12, color: C.green, marginBottom: 3 }}>{collision.target.name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{collision.sourceCredits + collision.targetCredits}</div>
                  <div style={{ fontSize: 10, color: C.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>credits</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                All references to <span style={{ color: C.text }}>{person.name}</span> (credits, brand-director rows, education, prior-role) will move to <span style={{ color: C.text }}>{collision.target.name}</span>, then the placeholder record will be deleted.
                Any credit that already exists on the target for the same look + role will be dropped (target keeps its own).
                <span style={{ color: C.red, fontWeight: 500 }}> This can't be undone.</span>
              </div>
              {error && (
                <div style={{ fontSize: 12, color: C.red, background: "rgba(224,90,78,0.1)", border: `1px solid ${C.red}`, borderRadius: 8, padding: "8px 12px" }}>
                  {error}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 20px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "space-between", gap: 10 }}>
              <button tabIndex={-1} onClick={() => setCollision(null)} disabled={saving}
                style={{ background: "none", border: "none", color: C.muted, padding: "8px 4px", fontSize: 12, cursor: saving ? "default" : "pointer", fontFamily: "Inter,sans-serif" }}>
                ← Back to rename
              </button>
              <div style={{ display: "flex", gap: 10 }}>
                <button tabIndex={-1} onClick={onClose} disabled={saving}
                  style={{ background: C.lift2, border: "none", color: C.muted, padding: "8px 18px", fontSize: 13, cursor: saving ? "default" : "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                  Cancel
                </button>
                <button onClick={handleMerge} disabled={saving} autoFocus
                  style={{ background: C.red, border: "none", color: "#fff", padding: "8px 20px", fontSize: 13, cursor: saving ? "default" : "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                  {saving ? "Merging…" : "Yes, merge"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function F({ label, children, span2 = false }: any) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: span2 ? "1 / -1" : undefined }}>
      {label && <label style={{ fontSize: 11, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</label>}
      {children}
    </div>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: C.muted, borderBottom: `1px solid ${C.lift2}`, paddingBottom: 6, marginBottom: 2, gridColumn: "1 / -1" }}>
      {title}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Look = {
  id: string; status: string; cloudinary_url: string;
  source_url: string | null; source_name: string | null;
  scene: string | null; gender: string | null;
  season_display: string | null; season_term: string | null; season_year: number | null;
  date_published: string | null; is_key_look: boolean; notes: string | null;
  created_at: string; is_collaboration: boolean; event_id: string | null;
  collection_title: string | null; collection_description: string | null;
  publication_id: string | null; publication_issue_month: number | null;
  publication_issue_year: number | null;
  brands_display: string; brand_count: number; credit_count: number; tag_count: number;
};

// dbId: the row's real look_credits/look_brand_credits id when loaded from
// the database, null for rows added in this editing session. Used by
// saveEdits to know exactly which old rows to remove after the new set
// has been written successfully — never delete-then-hope-insert-works.
type Contributor = { key: string; role: any; person: any; dbId?: string | null };
type BrandRow = { key: string; brand: any; isCourtesy: boolean; dbId?: string | null };

let contributorClipboard: { person: any; role: any }[] = [];

export default function ReviewQueue() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all"|"draft"|"published"|"archived">(() => {
    if (typeof window !== "undefined") {
      const s = new URLSearchParams(window.location.search).get("status");
      if (s && ["draft","published","archived","all"].includes(s)) return s as any;
    }
    return "draft";
  });
  const [selected, setSelected] = useState<Look | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sceneFilter, setSceneFilter] = useState("");
  const [pubFilter, setPubFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "oldest">(() => {
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("review_sort");
      if (v === "oldest" || v === "newest") return v;
    }
    return "newest";
  });
  useEffect(() => {
    try { localStorage.setItem("review_sort", sortMode); } catch {}
  }, [sortMode]);

  const [brands, setBrands] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [pubList, setPubList] = useState<any[]>([]);
  const [creditRoles, setCreditRoles] = useState<any[]>([]);

  const [brandRows, setBrandRows] = useState<BrandRow[]>([]);
  const [editIsCollab, setEditIsCollab] = useState(false);
  const [contributors, setContributors] = useState<Contributor[]>([]);
  // Immutable snapshots of what's in the DB, captured at loadDetail time.
  // saveEdits diffs the editable state against these instead of blindly
  // deleting-and-reinserting everything, so re-saving unchanged credits
  // doesn't collide with the unique(look_id, brand_id/person_id, role)
  // constraints, and a mid-save failure can't wipe rows that never changed.
  const [originalBrandCredits, setOriginalBrandCredits] = useState<{ dbId: string; brandId: string; role: string | null }[]>([]);
  const [originalCredits, setOriginalCredits] = useState<{ dbId: string; personId: string; role: string }[]>([]);

  const [editScene, setEditScene] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editSeasonTerm, setEditSeasonTerm] = useState("");
  const [editSeasonYear, setEditSeasonYear] = useState("");
  const [editPublishDate, setEditPublishDate] = useState("");
  const [editSourceUrl, setEditSourceUrl] = useState("");
  const [editSourceName, setEditSourceName] = useState("");
  const [editCloudinaryUrl, setEditCloudinaryUrl] = useState("");
  const [editPublication, setEditPublication] = useState<any>(null);
  const [editPublicationIssueMonth, setEditPublicationIssueMonth] = useState("");
  const [editPublicationIssueYear, setEditPublicationIssueYear] = useState("");
  const [editEvent, setEditEvent] = useState<any>(null);
  const [editCollectionTitle, setEditCollectionTitle] = useState("");
  const [editCollectionDesc, setEditCollectionDesc] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editKeyLook, setEditKeyLook] = useState(false);

  // Delete state
  const [deletePending, setDeletePending] = useState<Look | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [personModal, setPersonModal] = useState<{name: string; role: string; target: string} | null>(null);
  const [brandModal, setBrandModal] = useState<{name: string; target: string} | null>(null);
  const [publicationModal, setPublicationModal] = useState<string | null>(null);
  // Rename-affordance modal for handle-shaped placeholder people. The Chrome
  // extension captures IG posts as-is, so `name` and `slug` come in as the
  // account handle (e.g. `ivandarioramirez89`) rather than the display name
  // (Ivan Dario Ramirez). Users used to have to clear the chip + retype,
  // which created a brand-new person row and orphaned the placeholder. This
  // modal PATCHes the existing row in place, or offers merge-into-existing
  // if the display name matches an already-real person.
  const [renamePerson, setRenamePerson] = useState<any | null>(null);

  const [checkedContributors, setCheckedContributors] = useState<Set<string>>(new Set());
  const [clipboardFlash, setClipboardFlash] = useState(false);
  const pendingLookId = useRef<string | null>(
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("look") : null
  );

  useEffect(() => { loadEntities(); }, []);
  useEffect(() => { loadLooks(); }, []);

  // Open look from URL param once the list is loaded
  useEffect(() => {
    if (loading || !pendingLookId.current || looks.length === 0) return;
    const look = looks.find(l => l.id === pendingLookId.current);
    if (look) {
      // Switch to the look's status tab so it's visible in the list
      setStatusFilter(look.status as any);
      selectLook(look);
      pendingLookId.current = null;
      // Scroll the row into view after the status filter updates
      setTimeout(() => {
        const el = document.getElementById(`look-row-${look.id}`);
        if (el) el.scrollIntoView({ block: "center", behavior: "smooth" });
      }, 150);
    }
  }, [loading, looks]); // eslint-disable-line

  const loadEntities = async () => {
    // sbAll paginates until the whole table is fetched — critical for
    // people/brands (>1000 rows) so the typeahead doesn't silently miss
    // entries alphabetically past the PostgREST default cap, offer
    // "+ Create" for someone who already exists, and blow up on the unique
    // constraint. sbAll is a no-op cost for the small reference tables
    // (credit_roles, events, locations) — one HTTP round-trip either way.
    try {
      const [b, p, e, l, cr, pubs] = await Promise.all([
        sbAll("brands?select=id,name&order=name"),
        sbAll("people?select=id,name,primary_role&order=name"),
        sbAll("events?select=id,name,event_type&order=name"),
        sbAll("locations?select=id,name,location_type&order=location_type,name"),
        sbAll("credit_roles?select=id,slug,name,sort_order&order=sort_order"),
        sbAll("publications?select=id,name,slug,publication_type,country_id&order=name"),
      ]);
      setBrands(b); setPeople(p); setEvents(e); setLocations(l); setCreditRoles(cr);
      if (Array.isArray(pubs)) setPubList(pubs);
    } catch(e) { console.error(e); }
  };

  const loadLooks = async (opts: { background?: boolean } = {}) => {
    const isBg = opts.background === true;
    // Background refresh (post-save/status-flip): keep the table mounted so the
    // scrollable container's scrollHeight doesn't collapse to loading-spinner
    // height (which forced the browser to clamp scrollTop to 0 → looked like
    // "list jumped back to top"). Also keep the current selection so the
    // detail panel doesn't close and re-open.
    if (!isBg) { setLoading(true); setSelected(null); }
    setLoadError(null);
    try {
      // sbAll paginates past the PostgREST 1000-row cap — with >1000 total
      // looks across all statuses, using sb() with limit=1000 silently
      // truncated the oldest rows (visible as toolbar counts summing to
      // exactly 1000, with older published and archived missing from view).
      //
      // credit_order was dropped from look_brand_credits by the Aug 2026
      // flip_designer_attribution migration — pull created_at instead so
      // the brands_display column below can order names deterministically.
      const data = await sbAll(`looks?select=id,status,cloudinary_url,source_url,source_name,scene,gender,season_display,season_term,season_year,date_published,is_key_look,notes,created_at,is_collaboration,event_id,collection_title,collection_description,publication_id,publication_issue_month,publication_issue_year,tag_count,look_brand_credits(brand_id,created_at,brands(name)),look_credits!look_credits_look_id_fkey(id)&order=created_at.desc`);

      const mapped = data.map((l: any) => {
        const rows = (l.look_brand_credits || []).slice().sort(cmpByCreatedAtThen("brand_id"));
        const names = rows.map((r: any) => r.brands?.name).filter(Boolean);
        return {
          ...l,
          brands_display: l.is_collaboration && names.length >= 2 ? names.join(" × ") : names.join(", "),
          brand_count: rows.length,
          credit_count: l.look_credits?.length || 0,
          tag_count: l.tag_count || 0,
        };
      });
      setLooks(mapped);
      // Background refresh: keep pointing at the same selected look, but
      // with the newly-loaded fields (status, brands_display, counts).
      // If the look was deleted between renders, selection is cleared.
      if (isBg && selected) {
        const fresh = mapped.find((l: any) => l.id === selected.id);
        setSelected(fresh || null);
      }
    } catch(e: any) { console.error(e); setLoadError(e?.message || "Failed to load looks."); }
    if (!isBg) setLoading(false);
  };

  const loadDetail = async (lookId: string) => {
    // Order the detail-panel rows by insertion time (created_at) — same
    // reasoning as loadLooks. Selecting created_at is also needed to keep
    // brand names in the same order the list view shows them.
    const [bRows, credits] = await Promise.all([
      sb(`look_brand_credits?look_id=eq.${lookId}&select=id,brand_id,role,created_at,is_courtesy,brands(id,name)&order=created_at`),
      sb(`look_credits?look_id=eq.${lookId}&select=id,role,person_id,created_at,ingest_handle,people(id,name,primary_role)&order=created_at`),
    ]);
    // Snapshot of what's actually in the DB right now, captured once at load
    // time and never mutated by editing — this is what saveEdits diffs
    // against. brandRows/contributors below are the editable copies.
    setOriginalBrandCredits((bRows || [])
      .filter((r: any) => r.brands)
      .map((r: any) => ({ dbId: r.id as string, brandId: r.brand_id as string, role: (r.role ?? null) as string | null })));
    setOriginalCredits((credits || [])
      .filter((c: any) => c.people)
      .map((c: any) => ({ dbId: c.id as string, personId: c.person_id as string, role: c.role as string })));

    setBrandRows((bRows || [])
      .filter((r: any) => r.brands)
      .map((r: any, i: number) => ({ key: `b-${r.id}-${i}`, brand: r.brands, isCourtesy: !!r.is_courtesy, dbId: r.id })));

    // A role name on look_credits that doesn't map to a current credit_roles
    // entry is a data anomaly — leave the contributor row's role empty
    // (null) so the user can re-select from the typeahead. Previously we
    // fabricated an "adhoc-*" object here; that fake id survived to
    // saveEdits and caused the FK error on look_credits INSERT downstream.
    const roleByName = (name: string) => {
      const match = creditRoles.find(r => r.name === name);
      if (!match) console.warn(`[review] Role "${name}" from look_credits not found in credit_roles — contributor row will show empty role for re-selection`);
      return match || null;
    };
    setContributors((credits || [])
      .filter((c: any) => c.people)
      .map((c: any, i: number) => ({ key: `c-${c.id}-${i}`, role: roleByName(c.role), person: c.people, ingest_handle: c.ingest_handle, dbId: c.id })));
  };

  const selectLook = (look: Look) => {
    setSelected(look);
    setDeleteError(null);
    setSaveError(null);
    setEditScene(look.scene || "");
    setEditGender(look.gender || "");
    setEditSeasonTerm(look.season_term || "");
    setEditSeasonYear(look.season_year?.toString() || "");
    setEditPublishDate(look.date_published || "");
    setEditSourceUrl(look.source_url || "");
    setEditSourceName(look.source_name || "");
    setEditCloudinaryUrl(look.cloudinary_url || "");
    setEditPublication(look.publication_id ? pubList.find(p => p.id === look.publication_id) || null : null);
    setEditPublicationIssueMonth(look.publication_issue_month?.toString() || "");
    setEditPublicationIssueYear(look.publication_issue_year?.toString() || "");
    setEditCollectionTitle(look.collection_title || "");
    setEditCollectionDesc(look.collection_description || "");
    setEditNotes(look.notes || "");
    setEditKeyLook(look.is_key_look);
    setEditIsCollab(!!look.is_collaboration);
    setEditEvent(look.event_id ? events.find(e => e.id === look.event_id) || { id: look.event_id, name: look.event_id } : null);
    loadDetail(look.id);
    clearChecked();
    // Scroll this row into view
    setTimeout(() => {
      const el = document.getElementById(`look-row-${look.id}`);
      if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, 50);
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const deleteLook = async () => {
    if (!deletePending) return;
    const target = deletePending;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(
        `/api/delete-look`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ look_id: target.id }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Delete failed");
      }
      // Refresh list — remove the deleted look, decrement count, close detail if open
      setLooks(prev => prev.filter(l => l.id !== target.id));
      if (selected?.id === target.id) setSelected(null);
      setDeletePending(null);
    } catch (e: any) {
      setDeleteError(e.message || "Delete failed");
    }
    setDeleting(false);
  };

  // ── Brands & contributors ─────────────────────────────────────────────────

  function addBrandRow() { setBrandRows(prev => [...prev, { key: `b-new-${Date.now()}-${prev.length}`, brand: null, isCourtesy: false }]); }
  function updateBrandRow(key: string, brand: any) { setBrandRows(prev => prev.map(b => b.key === key ? { ...b, brand } : b)); }
  function toggleBrandCourtesy(key: string) { setBrandRows(prev => prev.map(b => b.key === key ? { ...b, isCourtesy: !b.isCourtesy } : b)); }
  function removeBrandRow(key: string) { setBrandRows(prev => prev.filter(b => b.key !== key)); }
  function addContributor() { setContributors(prev => [...prev, { key: `c-new-${Date.now()}-${prev.length}`, role: null, person: null, ingest_handle: null } as any]); }

  const clearChecked = () => setCheckedContributors(new Set());

  function toggleContributorCheck(key: string) {
    setCheckedContributors(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  }

  function copyContributors() {
    const sel = contributors.filter(c => checkedContributors.has(c.key) && c.person?.id && c.role);
    if (sel.length === 0) return;
    contributorClipboard = sel.map(c => ({ person: c.person, role: c.role }));
    setClipboardFlash(true);
    clearChecked();
    setTimeout(() => setClipboardFlash(false), 1800);
  }

  function pasteContributors() {
    if (contributorClipboard.length === 0) return;
    setContributors(prev => {
      const existing = new Set(prev.map(c => `${c.person?.id}::${c.role?.name}`));
      const toAdd = contributorClipboard
        .filter(c => !existing.has(`${c.person?.id}::${c.role?.name}`))
        .map(c => ({ key: `c-paste-${c.person.id}-${Date.now()}-${Math.random()}`, person: c.person, role: c.role }));
      return [...prev, ...toAdd];
    });
  }

  function updateContributorRole(key: string, role: any) { setContributors(prev => prev.map(c => c.key === key ? { ...c, role } : c)); }
  function updateContributorPerson(key: string, person: any) {
    setContributors(prev => prev.map(c => {
      if (c.key !== key) return c;
      let role = c.role;
      if (!role && person?.primary_role) {
        const pr = person.primary_role;
        const match = creditRoles.find((r: any) => r.name === pr || r.slug === pr.replace(/_/g, "-"));
        if (match) role = match;
      }
      return { ...c, person, role };
    }));
  }
  function removeContributor(key: string) { setContributors(prev => prev.filter(c => c.key !== key)); }

  async function post(path: string, data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: "POST", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json())[0];
  }

  async function createRole(name: string, rowKey: string) {
    const slug = slugify(name);
    try {
      const created = await post("credit_roles", { name: name.trim().toLowerCase(), slug, sort_order: 999 });
      setCreditRoles(prev => [...prev, created].sort((a: any, b: any) => a.sort_order - b.sort_order));
      updateContributorRole(rowKey, created);
    } catch (e: any) {
      // Do NOT fabricate a local-* role on failure. A fake id here silently
      // poisons contributor state, and the eventual look_credits INSERT
      // fails with an FK error that reads as if the whole save is broken.
      // Surface the create error immediately; the role field stays empty
      // so the user can pick an existing role or retry.
      alert(`Couldn't create role "${name}": ${e?.message || "unknown error"}`);
    }
  }

  async function createRoleForModal(name: string): Promise<any> {
    const slug = slugify(name);
    try {
      const created = await post("credit_roles", { name: name.trim().toLowerCase(), slug, sort_order: 999 });
      setCreditRoles(prev => [...prev, created].sort((a: any, b: any) => a.sort_order - b.sort_order));
      return created;
    } catch (e: any) {
      // Same reasoning as createRole. Return null; the caller's
      // `if (created) setSelectedRole(created)` handles null cleanly.
      alert(`Couldn't create role "${name}": ${e?.message || "unknown error"}`);
      return null;
    }
  }

  // Rename succeeded — patch the person in-place across `people` and any
  // contributor row that already references it. No DB round-trip needed;
  // the row's id hasn't changed, only its display fields.
  const handleRenamed = (updated: { id: string; name: string; slug: string }) => {
    setPeople(prev =>
      prev.map(p => p.id === updated.id ? { ...p, name: updated.name, slug: updated.slug } : p)
          .sort((a: any, b: any) => a.name.localeCompare(b.name))
    );
    setContributors(prev => prev.map(c =>
      c.person?.id === updated.id
        ? { ...c, person: { ...c.person, name: updated.name, slug: updated.slug } }
        : c
    ));
  };

  // Merge succeeded — DB now points every reference from source→target and
  // the source row is gone. Reflect that in local state, then reload the
  // detail panel: the originalCredits/originalBrandCredits snapshot that
  // saveEdits diffs against is otherwise stale for this look (still keyed
  // on the deleted source id), which would produce spurious DELETEs on the
  // next Save.
  const handleMerged = async (result: {
    source: any;
    target: any;
    credits_moved: number;
    credits_dropped: number;
    directors_moved: number;
    directors_dropped: number;
    education_moved: number;
    prior_role_moved: number;
  }) => {
    // Ensure the target is present in the people list with its full record.
    // In the common case (Chrome-extension placeholder folding into an
    // already-loaded named person) the target is already there; we still
    // refetch defensively so `primary_role` and any other columns render
    // right in future typeahead rows.
    let targetFull = people.find(p => p.id === result.target.id);
    try {
      const rows = await sb(`people?id=eq.${result.target.id}&select=id,name,slug,primary_role`);
      if (Array.isArray(rows) && rows.length > 0) targetFull = rows[0];
    } catch { /* fall back to whatever we already have */ }

    setPeople(prev => {
      const withoutSource = prev.filter(p => p.id !== result.source.id);
      if (targetFull && !withoutSource.find(p => p.id === targetFull!.id)) {
        return [...withoutSource, targetFull].sort((a: any, b: any) => a.name.localeCompare(b.name));
      }
      return withoutSource;
    });

    // Refresh the snapshot for the currently-open look so a subsequent Save
    // diffs against actual DB state rather than the pre-merge state.
    if (selected) await loadDetail(selected.id);

    // Refresh the list view so credit_count on this look and any other
    // affected looks matches DB reality after any collision-drops.
    await loadLooks({ background: true });

    // Non-blocking summary: tells the user what actually moved, especially
    // useful when the RPC dropped some rows to resolve unique conflicts.
    const parts = [
      result.credits_moved > 0 ? `${result.credits_moved} credit${result.credits_moved === 1 ? "" : "s"} moved` : null,
      result.credits_dropped > 0 ? `${result.credits_dropped} dropped (target already had them)` : null,
      result.directors_moved > 0 ? `${result.directors_moved} brand-director row${result.directors_moved === 1 ? "" : "s"} moved` : null,
    ].filter(Boolean);
    console.info(`[review] Merged ${result.source.name} → ${result.target.name}: ${parts.join(", ") || "no references to move"}`);
  };

  const saveEdits = async () => {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);
    try {
      const validBrandRows = brandRows.filter(b => b.brand?.id);

      // Editorial rule: a non-collaboration look has exactly one brand credit.
      // If "This is a collaboration" is unchecked, only the first (earliest)
      // brand row survives. Extras drop out here — they're not added to
      // desiredBrandByKey below, so the diff naturally puts them into
      // brandDbIdsToDelete for deletion. The user is warned inline next to
      // the collab checkbox that this will happen. Courtesy flag is a
      // separate concept and is respected on whichever row survives.
      const effectiveBrandRows = editIsCollab ? validBrandRows : validBrandRows.slice(0, 1);

      // Belt-and-suspenders: guard against any fabricated local-* or adhoc-*
      // ids that might survive from a prior code path or a stale session
      // (e.g. state hanging around from before the create* helpers were
      // fixed to stop fabricating). The create* helpers no longer make
      // these, but if any leak in, abort BEFORE any write happens so
      // nothing gets corrupted and the user gets a specific error naming
      // what needs to be re-selected.
      const isFake = (id: any) => typeof id === "string" && (id.startsWith("local-") || id.startsWith("adhoc-"));
      const stalePeople = contributors.filter(c => c.person?.id && isFake(c.person.id));
      const staleRoles = contributors.filter(c => c.role?.id && isFake(c.role.id));
      const staleBrands = brandRows.filter(b => b.brand?.id && isFake(b.brand.id));
      if (stalePeople.length > 0 || staleRoles.length > 0 || staleBrands.length > 0) {
        const parts: string[] = [];
        if (stalePeople.length > 0) parts.push(`unsaved people: ${stalePeople.map(c => c.person.name).join(", ")}`);
        if (staleRoles.length > 0) parts.push(`unsaved roles: ${staleRoles.map(c => `"${c.role.name}"${c.person?.name ? ` (on ${c.person.name})` : ""}`).join(", ")}`);
        if (staleBrands.length > 0) parts.push(`unsaved brands: ${staleBrands.map(b => b.brand.name).join(", ")}`);
        throw new Error(`Cannot save — re-select from typeahead: ${parts.join(" · ")}`);
      }

      // Any option in the Scene dropdown must match the looks.scene CHECK
      // constraint exactly, or Postgres rejects the whole PATCH. Catch that
      // here with a clear message instead of a bare 400 from Postgres.
      const ALLOWED_SCENES = ["runway", "street", "editorial", "designer_showcase", "lookbook", "presentation", "campaign", "portrait", "behind_the_scenes", "installation", "other"];
      if (editScene && !ALLOWED_SCENES.includes(editScene)) {
        throw new Error(`"${editScene}" is not a valid scene value.`);
      }

      await sb(`looks?id=eq.${selected.id}`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({
          is_collaboration: editIsCollab,
          scene: editScene || null,
          gender: editGender || null,
          season_term: editSeasonTerm || null,
          season_year: editSeasonYear ? parseInt(editSeasonYear) : null,
          date_published: editPublishDate || null,
          source_url: editSourceUrl || null,
          source_name: editSourceName || null,
          cloudinary_url: editCloudinaryUrl || null,
          publication_id: editPublication?.id || null,
          publication_issue_month: editPublicationIssueMonth ? parseInt(editPublicationIssueMonth) : null,
          publication_issue_year: editPublicationIssueYear ? parseInt(editPublicationIssueYear) : null,
          event_id: editEvent?.id || null,
          collection_title: editCollectionTitle || null,
          collection_description: editCollectionDesc || null,
          notes: editNotes || null,
          is_key_look: editKeyLook,
        }),
      });

      // Reconcile credits by identity — (brand_id, role) and (person_id,
      // role) are exactly the columns the DB's unique constraints key on.
      // Diff against the snapshot taken at load time (originalBrandCredits /
      // originalCredits), which never mutates as the form is edited:
      //   - a desired tuple with no existing match  → INSERT
      //   - an existing tuple with no desired match → DELETE (by its dbId)
      //   - a tuple present in both (brands only)   → PATCH is_courtesy
      // Unchanged rows are never re-inserted, so re-saving without touching
      // credits can't collide with the row that's already sitting there —
      // the bug that produced the "duplicate key value" error.
      const bKey = (brandId: string, role: string | null) => `${brandId}::${role ?? ""}`;
      const cKey = (personId: string, role: string) => `${personId}::${role}`;

      // ---- Brand credits ----
      // credit_order was dropped in the Aug 2026 flip_designer_attribution
      // migration — new rows go in without it, and the PATCH only carries
      // is_courtesy since that's the last remaining mutable column here.
      const existingBrandByKey = new Map(originalBrandCredits.map(r => [bKey(r.brandId, r.role), r.dbId]));
      const desiredBrandByKey = new Map<string, { brandId: string; role: null; isCourtesy: boolean }>();
      effectiveBrandRows.forEach(b => {
        desiredBrandByKey.set(bKey(b.brand.id, null), { brandId: b.brand.id, role: null, isCourtesy: b.isCourtesy });
      });

      const brandsToInsert = [...desiredBrandByKey.entries()].filter(([key]) => !existingBrandByKey.has(key));
      const brandsToUpdate = [...desiredBrandByKey.entries()].filter(([key]) => existingBrandByKey.has(key));
      const brandDbIdsToDelete = [...existingBrandByKey.keys()].filter(key => !desiredBrandByKey.has(key)).map(key => existingBrandByKey.get(key)!);

      if (brandsToInsert.length > 0) {
        await sb("look_brand_credits", { method: "POST", body: JSON.stringify(
          brandsToInsert.map(([, row]) => ({ look_id: selected.id, brand_id: row.brandId, role: row.role, is_courtesy: row.isCourtesy }))
        ) });
      }
      for (const [key, row] of brandsToUpdate) {
        await sb(`look_brand_credits?id=eq.${existingBrandByKey.get(key)}`, { method: "PATCH", prefer: "", body: JSON.stringify({ is_courtesy: row.isCourtesy }) });
      }
      if (brandDbIdsToDelete.length > 0) {
        await sb(`look_brand_credits?id=in.(${brandDbIdsToDelete.join(",")})`, { method: "DELETE", prefer: "" });
      }

      // ---- Person credits ----
      // Same story as brand credits: credit_order gone. And look_credits
      // has no other mutable column being tracked from the editor, so a
      // (person_id, role) tuple that already exists in the DB has nothing
      // to PATCH — INSERT and DELETE paths are the only work needed.
      // Row identity changes (e.g. swapping a person on an existing row)
      // naturally surface as a matched INSERT-plus-DELETE pair because
      // the tuple key differs.
      const existingCreditByKey = new Map(originalCredits.map(r => [cKey(r.personId, r.role), r.dbId]));
      const desiredCreditByKey = new Map<string, { personId: string; role: string }>();
      const validContributors = contributors.filter(c => c.person?.id && c.role);
      validContributors.forEach(c => {
        desiredCreditByKey.set(cKey(c.person.id, c.role.name), { personId: c.person.id, role: c.role.name });
      });
      // Two contributor rows resolving to the same (person, role) collapse
      // into one write — there's nothing distinguishing them for the DB to
      // keep separately, and this is what used to surface as a raw
      // "duplicate key value" Postgres error instead of just being handled.
      const keyCounts = new Map<string, number>();
      validContributors.forEach(c => { const k = cKey(c.person.id, c.role.name); keyCounts.set(k, (keyCounts.get(k) || 0) + 1); });
      const mergedDuplicates = [...new Set(
        validContributors.filter(c => (keyCounts.get(cKey(c.person.id, c.role.name)) || 0) > 1)
          .map(c => `${c.person.name} (${c.role.name})`)
      )];

      const creditsToInsert = [...desiredCreditByKey.entries()].filter(([key]) => !existingCreditByKey.has(key));
      const creditDbIdsToDelete = [...existingCreditByKey.keys()].filter(key => !desiredCreditByKey.has(key)).map(key => existingCreditByKey.get(key)!);

      if (creditsToInsert.length > 0) {
        await sb("look_credits", { method: "POST", body: JSON.stringify(
          creditsToInsert.map(([, row]) => ({ look_id: selected.id, person_id: row.personId, role: row.role }))
        ) });
      }
      if (creditDbIdsToDelete.length > 0) {
        await sb(`look_credits?id=in.(${creditDbIdsToDelete.join(",")})`, { method: "DELETE", prefer: "" });
      }

      const droppedContributors = contributors.filter(c => c.person?.id && !c.role);
      const notes: string[] = [];
      if (droppedContributors.length > 0) notes.push(`skipped (no role selected): ${droppedContributors.map(c => c.person.name).join(", ")}`);
      if (mergedDuplicates.length > 0) notes.push(`merged duplicate rows: ${mergedDuplicates.join(", ")}`);
      if (notes.length > 0) setSaveError(`Saved, but ${notes.join(" · ")}`);

      // Refresh the snapshot (not just the list) so a second save in the
      // same session diffs against what's actually in the DB now, not
      // against the state from before this save.
      await loadDetail(selected.id);

      await loadLooks({ background: true });
    } catch(e: any) {
      console.error(e);
      setSaveError(e?.message || "Save failed — changes were not persisted.");
    }
    setSaving(false);
  };

  const setStatus = async (lookId: string, status: string, takedownReason?: string) => {
    setSaving(true);
    try {
      const body: any = { status };
      if (takedownReason) { body.takedown_reason = takedownReason; body.takedown_at = new Date().toISOString(); }
      await sb(`looks?id=eq.${lookId}`, { method: "PATCH", prefer: "", body: JSON.stringify(body) });
      await loadLooks({ background: true });
    } catch(e) { console.error(e); }
    setSaving(false);
  };

  const inp = { background: C.lift3, border: "none" as const, color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: "100%", boxSizing: "border-box" as const, fontFamily: "Inter,sans-serif" };
  const sel = { ...inp, cursor: "pointer" as const };

  // Counts derived from all loaded looks (client-side)
  const counts = {
    draft: looks.filter(l => l.status === "draft").length,
    published: looks.filter(l => l.status === "published").length,
    archived: looks.filter(l => l.status === "archived").length,
  };

  const filteredLooks = looks.filter(l => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      const matchesBrand = l.brands_display.toLowerCase().includes(s);
      const matchesSource = (l.source_name || "").toLowerCase().includes(s);
      if (!matchesBrand && !matchesSource) return false;
    }
    if (sceneFilter && l.scene !== sceneFilter) return false;
    if (pubFilter && l.publication_id !== pubFilter) return false;
    if (eventFilter && l.event_id !== eventFilter) return false;
    return true;
  }).sort((a, b) => {
    // Server ships `looks` in created_at.desc order — sort here anyway so the
    // toggle works without a re-fetch, and null created_at values sort last
    // regardless of direction.
    const aC = a.created_at || "";
    const bC = b.created_at || "";
    const cmp = aC.localeCompare(bC);
    return sortMode === "newest" ? -cmp : cmp;
  });

  const hasActiveFilters = search.trim() || sceneFilter || pubFilter || eventFilter;
  const clearFilters = () => { setSearch(""); setSceneFilter(""); setPubFilter(""); setEventFilter(""); };

  // Prune the Publication and Event dropdowns to entries actually referenced
  // by at least one loaded look — otherwise the pickers list every row in
  // publications / events tables, most of which have zero looks and are just
  // noise. Runs across ALL loaded looks regardless of the current status
  // filter (draft, published, archived all count), because the user's rule
  // is "if there's any look for it in the DB, show it."
  const activePublicationIds = useMemo(
    () => new Set(looks.map(l => l.publication_id).filter(Boolean) as string[]),
    [looks],
  );
  const activeEventIds = useMemo(
    () => new Set(looks.map(l => l.event_id).filter(Boolean) as string[]),
    [looks],
  );
  const activePubList = useMemo(
    () => pubList.filter((p: any) => activePublicationIds.has(p.id)),
    [pubList, activePublicationIds],
  );
  const activeEvents = useMemo(
    () => events.filter((e: any) => activeEventIds.has(e.id)),
    [events, activeEventIds],
  );

  return (
    <>
      <style>{`
        ${FONT_IMPORT}
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
            {(["draft","published","archived","all"] as const).map(st => (
              <button key={st} onClick={() => setStatusFilter(st)}
                style={{ background: statusFilter===st ? C.lift2 : "transparent", border: "none", color: statusFilter===st ? C.text : C.muted, padding: "6px 14px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", fontWeight: statusFilter===st ? 600 : 400 }}>
                {st.charAt(0).toUpperCase()+st.slice(1)}
                {st !== "all" && counts[st] !== undefined && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: st==="draft" ? C.amber : C.muted }}>{counts[st]}</span>
                )}
              </button>
            ))}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Brand or account…"
            style={{ background: C.lift2, border: "none", color: C.text, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", width: 180, fontFamily: "Inter,sans-serif" }} />
          <select value={sceneFilter} onChange={e => setSceneFilter(e.target.value)}
            style={{ background: sceneFilter ? C.lift3 : C.lift2, border: "none", color: sceneFilter ? C.text : C.muted, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            <option value="">Scene</option>
            <option value="runway">Runway</option>
            <option value="behind_the_scenes">Backstage</option>
            <option value="street">Street</option>
            <option value="editorial">Editorial</option>
            <option value="designer_showcase">Designer Showcase</option>
            <option value="lookbook">Lookbook</option>
            <option value="presentation">Presentation</option>
            <option value="campaign">Campaign</option>
            <option value="portrait">Portrait</option>
            <option value="installation">Installation</option>
            <option value="other">Other</option>
          </select>
          <select value={pubFilter} onChange={e => setPubFilter(e.target.value)}
            style={{ background: pubFilter ? C.lift3 : C.lift2, border: "none", color: pubFilter ? C.text : C.muted, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", maxWidth: 160 }}>
            <option value="">Publication</option>
            {activePubList.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={eventFilter} onChange={e => setEventFilter(e.target.value)}
            style={{ background: eventFilter ? C.lift3 : C.lift2, border: "none", color: eventFilter ? C.text : C.muted, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", maxWidth: 180 }}>
            <option value="">Event</option>
            {activeEvents.map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={sortMode} onChange={e => setSortMode(e.target.value as "newest" | "oldest")}
            style={{ background: C.lift2, border: "none", color: C.muted, padding: "7px 14px", fontSize: 13, borderRadius: 20, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              style={{ background: "none", border: "none", color: C.muted, fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif", padding: "0 4px", whiteSpace: "nowrap" }}>
              Clear ×
            </button>
          )}
          <div style={{ flex: 1 }} />
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* List */}
          <div style={{ width: selected ? "44%" : "100%", flexShrink: 0, overflowY: "auto", borderRight: selected ? `1px solid ${C.lift1}` : "none", transition: "width 0.2s" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted }}>Loading…</div>
            ) : loadError ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 10, color: C.red, padding: 24, textAlign: "center" }}>
                <div style={{ fontSize: 32 }}>⚠</div>
                <div style={{ fontWeight: 600 }}>Couldn't load looks</div>
                <div style={{ fontSize: 12, color: C.muted, maxWidth: 380, fontFamily: "monospace", wordBreak: "break-word" }}>{loadError}</div>
                <button onClick={() => loadLooks()} style={{ marginTop: 4, background: C.lift2, border: "none", color: C.text, padding: "7px 16px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>Retry</button>
              </div>
            ) : filteredLooks.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 8, color: C.muted }}>
                <div style={{ fontSize: 32 }}>✓</div>
                <div>No {statusFilter === "all" ? "" : statusFilter} looks{hasActiveFilters ? " matching current filters" : ""}</div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.lift1}` }}>
                    {["Image","Brands","Scene","Credits","Tags","Status",""].map(h => (
                      <th key={h} style={{ padding: "8px 10px", fontSize: 11, fontWeight: 600, color: C.muted, textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredLooks.map(look => {
                    const isActive = selected?.id === look.id;
                    return (
                      <tr key={look.id} id={`look-row-${look.id}`} className={`look-row${isActive?" active":""}`}
                        onClick={() => selectLook(look)}
                        style={{ borderBottom: `1px solid ${C.lift1}`, cursor: "pointer", background: isActive ? C.lift1 : "transparent", borderLeft: isActive ? `2px solid ${C.white}` : "2px solid transparent" }}>
                        <td style={{ padding: "6px 10px", width: 52 }}>
                          {look.cloudinary_url
                            ? <img src={look.cloudinary_url} alt="" style={{ width: 40, height: 48, objectFit: "cover", borderRadius: 4, display: "block" }} />
                            : <div style={{ width: 40, height: 48, background: C.lift2, borderRadius: 4 }} />}
                        </td>
                        <td style={{ padding: "6px 10px", maxWidth: 160 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: look.brands_display ? C.text : C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{look.brands_display || "—"}</div>
                          {look.source_name && !look.brands_display && <div style={{ fontSize: 11, color: C.muted }}>{look.source_name}</div>}
                        </td>
                        <td style={{ padding: "6px 10px" }}><span style={{ fontSize: 12, color: look.scene ? C.text : C.dim }}>{look.scene || "—"}</span></td>
                        <td style={{ padding: "6px 10px" }}><span style={{ fontSize: 12, color: look.credit_count > 0 ? C.green : C.dim }}>{look.credit_count}</span></td>
                        <td style={{ padding: "6px 10px" }}><span style={{ fontSize: 12, color: look.tag_count > 0 ? C.text : C.dim }}>{look.tag_count}</span></td>
                        <td style={{ padding: "6px 10px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 11, color: look.status==="draft" ? C.amber : look.status==="published" ? C.green : C.dim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{look.status}</span>
                          {look.is_key_look && <span style={{ marginLeft: 5, fontSize: 10, color: C.white, background: C.lift2, padding: "1px 5px", borderRadius: 10 }}>key</span>}
                        </td>
                        <td style={{ padding: "6px 10px" }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <a href={`/?look=${look.id}&status=${look.status}`}
                              style={{ fontSize: 11, color: C.muted, textDecoration: "none", background: C.lift2, padding: "4px 10px", borderRadius: 12, fontFamily: "Inter,sans-serif", whiteSpace: "nowrap" }}>
                              ✦ Tags
                            </a>
                            {look.status==="draft" && <button onClick={() => setStatus(look.id,"published")} style={{ background: C.green, border: "none", color: "#fff", padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>Publish</button>}
                            {look.status==="published" && <button onClick={() => setStatus(look.id,"archived","manual")} style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>Archive</button>}
                            {look.status==="archived" && <button onClick={() => setStatus(look.id,"published")} style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>Restore</button>}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeletePending(look);
                                setDeleteError(null);
                              }}
                              style={{ background: "transparent", border: `1px solid ${C.red}`, color: C.red, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>
                              Delete
                            </button>
                          </div>
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

              <div style={{ position: "relative", background: "#181818", flexShrink: 0 }}>
                <img src={selected.cloudinary_url} alt="" style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} />
                <button onClick={() => setSelected(null)}
                  style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.7)", border: "none", color: C.text, width: 30, height: 30, borderRadius: 15, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,sans-serif" }}>×</button>
                {selected.source_url && (
                  <a href={selected.source_url} target="_blank" rel="noreferrer"
                    style={{ position: "absolute", top: 10, left: 10, fontSize: 12, color: C.text, textDecoration: "none", background: "rgba(0,0,0,0.7)", padding: "5px 10px", borderRadius: 12, fontWeight: 500, fontFamily: "Inter,sans-serif" }}>↗ source</a>
                )}
                <a href={`/?look=${selected.id}&status=${selected.status}`}
                  style={{ position: "absolute", top: 10, left: selected.source_url ? 90 : 10, fontSize: 12, color: C.muted, textDecoration: "none", background: "rgba(0,0,0,0.7)", padding: "5px 10px", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>✦ Tags</a>
              </div>

              <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16 }}>

                <div style={{ fontSize: 12, color: C.muted }}>
                  Ingested {new Date(selected.created_at).toLocaleDateString()} · {selected.credit_count} credits · {selected.tag_count} tags
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

                  <SectionHead title="Attribution" />

                  <F label="Brands" span2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {brandRows.map(b => (
                        <div key={b.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <Typeahead items={brands} value={b.brand} onChange={(br: any) => updateBrandRow(b.key, br)} onClear={() => updateBrandRow(b.key, null)} placeholder="Search or create brand..." onCreateClick={(name: string) => setBrandModal({ name, target: `brandrow:${b.key}` })} />
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: b.brand ? C.text : C.dim, cursor: b.brand ? "pointer" : "default", whiteSpace: "nowrap", userSelect: "none" }}>
                            <input type="checkbox" checked={b.isCourtesy} disabled={!b.brand} onChange={() => toggleBrandCourtesy(b.key)} style={{ accentColor: C.white, cursor: "pointer" }} />
                            Courtesy
                          </label>
                          <button tabIndex={-1} onClick={() => removeBrandRow(b.key)} style={{ background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 }}>×</button>
                        </div>
                      ))}
                      {(brandRows.length === 0 || editIsCollab) && (
                        <button onClick={addBrandRow} style={{ alignSelf: "flex-start", background: "transparent", border: `1.5px dashed ${C.lift3}`, color: C.muted, padding: "7px 14px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>+ Add brand</button>
                      )}
                    </div>
                  </F>

                  <F label="" span2>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.text, userSelect: "none", flexWrap: "wrap" }}>
                      <input type="checkbox" checked={editIsCollab} onChange={e => setEditIsCollab(e.target.checked)} style={{ accentColor: C.white, cursor: "pointer" }} />
                      This is a collaboration
                      <span style={{ fontSize: 11, color: C.dim, fontStyle: "italic", marginLeft: 4 }}>— official co-creation between the brands above</span>
                      {!editIsCollab && brandRows.filter(b => b.brand?.id).length > 1 && (
                        <span style={{ fontSize: 11, color: C.amber, marginLeft: 4, fontStyle: "italic", width: "100%" }}>
                          {"⚠ Not a collaboration — extras will be removed on save: "}
                          {brandRows.filter(b => b.brand?.id).slice(1).map(b => b.brand.name).join(", ")}
                        </span>
                      )}
                    </label>
                  </F>

                  <F label="Contributors" span2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <button onClick={copyContributors} disabled={checkedContributors.size === 0}
                          style={{ background: clipboardFlash ? C.green : C.lift2, border: "none", color: clipboardFlash ? "#fff" : C.muted, padding: "5px 12px", fontSize: 12, cursor: checkedContributors.size === 0 ? "default" : "pointer", borderRadius: 16, fontFamily: "Inter,sans-serif", transition: "all 0.2s", opacity: checkedContributors.size === 0 ? 0.35 : 1 }}>
                          {clipboardFlash ? "Copied ✓" : `Copy${checkedContributors.size > 0 ? ` (${checkedContributors.size})` : ""}`}
                        </button>
                        {checkedContributors.size > 0 && (
                          <button onClick={() => { setContributors(prev => prev.filter(c => !checkedContributors.has(c.key))); clearChecked(); }}
                            style={{ background: "none", border: `1px solid ${C.red}`, color: C.red, padding: "5px 12px", fontSize: 12, cursor: "pointer", borderRadius: 16, fontFamily: "Inter,sans-serif" }}>
                            Delete ({checkedContributors.size})
                          </button>
                        )}
                        {contributorClipboard.length > 0 && (
                          <button onClick={pasteContributors}
                            style={{ background: C.lift2, border: `1px solid ${C.lift3}`, color: C.text, padding: "5px 12px", fontSize: 12, cursor: "pointer", borderRadius: 16, fontFamily: "Inter,sans-serif" }}>
                            Paste ({contributorClipboard.length})
                          </button>
                        )}
                        {checkedContributors.size > 0 && (
                          <button onClick={clearChecked}
                            style={{ background: "none", border: "none", color: C.dim, fontSize: 12, cursor: "pointer", fontFamily: "Inter,sans-serif", padding: "5px 0" }}>
                            Clear
                          </button>
                        )}
                      </div>
                      {contributors.map((c: any) => (
                        <div key={c.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input type="checkbox" checked={checkedContributors.has(c.key)} onChange={() => toggleContributorCheck(c.key)}
                            style={{ accentColor: C.white, width: 14, height: 14, cursor: "pointer", flexShrink: 0 }} />
                          <Typeahead items={people} value={c.person} onChange={(p: any) => updateContributorPerson(c.key, p)} onClear={() => updateContributorPerson(c.key, null)} onRename={(person: any) => setRenamePerson(person)} placeholder="Search or create person..." onCreateClick={(name: string) => setPersonModal({ name, role: c.role?.slug ? c.role.slug.replace(/-/g, "_") : null, target: `contributor:${c.key}` })} />
                          {/* ingest_handle provenance tag */}
                          {c.ingest_handle && (
                            <span style={{ fontSize: 11, color: C.muted, background: C.lift2, padding: "3px 8px", borderRadius: 10, whiteSpace: "nowrap", flexShrink: 0 }}>
                              @{c.ingest_handle}
                            </span>
                          )}
                          <Typeahead width={160} items={creditRoles} value={c.role} onChange={(r: any) => updateContributorRole(c.key, r)} onClear={() => updateContributorRole(c.key, null)} placeholder="Role..." onCreateClick={(name: string) => createRole(name, c.key)} />
                        </div>
                      ))}
                      <button onClick={addContributor} style={{ alignSelf: "flex-start", background: "transparent", border: `1.5px dashed ${C.lift3}`, color: C.muted, padding: "7px 14px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" }}>+ Add contributor</button>
                    </div>
                  </F>

                  <SectionHead title="Context" />

                  <F label="Scene">
                    <select value={editScene} onChange={e => setEditScene(e.target.value)} style={sel}>
                      <option value="">— select —</option>
                      <option value="runway">Runway</option>
                      <option value="behind_the_scenes">Backstage</option>
                      <option value="street">Street</option>
                      <option value="editorial">Editorial</option>
                      <option value="designer_showcase">Designer Showcase</option>
                      <option value="lookbook">Lookbook</option>
                      <option value="presentation">Presentation</option>
                      <option value="campaign">Campaign</option>
                      <option value="portrait">Portrait</option>
                      <option value="installation">Installation</option>
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

                  <SectionHead title="Source" />

                  <F label="Post URL" span2>
                    <input value={editSourceUrl} onChange={e => setEditSourceUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." style={inp} />
                  </F>

                  <F label="Source Account" span2>
                    <input value={editSourceName} onChange={e => setEditSourceName(e.target.value)} placeholder="@account_handle" style={inp} />
                  </F>

                  <F label="Image URL (Cloudinary)" span2>
                    <input value={editCloudinaryUrl} onChange={e => setEditCloudinaryUrl(e.target.value)} placeholder="https://res.cloudinary.com/..." style={inp} />
                  </F>

                  <F label="Publication" span2>
                    <Typeahead items={pubList} value={editPublication} onChange={setEditPublication} onClear={() => { setEditPublication(null); setEditPublicationIssueMonth(""); setEditPublicationIssueYear(""); }} placeholder="e.g. Vogue, i-D, Dazed..." onCreateClick={(name: string) => setPublicationModal(name)} />
                  </F>

                  <F label="Issue Month">
                    <select value={editPublicationIssueMonth} onChange={e => setEditPublicationIssueMonth(e.target.value)}
                      style={{ ...sel, opacity: editPublication ? 1 : 0.4 }} disabled={!editPublication}>
                      <option value="">— month —</option>
                      {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                        <option key={i+1} value={String(i+1)}>{m}</option>
                      ))}
                    </select>
                  </F>

                  <F label="Issue Year">
                    <input value={editPublicationIssueYear} onChange={e => setEditPublicationIssueYear(e.target.value)}
                      placeholder="2024" maxLength={4}
                      style={{ ...inp, opacity: editPublication ? 1 : 0.4 }} disabled={!editPublication} />
                  </F>

                  <SectionHead title="Collection" />

                  <F label="Collection Title" span2>
                    <input value={editCollectionTitle} onChange={e => setEditCollectionTitle(e.target.value)} placeholder="e.g. Folklorics, Dual Mandate" style={inp} />
                  </F>

                  <F label="Collection Description" span2>
                    <textarea value={editCollectionDesc} onChange={e => setEditCollectionDesc(e.target.value)} rows={3} placeholder="Editorial narrative about this collection..." style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
                  </F>

                  <SectionHead title="Notes" />

                  <F label="" span2>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} placeholder="Internal scratchpad..." style={{ ...inp, resize: "vertical", lineHeight: 1.5 }} />
                  </F>
                </div>

                {/* Save — form fields only, status actions are at the top */}
                <div style={{ paddingBottom: 20, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
                  <button onClick={saveEdits} disabled={saving}
                    style={{ background: C.white, border: "none", color: "#212121", padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>
                  {saveError && (
                    <span style={{ fontSize: 12, color: saveError.startsWith("Saved,") ? C.amber : C.red, maxWidth: 480 }}>
                      {saveError.startsWith("Saved,") ? "⚠ " : "✕ "}{saveError}
                    </span>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>

      {personModal && (
        <CreatePersonModal
          initialName={personModal.name}
          role={personModal.role}
          roles={creditRoles}
          onCreateRole={createRoleForModal}
          onClose={() => setPersonModal(null)}
          onSave={(created: any) => {
            setPeople(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            if (personModal.target.startsWith("contributor:")) updateContributorPerson(personModal.target.split(":")[1], created);
            setPersonModal(null);
          }}
        />
      )}

      {brandModal && (
        <CreateBrandModal
          initialName={brandModal.name}
          locations={locations}
          people={people}
          onPersonCreated={(p: any) => setPeople(prev => [...prev, p].sort((a, b) => a.name.localeCompare(b.name)))}
          onClose={() => setBrandModal(null)}
          onSave={(created: any) => {
            setBrands(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
            if (brandModal.target.startsWith("brandrow:")) updateBrandRow(brandModal.target.split(":")[1], created);
            setBrandModal(null);
          }}
        />
      )}

      {publicationModal && (
        <CreatePublicationModal
          initialName={publicationModal}
          onClose={() => setPublicationModal(null)}
          onSave={(created: any) => {
            setPubList(prev => [...prev, created].sort((a: any, b: any) => a.name.localeCompare(b.name)));
            setEditPublication(created);
            setPublicationModal(null);
          }}
        />
      )}

      {renamePerson && (
        <RenamePersonModal
          person={renamePerson}
          onClose={() => setRenamePerson(null)}
          onRenamed={handleRenamed}
          onMerged={handleMerged}
        />
      )}

      {deletePending && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={() => { if (!deleting) { setDeletePending(null); setDeleteError(null); } }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: C.lift1, borderRadius: 18, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${C.lift2}` }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 6 }}>Delete this look?</div>
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>
                {deletePending.brands_display || deletePending.source_name || "Unattributed look"}
              </div>
            </div>
            <div style={{ padding: "16px 22px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>
                This removes the Supabase record, all credits and tags, and the Cloudinary image.
                <span style={{ color: C.red, fontWeight: 500 }}> Cannot be undone.</span>
              </div>
              {deleteError && (
                <div style={{ fontSize: 12, color: C.red, background: "rgba(224,90,78,0.1)", border: `1px solid ${C.red}`, borderRadius: 8, padding: "8px 12px" }}>
                  {deleteError}
                </div>
              )}
            </div>
            <div style={{ padding: "14px 22px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button onClick={() => { setDeletePending(null); setDeleteError(null); }} disabled={deleting}
                style={{ background: C.lift2, border: "none", color: C.muted, padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", opacity: deleting ? 0.5 : 1 }}>
                Cancel
              </button>
              <button onClick={deleteLook} disabled={deleting} autoFocus
                style={{ background: C.red, border: "none", color: "#fff", padding: "9px 22px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: deleting ? 0.5 : 1 }}>
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
