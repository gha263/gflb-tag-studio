// ── INTAKE PAGE → app/intake/page.tsx ────────────────────────────────────────
"use client";

import { useState, useRef, useEffect } from "react";
import { SUPABASE_URL, H, sbAll } from "@/lib/supabase";
import { C, FONT_IMPORT } from "@/lib/theme";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Labelled Typeahead (top-level fields) ─────────────────────────────────────

function Typeahead({ label, items, value, onChange, onClear, placeholder, onCreateClick }: any) {
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

  if (value) {
    return (
      <div style={s.field}>
        {label && <label style={s.label}>{label}</label>}
        <div style={s.chip}>
          <span style={{ fontWeight: 500, fontSize: 14, color: C.text }}>{value.name}</span>
          <button onClick={onClear} tabIndex={-1} style={s.chipX}>×</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.field} ref={ref}>
      {label && <label style={s.label}>{label}</label>}
      <input
        style={s.input}
        value={query}
        placeholder={placeholder || (label ? `Search ${label.toLowerCase()}...` : "Search...")}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === "Tab" || e.key === "Escape") setOpen(false); }}
      />
      {open && (filtered.length > 0 || (query.length > 1 && onCreateClick)) && (
        <div style={s.dd}>
          {filtered.map((item: any) => (
            <div key={item.id} style={s.ddRow}
              onMouseDown={() => { onChange(item); setQuery(""); setOpen(false); }}>
              <span>{item.name}</span>
              {(item.primary_role || item.location_type || item.event_type) && (
                <span style={s.pill}>{item.primary_role || item.location_type || item.event_type}</span>
              )}
            </div>
          ))}
          {query.length > 1 && onCreateClick && !filtered.find((i: any) => i.name.toLowerCase() === query.toLowerCase()) && (
            <div style={s.ddCreate} onMouseDown={() => { onCreateClick(query); setQuery(""); setOpen(false); }}>
              + Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline Typeahead (used inside list rows) ──────────────────────────────────

function InlineTypeahead({ items, value, onChange, onClear, placeholder, onCreateClick, width }: any) {
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

  if (value) {
    return (
      <div style={{ ...s.chip, ...(width ? { width, flexShrink: 0 } : { flex: 1 }), justifyContent: "space-between" }}>
        <span style={{ fontWeight: 500, fontSize: 14, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value.name}</span>
        <button onClick={onClear} tabIndex={-1} style={s.chipX}>×</button>
      </div>
    );
  }

  return (
    <div style={wrapStyle} ref={ref}>
      <input
        style={s.input}
        value={query}
        placeholder={placeholder || "Search..."}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === "Tab" || e.key === "Escape") setOpen(false); }}
      />
      {open && (filtered.length > 0 || (query.length > 1 && onCreateClick)) && (
        <div style={s.dd}>
          {filtered.map((item: any) => (
            <div key={item.id} style={s.ddRow}
              onMouseDown={() => { onChange(item); setQuery(""); setOpen(false); }}>
              <span>{item.name}</span>
              {(item.primary_role || item.location_type) && (
                <span style={s.pill}>{item.primary_role || item.location_type}</span>
              )}
            </div>
          ))}
          {query.length > 1 && onCreateClick && !filtered.find((i: any) => i.name.toLowerCase() === query.toLowerCase()) && (
            <div style={s.ddCreate} onMouseDown={() => { onCreateClick(query); setQuery(""); setOpen(false); }}>
              + Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Source Account Input ──────────────────────────────────────────────────────

function SourceAccountInput({ value, onChange, suggestions }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.length > 0
    ? suggestions.filter((s: string) => s.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <input
        style={s.input}
        value={value}
        placeholder="e.g. angelabritobrand"
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => { if (e.key === "Escape") setOpen(false); }}
      />
      {open && filtered.length > 0 && (
        <div style={s.dd}>
          {filtered.map((name: string) => (
            <div key={name} style={s.ddRow}
              onMouseDown={() => { onChange(name); setOpen(false); }}>
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Modal({ title, onClose, onSave, saveDisabled, children }: any) {
  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        <div style={s.mHead}>
          <span style={s.mTitle}>{title}</span>
          <button style={s.mX} onClick={onClose}>×</button>
        </div>
        <div style={s.mBody}>{children}</div>
        <div style={s.mFoot}>
          <button style={s.btnGhost} onClick={onClose}>Cancel</button>
          <button style={{ ...s.btnPrimary, ...(saveDisabled ? s.btnOff : {}) }} disabled={saveDisabled} onClick={onSave}>Create</button>
        </div>
      </div>
    </div>
  );
}

function F({ label, children }: any) {
  return <div style={s.field}>{label && <label style={s.label}>{label}</label>}{children}</div>;
}

// ── Create modals ─────────────────────────────────────────────────────────────

function CreateBrandModal({ initialName, locations, people, onSave, onPersonCreated, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState<any>(null);
  const [city, setCity] = useState<any>(null);
  const [cdPerson, setCdPerson] = useState<any>(null); // existing person or {isNew: true, name}
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      // 1. Create brand
      const brandRes = await fetch(`${SUPABASE_URL}/rest/v1/brands`, {
        method: "POST",
        headers: { ...H, Prefer: "return=representation" },
        body: JSON.stringify({ name: name.trim(), slug: slugify(name), instagram_handle: ig || null, website: website || null, country_id: country?.id || null, city_id: city?.id || null }),
      });
      if (!brandRes.ok) throw new Error(await brandRes.text());
      const [createdBrand] = await brandRes.json();

      // 2. Handle creative director
      let cdPersonId = cdPerson?.isNew ? null : cdPerson?.id;
      if (cdPerson?.isNew && cdPerson.name) {
        const personRes = await fetch(`${SUPABASE_URL}/rest/v1/people`, {
          method: "POST",
          headers: { ...H, Prefer: "return=representation" },
          body: JSON.stringify({ name: cdPerson.name.trim(), slug: slugify(cdPerson.name), primary_role: "designer" }),
        });
        if (!personRes.ok) throw new Error(await personRes.text());
        const [createdPerson] = await personRes.json();
        cdPersonId = createdPerson.id;
        if (onPersonCreated) onPersonCreated(createdPerson);
      }
      if (cdPersonId && createdBrand.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/brand_directors`, {
          method: "POST",
          headers: { ...H, Prefer: "return=minimal" },
          body: JSON.stringify({ brand_id: createdBrand.id, person_id: cdPersonId, is_current: true }),
        });
      }

      onSave(createdBrand);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  };

  return (
    <Modal title="New Brand" onClose={onClose} saveDisabled={!name.trim() || saving} onSave={handleSave}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Instagram Handle"><input style={s.input} value={ig} onChange={e => setIg(e.target.value)} placeholder="@handle" /></F>
      <F label="Website"><input style={s.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></F>
      <Typeahead label="Country" items={locations.filter((l: any) => l.location_type === "country")} value={country} onChange={setCountry} onClear={() => setCountry(null)} />
      <Typeahead label="City" items={locations.filter((l: any) => l.location_type === "city")} value={city} onChange={setCity} onClear={() => setCity(null)} />
      <Typeahead
        label="Designer"
        items={people || []}
        value={cdPerson?.isNew ? null : cdPerson}
        onChange={setCdPerson}
        onClear={() => setCdPerson(null)}
        placeholder="Search or create..."
        onCreateClick={(n: string) => setCdPerson({ isNew: true, name: n, id: null })}
      />
      {cdPerson?.isNew && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: s.input.backgroundColor, borderRadius: 12, fontSize: 13 }}>
          <span style={{ color: "#ececec", flex: 1 }}>{cdPerson.name}</span>
          <span style={{ color: "#8e8ea0", fontSize: 11 }}>new person</span>
          <button onClick={() => setCdPerson(null)} tabIndex={-1} style={{ background: "none", border: "none", color: "#8e8ea0", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}
    </Modal>
  );
}

function CreatePersonModal({ initialName, role, roles, brands, onSave, onClose, onCreateRole }: any) {
  const [name, setName] = useState(initialName || "");
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [selectedRole, setSelectedRole] = useState<any>(
    () => roles.find((r: any) => r.slug === (role || "").replace(/_/g, "-")) || null
  );
  // Designer is the one role where a person implies a brand. Every other
  // role (photographer, stylist, etc.) stays person-only. For designers,
  // brand status is a required explicit choice — link one, or confirm
  // there isn't one (e.g. recent graduate, independent, pre-launch) — so
  // "no brand yet" and "nobody checked" are never the same state in the data.
  const [brand, setBrand] = useState<any>(null); // existing brand or {isNew: true, name}
  const [noBrandConfirmed, setNoBrandConfirmed] = useState(false);
  const isDesigner = selectedRole?.slug === "designer";
  const brandChoicePending = isDesigner && !brand && !noBrandConfirmed;

  return (
    <Modal title="New Person" onClose={onClose} saveDisabled={!name.trim() || brandChoicePending}
      onSave={() => onSave({
        name: name.trim(),
        primary_role: selectedRole?.name || null,
        instagram_url: ig || null,
        website: website || null,
        slug: slugify(name),
        brand: isDesigner ? brand : null,
        noBrandConfirmed: isDesigner ? noBrandConfirmed : false,
      })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Role">
        <InlineTypeahead
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
      </F>
      <F label="Instagram URL"><input style={s.input} value={ig} onChange={e => setIg(e.target.value)} placeholder="https://instagram.com/handle" /></F>
      <F label="Website"><input style={s.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></F>
      {isDesigner && (
        <>
          <Typeahead
            label="Brand"
            items={brands || []}
            value={brand?.isNew ? null : brand}
            onChange={(b: any) => { setBrand(b); setNoBrandConfirmed(false); }}
            onClear={() => setBrand(null)}
            placeholder="Search or create brand..."
            onCreateClick={(n: string) => { setBrand({ isNew: true, name: n, id: null }); setNoBrandConfirmed(false); }}
          />
          {brand?.isNew && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: s.input.backgroundColor, borderRadius: 12, fontSize: 13 }}>
              <span style={{ color: "#ececec", flex: 1 }}>{brand.name}</span>
              <span style={{ color: "#8e8ea0", fontSize: 11 }}>new brand</span>
              <button onClick={() => setBrand(null)} tabIndex={-1} style={{ background: "none", border: "none", color: "#8e8ea0", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}>×</button>
            </div>
          )}
          {!brand && (
            <label style={{ ...s.ckLabel, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={noBrandConfirmed}
                onChange={e => setNoBrandConfirmed(e.target.checked)}
                style={s.ck}
              />
              No brand — confirmed (e.g. recent graduate, independent, pre-launch)
            </label>
          )}
          {brandChoicePending && (
            <span style={{ fontSize: 12, color: C.dim, marginTop: -4 }}>
              Link a brand or check "No brand — confirmed" before saving.
            </span>
          )}
        </>
      )}
    </Modal>
  );
}

function CreateEventModal({ initialName, locations, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [type, setType] = useState("fashion_week");
  const [loc, setLoc] = useState<any>(null);
  const [website, setWebsite] = useState("");
  const [ig, setIg] = useState("");
  return (
    <Modal title="New Event" onClose={onClose} saveDisabled={!name.trim()}
      onSave={() => onSave({ name: name.trim(), event_type: type, location_id: loc?.id || null, website: website || null, instagram_handle: ig || null, slug: slugify(name) })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Type">
        <select style={s.select} value={type} onChange={e => setType(e.target.value)}>
          <option value="fashion_week">Fashion Week</option>
          <option value="fashion_fair">Fashion Fair</option>
          <option value="exhibition">Exhibition</option>
          <option value="showcase">Showcase</option>
          <option value="presentation_series">Presentation Series</option>
          <option value="fashion_trade_fair">Fashion Trade Fair</option>
        </select>
      </F>
      <Typeahead label="Location" items={locations} value={loc} onChange={setLoc} onClear={() => setLoc(null)} />
      <F label="Website"><input style={s.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></F>
      <F label="Instagram Handle"><input style={s.input} value={ig} onChange={e => setIg(e.target.value)} placeholder="@handle" /></F>
    </Modal>
  );
}

function CreatePublicationModal({ initialName, locations, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [pubType, setPubType] = useState("magazine");
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState<any>(null);
  return (
    <Modal title="New Publication" onClose={onClose} saveDisabled={!name.trim()}
      onSave={() => onSave({ name: name.trim(), slug: slugify(name), publication_type: pubType, instagram_handle: ig || null, website: website || null, country_id: country?.id || null })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Type">
        <select style={s.select} value={pubType} onChange={e => setPubType(e.target.value)}>
          <option value="magazine">Magazine</option>
          <option value="digital">Digital</option>
          <option value="newspaper">Newspaper</option>
          <option value="trade">Trade</option>
        </select>
      </F>
      <Typeahead label="Country" items={locations.filter((l: any) => l.location_type === "country")} value={country} onChange={setCountry} onClear={() => setCountry(null)} />
      <F label="Instagram Handle"><input style={s.input} value={ig} onChange={e => setIg(e.target.value)} placeholder="@vogue" /></F>
      <F label="Website"><input style={s.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://vogue.com" /></F>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const CREDIT_ROLES_SEED = [
  { id: "r1", slug: "creative-director", name: "creative director", sort_order: 10 },
  { id: "r2", slug: "photographer", name: "photographer", sort_order: 20 },
  { id: "r3", slug: "stylist", name: "stylist", sort_order: 30 },
  { id: "r4", slug: "fashion-editor", name: "fashion editor", sort_order: 40 },
  { id: "r5", slug: "art-director", name: "art director", sort_order: 50 },
  { id: "r6", slug: "set-designer", name: "set designer", sort_order: 60 },
  { id: "r7", slug: "hair", name: "hair", sort_order: 70 },
  { id: "r8", slug: "makeup", name: "makeup", sort_order: 80 },
  { id: "r9", slug: "casting-director", name: "casting director", sort_order: 90 },
  { id: "r10", slug: "model", name: "model", sort_order: 100 },
];

type Contributor = { key: string; role: any; person: any };
type BrandRow    = { key: string; brand: any; isCourtesy: boolean };

export default function IntakePage() {
  const [publication, setPublication] = useState<any>(null);
  const [publicationIssueMonth, setPublicationIssueMonth] = useState("");
  const [publicationIssueYear, setPublicationIssueYear] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [cdnUrl, setCdnUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [isKeyLook, setIsKeyLook] = useState(false);

  const [brandRows, setBrandRows] = useState<BrandRow[]>([]);
  const [isCollab, setIsCollab] = useState(false);

  const [contributors, setContributors] = useState<Contributor[]>([]);

  const [event, setEvent] = useState<any>(null);
  const [scene, setScene] = useState("");
  const [seasonTerm, setSeasonTerm] = useState("");
  const [seasonYear, setSeasonYear] = useState("");
  const [gender, setGender] = useState("");
  const [publishDate, setPublishDate] = useState("");

  const [notes, setNotes] = useState("");

  const [brands, setBrands] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [publications, setPublications] = useState<any[]>([]);
  const [creditRoles, setCreditRoles] = useState(CREDIT_ROLES_SEED);
  const [sourceNames, setSourceNames] = useState<string[]>([]);

  const [modal, setModal] = useState<any>(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [warnMsg, setWarnMsg] = useState("");
  const [successCount, setSuccessCount] = useState(0);

  useEffect(() => {
    async function loadEntities() {
      // sbAll paginates through the whole table — replaces the seven
      // ad-hoc `Range: 0-9999` fetches that used to live here. The
      // Range-header approach silently truncated at 10k rows; sbAll
      // handles any size and lives in the shared helper so we don't
      // duplicate the pagination logic anywhere else.
      try {
        const [b, p, e, l, cr, sn, pubs] = await Promise.all([
          sbAll("brands?select=id,name,slug&order=name"),
          sbAll("people?select=id,name,primary_role&order=name"),
          sbAll("events?select=id,name,event_type&order=name"),
          sbAll("locations?select=id,name,location_type,country_code&order=location_type,name"),
          sbAll("credit_roles?select=id,slug,name,sort_order&order=sort_order"),
          sbAll("looks?select=source_name&not=source_name.is.null&order=source_name"),
          sbAll("publications?select=id,name,slug,publication_type,country_id&order=name"),
        ]);
        if (Array.isArray(b) && b.length > 0) setBrands(b);
        if (Array.isArray(p) && p.length > 0) setPeople(p);
        if (Array.isArray(e) && e.length > 0) setEvents(e);
        if (Array.isArray(l) && l.length > 0) setLocations(l);
        if (Array.isArray(cr) && cr.length > 0) setCreditRoles(cr);
        if (Array.isArray(sn) && sn.length > 0) {
          const unique = [...new Set(sn.map((r: any) => r.source_name?.trim()).filter(Boolean))].sort();
          setSourceNames(unique);
        }
        if (Array.isArray(pubs) && pubs.length > 0) setPublications(pubs);
      } catch (err) {
        console.error("Failed to load entities:", err);
      }
    }
    loadEntities();
  }, []);

  const cdRole = () => creditRoles.find(r => r.slug === "creative-director") || creditRoles[0];

  async function autoAddBrandCD(b: any) {
    if (!b?.id || b.id.startsWith("local-")) return;
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/brand_directors?brand_id=eq.${b.id}&is_current=eq.true&select=person_id,people(id,name,primary_role)`,
        { headers: H }
      );
      const rows = await res.json();
      const directors = rows?.map((r: any) => r.people).filter(Boolean) || [];
      if (directors.length > 0) {
        const role = cdRole();
        setContributors(prev => {
          const additions = directors
            .filter((d: any) => !prev.find(c => c.person?.id === d.id && c.role?.slug === "creative-director"))
            .map((d: any) => ({ key: `cd-${d.id}-${Date.now()}`, role, person: d }));
          return [...prev, ...additions];
        });
      }
    } catch { /* skip */ }
  }

  function addBrandRow() {
    setBrandRows(prev => [...prev, { key: `b-${Date.now()}-${prev.length}`, brand: null, isCourtesy: false }]);
  }
  function updateBrandRow(key: string, brand: any) {
    setBrandRows(prev => prev.map(b => b.key === key ? { ...b, brand } : b));
    if (brand) autoAddBrandCD(brand);
  }
  function toggleBrandCourtesy(key: string) {
    setBrandRows(prev => prev.map(b => b.key === key ? { ...b, isCourtesy: !b.isCourtesy } : b));
  }
  function removeBrandRow(key: string) {
    setBrandRows(prev => prev.filter(b => b.key !== key));
  }

  function addContributor() {
    setContributors(prev => [...prev, { key: `c-${Date.now()}-${prev.length}`, role: null, person: null }]);
  }
  function updateContributorRole(key: string, role: any) {
    setContributors(prev => prev.map(c => c.key === key ? { ...c, role } : c));
  }
  function updateContributorPerson(key: string, person: any) {
    setContributors(prev => prev.map(c => {
      if (c.key !== key) return c;
      let role = c.role;
      if (!role && person?.primary_role) {
        const pr = person.primary_role;
        const match = creditRoles.find((r: any) =>
          r.name === pr || r.slug === pr.replace(/_/g, "-")
        );
        if (match) role = match;
      }
      return { ...c, person, role };
    }));
  }
  function removeContributor(key: string) {
    setContributors(prev => prev.filter(c => c.key !== key));
  }

  async function createRole(name: string, rowKey: string) {
    const slug = slugify(name);
    try {
      const created = await post("credit_roles", { name: name.trim().toLowerCase(), slug, sort_order: 999 });
      setCreditRoles(prev => [...prev, created].sort((a: any, b: any) => a.sort_order - b.sort_order));
      updateContributorRole(rowKey, created);
    } catch (e: any) {
      // Do NOT fabricate a local-* role on failure. A fake id here silently
      // poisons contributor state; look_credits INSERT later fails with an
      // FK error that reads as if the whole ingest is broken. Surface the
      // create error immediately; the role field stays empty so the user
      // can pick an existing role or retry.
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
      // Same reasoning as createRole. Return null; caller's
      // `if (created) setSelectedRole(created)` handles null cleanly.
      alert(`Couldn't create role "${name}": ${e?.message || "unknown error"}`);
      return null;
    }
  }

  async function handleCreateBrand(created: any) {
    // CreateBrandModal already POSTed the brand AND linked the CD before
    // calling onSave. Previously this function tried to POST the same brand
    // AGAIN via post("brands", data) — hit the unique constraint on slug,
    // the catch swallowed it, and a fake local-* brand replaced the real one
    // in state. Any look built against that fake brand then failed at save
    // with an FK error. Just merge the already-created brand into state.
    setBrands(p => [...p, created].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    if (modal?.target?.startsWith("brandrow:")) updateBrandRow(modal.target.split(":")[1], created);
    setModal(null);
  }

  async function handleCreatePerson(data: any) {
    const { brand: brandData, noBrandConfirmed, ...personData } = data;
    if (noBrandConfirmed) personData.no_brand_confirmed_at = new Date().toISOString();

    let c;
    try {
      c = await post("people", personData);
    } catch (e: any) {
      // Do NOT fabricate a local-* person. A fake id here would silently
      // poison state and cause an FK error at look-save time disconnected
      // from this create. Surface the error and bail; user can retry.
      alert(`Couldn't create person "${personData.name}": ${e?.message || "unknown error"}`);
      return;
    }
    setPeople(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));

    // Designer + brand specified → create/link the brand so this person is
    // never left floating with no brand_directors row. Mirrors handleSave
    // in CreateBrandModal, just in the opposite direction.
    if (brandData && c.id) {
      try {
        let brandId = brandData.isNew ? null : brandData.id;
        if (brandData.isNew && brandData.name) {
          const createdBrand = await post("brands", { name: brandData.name.trim(), slug: slugify(brandData.name) });
          brandId = createdBrand.id;
          setBrands(prev => [...prev, createdBrand].sort((a: any, b: any) => a.name.localeCompare(b.name)));
        }
        if (brandId) {
          await fetch(`${SUPABASE_URL}/rest/v1/brand_directors`, {
            method: "POST",
            headers: { ...H, Prefer: "return=minimal" },
            body: JSON.stringify({ brand_id: brandId, person_id: c.id, is_current: true }),
          });
        }
      } catch (e: any) {
        // Person was already created successfully — don't block on the brand link failing.
        // Surface it so it doesn't fail silently and re-create the exact gap we're fixing.
        alert(`Person created, but brand link failed: ${e.message}`);
      }
    }

    if (modal?.target?.startsWith("contributor:")) updateContributorPerson(modal.target.split(":")[1], c);
    setModal(null);
  }

  async function handleCreateEvent(data: any) {
    let c;
    try {
      c = await post("events", data);
    } catch (e: any) {
      alert(`Couldn't create event "${data.name}": ${e?.message || "unknown error"}`);
      return;
    }
    setEvents(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setEvent(c);
    setModal(null);
  }

  async function handleCreatePublication(data: any) {
    let c;
    try {
      c = await post("publications", data);
    } catch (e: any) {
      alert(`Couldn't create publication "${data.name}": ${e?.message || "unknown error"}`);
      return;
    }
    setPublications(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setPublication(c);
    setModal(null);
  }

  async function post(path: string, data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: "POST",
      headers: { ...H, Prefer: "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json())[0];
  }

  async function handleSubmit() {
    if (!cdnUrl.trim()) { setStatus("error"); setErrorMsg("CDN image URL is required."); return; }
    setStatus("submitting"); setErrorMsg(""); setWarnMsg("");

    const cleanId = (x: any) => (x?.id && !x.id.startsWith("local-") ? x.id : null);
    const validBrandRows = brandRows.filter(b => cleanId(b.brand));

    const look = {
      source_url: sourceUrl.trim() || null,
      source_cdn_url: cdnUrl.trim(),
      source_name: sourceName.trim() || null,
      publication_id: cleanId(publication),
      publication_issue_month: publicationIssueMonth ? parseInt(publicationIssueMonth) : null,
      publication_issue_year: publicationIssueYear ? parseInt(publicationIssueYear) : null,
      is_collaboration: isCollab,
      event_id: cleanId(event),
      scene: scene || "other",
      season_term: seasonTerm || null,
      season_year: seasonYear ? parseInt(seasonYear) : null,
      gender: gender || null,
      date_published: publishDate || null,
      is_key_look: isKeyLook,
      status: "draft",
      notes: notes.trim() || null,
    };

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/looks`, {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify(look),
      });
      if (!res.ok) throw new Error(await res.text());
      const lookId = (await res.json())[0]?.id;

      // Collect problems instead of assuming success — a look that's created
      // but missing credits is a silent data gap, not a successful ingest.
      const warnings: string[] = [];

      // credit_order column was dropped from look_brand_credits and
      // look_credits by the Aug 2026 flip_designer_attribution migration —
      // any display ordering now derives from created_at + brand_id at
      // read time. Rows go in without an ordering column; do not re-add.
      const brandCredits = validBrandRows.map(b => ({
        look_id: lookId,
        brand_id: cleanId(b.brand)!,
        role: null,
        is_courtesy: b.isCourtesy,
      }));
      if (brandCredits.length > 0) {
        const bcRes = await fetch(`${SUPABASE_URL}/rest/v1/look_brand_credits`, {
          method: "POST",
          headers: { ...H, "Prefer": "return=representation" },
          body: JSON.stringify(brandCredits),
        });
        if (!bcRes.ok) warnings.push(`Brand credits failed to save: ${await bcRes.text()}`);
      }

      // Contributors get dropped from the credits write for three reasons —
      // surface all three instead of letting them vanish silently. The
      // create* helpers no longer fabricate local-* ids, but the filters
      // stay in place as belt-and-suspenders in case anything leaks in from
      // an older session or a code path we missed.
      const missingRole = contributors.filter(c => c.person && !c.person.id?.startsWith("local-") && !c.role);
      if (missingRole.length > 0) {
        warnings.push(`Skipped (no role selected): ${missingRole.map(c => c.person.name).join(", ")}`);
      }
      const unsavedPerson = contributors.filter(c => c.person?.id?.startsWith("local-"));
      if (unsavedPerson.length > 0) {
        warnings.push(`Skipped (person record failed to save): ${unsavedPerson.map(c => c.person.name).join(", ")}`);
      }
      const unsavedRole = contributors.filter(c => c.person && !c.person.id?.startsWith("local-") && c.role?.id?.startsWith("local-"));
      if (unsavedRole.length > 0) {
        warnings.push(`Skipped (role failed to save): ${unsavedRole.map(c => `"${c.role.name}" on ${c.person.name}`).join(", ")}`);
      }

      const credits = contributors
        .filter(c => c.person && !c.person.id?.startsWith("local-") && c.role && !c.role.id?.startsWith("local-"))
        .map(c => ({ look_id: lookId, person_id: c.person.id, role: c.role.name }));
      if (credits.length > 0) {
        const ccRes = await fetch(`${SUPABASE_URL}/rest/v1/look_credits`, {
          method: "POST",
          headers: { ...H, "Prefer": "return=representation" },
          body: JSON.stringify(credits),
        });
        if (!ccRes.ok) warnings.push(`Person credits failed to save: ${await ccRes.text()}`);
      }

      if (warnings.length > 0) {
        setStatus("warning");
        setWarnMsg(warnings.join(" · "));
      } else {
        setStatus("success");
        setSuccessCount(c => c + 1);
      }
      resetForm();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message || "Submission failed.");
    }
  }

  function resetForm() {
    setSourceUrl(""); setCdnUrl(""); setSourceName(""); setIsKeyLook(false);
    setBrandRows([]); setIsCollab(false);
    setContributors([]);
    setEvent(null); setScene(""); setSeasonTerm(""); setSeasonYear(""); setGender(""); setPublishDate("");
    setNotes(""); setPublication(null); setPublicationIssueMonth(""); setPublicationIssueYear("");
    setTimeout(() => setStatus("idle"), 3000);
  }

  const cdnErr = status === "error" && !cdnUrl.trim();

  return (
    <>
      <style>{`
        ${FONT_IMPORT}
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: Inter, sans-serif; }
        input::placeholder, textarea::placeholder { color: #888; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "calc(100vh - 44px)", backgroundColor: C.bg, color: C.text, fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 100px" }}>

          <Card title="Source">
            <div style={s.row2}>
              <F label="Post URL">
                <input style={s.input} value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://www.instagram.com/p/..." />
              </F>
              <F label="CDN Image URL *">
                <input style={{ ...s.input, ...(cdnErr ? { outline: `1.5px solid ${C.red}` } : {}) }}
                  value={cdnUrl} onChange={e => setCdnUrl(e.target.value)}
                  placeholder="https://scontent-....cdninstagram.com/..." />
              </F>
            </div>
            <div style={s.row2}>
              <F label="Source Account (handle only)">
                <SourceAccountInput value={sourceName} onChange={setSourceName} suggestions={sourceNames} />
              </F>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <label style={s.ckLabel}>
                  <input type="checkbox" checked={isKeyLook} onChange={e => setIsKeyLook(e.target.checked)} style={s.ck} />
                  Key Look
                </label>
              </div>
            </div>
            <Typeahead label="Publication" items={publications}
              value={publication} onChange={setPublication} onClear={() => { setPublication(null); setPublicationIssueMonth(""); setPublicationIssueYear(""); }}
              placeholder="e.g. Vogue, i-D, Dazed..."
              onCreateClick={(name: string) => setModal({ type: "publication", name })} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, opacity: publication ? 1 : 0.4, pointerEvents: publication ? "auto" : "none" }}>
              <div style={s.field}>
                <label style={s.label}>Issue Month</label>
                <select style={s.select} value={publicationIssueMonth} onChange={e => setPublicationIssueMonth(e.target.value)} disabled={!publication}>
                  <option value="">— month —</option>
                  {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                    <option key={i+1} value={String(i+1)}>{m}</option>
                  ))}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Year</label>
                <input style={s.input} value={publicationIssueYear} onChange={e => setPublicationIssueYear(e.target.value)}
                  placeholder="2024" maxLength={4} disabled={!publication} />
              </div>
            </div>
          </Card>

          <Card title="Attribution">
            <div style={s.field}>
              <label style={s.label}>Brands</label>
              <span style={{ fontSize: 12, color: C.dim, marginTop: -2 }}>One or more brands in this look. Check "Courtesy" when no photographer is identified.</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                {brandRows.map(b => (
                  <div key={b.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <InlineTypeahead
                      items={brands}
                      value={b.brand}
                      onChange={(br: any) => updateBrandRow(b.key, br)}
                      onClear={() => updateBrandRow(b.key, null)}
                      placeholder="Search or create brand..."
                      onCreateClick={(name: string) => setModal({ type: "brand", name, target: `brandrow:${b.key}` })}
                    />
                    <label style={{ ...s.ckLabel, fontSize: 13, color: b.brand ? C.text : C.dim, cursor: b.brand ? "pointer" : "default", whiteSpace: "nowrap" }}>
                      <input type="checkbox" checked={b.isCourtesy} disabled={!b.brand} onChange={() => toggleBrandCourtesy(b.key)} style={s.ck} />
                      Courtesy
                    </label>
                    <button tabIndex={-1} onClick={() => removeBrandRow(b.key)} style={s.rowX}>×</button>
                  </div>
                ))}
                <button onClick={addBrandRow} style={s.addRow}>+ Add brand</button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={s.ckLabel}>
                <input type="checkbox" checked={isCollab} style={s.ck}
                  onChange={e => setIsCollab(e.target.checked)} />
                This is a collaboration
              </label>
              <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>official co-creation between the brands above</span>
            </div>

            <div style={s.field}>
              <label style={s.label}>Contributors</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {contributors.map(c => (
                  <div key={c.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <InlineTypeahead
                      items={people}
                      value={c.person}
                      onChange={(p: any) => updateContributorPerson(c.key, p)}
                      onClear={() => updateContributorPerson(c.key, null)}
                      placeholder="Search or create person..."
                      onCreateClick={(name: string) => setModal({ type: "person", name, role: c.role?.slug ? c.role.slug.replace(/-/g, "_") : null, target: `contributor:${c.key}` })}
                    />
                    <InlineTypeahead
                      width={180}
                      items={creditRoles}
                      value={c.role}
                      onChange={(r: any) => updateContributorRole(c.key, r)}
                      onClear={() => updateContributorRole(c.key, null)}
                      placeholder="Role..."
                      onCreateClick={(name: string) => createRole(name, c.key)}
                    />
                    <button tabIndex={-1} onClick={() => removeContributor(c.key)} style={s.rowX}>×</button>
                  </div>
                ))}
                <button onClick={addContributor} style={s.addRow}>+ Add contributor</button>
              </div>
            </div>
          </Card>

          <Card title="Context">
            <Typeahead label="Event" items={events} value={event}
              onChange={setEvent} onClear={() => setEvent(null)}
              onCreateClick={(name: string) => setModal({ type: "event", name })} />
            <div style={s.row2}>
              <F label="Scene">
                <select style={s.select} value={scene} onChange={e => setScene(e.target.value)}>
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
                <select style={s.select} value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">— select —</option>
                  <option value="womenswear">Womenswear</option>
                  <option value="menswear">Menswear</option>
                  <option value="unisex">Unisex</option>
                </select>
              </F>
            </div>
            <div style={s.row2}>
              <F label="Season">
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ ...s.select, flex: 1 }} value={seasonTerm} onChange={e => setSeasonTerm(e.target.value)}>
                    <option value="">— term —</option>
                    <option value="Spring">Spring</option>
                    <option value="Summer">Summer</option>
                    <option value="Fall">Fall</option>
                    <option value="Winter">Winter</option>
                    <option value="Resort">Resort</option>
                    <option value="Pre-Fall">Pre-Fall</option>
                    <option value="No Season">No Season</option>
                  </select>
                  <input style={{ ...s.input, width: 72, flexShrink: 0 }} value={seasonYear}
                    onChange={e => setSeasonYear(e.target.value)} placeholder="2025" maxLength={4} />
                </div>
              </F>
              <F label="Publish Date">
                <input type="date" style={s.input} value={publishDate} onChange={e => setPublishDate(e.target.value)} />
              </F>
            </div>
          </Card>

          <Card title="Notes">
            <textarea style={s.ta} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. confirm season, find photographer credit..." rows={2} />
          </Card>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingTop: 4 }}>
            {errorMsg && <span style={{ fontSize: 13, color: C.red }}>{errorMsg}</span>}
            {warnMsg && <span style={{ fontSize: 13, color: C.amber, maxWidth: 420, textAlign: "right" }}>⚠ Look created, but: {warnMsg}</span>}
            {status === "success" && <span style={{ fontSize: 13, color: C.green }}>✓ Ingested — Cloudinary processing</span>}
            {successCount > 0 && <span style={{ fontSize: 13, color: C.muted }}>{successCount} ingested</span>}
            <button
              style={{ height: 44, padding: "0 28px", backgroundColor: C.white, color: "#212121", border: "none", borderRadius: 22, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif", opacity: status === "submitting" ? 0.4 : 1 }}
              onClick={handleSubmit} disabled={status === "submitting"}>
              {status === "submitting" ? "Ingesting..." : "Ingest Look →"}
            </button>
          </div>
        </div>

        {modal?.type === "brand" && <CreateBrandModal initialName={modal.name} locations={locations} people={people} onSave={handleCreateBrand} onPersonCreated={(p: any) => setPeople(prev => [...prev, p].sort((a: any, b: any) => a.name.localeCompare(b.name)))} onClose={() => setModal(null)} />}
        {modal?.type === "person" && <CreatePersonModal initialName={modal.name} role={modal.role} roles={creditRoles} brands={brands} onSave={handleCreatePerson} onClose={() => setModal(null)} onCreateRole={createRoleForModal} />}
        {modal?.type === "event" && <CreateEventModal initialName={modal.name} locations={locations} onSave={handleCreateEvent} onClose={() => setModal(null)} />}
        {modal?.type === "publication" && <CreatePublicationModal initialName={modal.name} locations={locations} onSave={handleCreatePublication} onClose={() => setModal(null)} />}
      </div>
    </>
  );
}

function Card({ title, children }: any) {
  return (
    <div style={{ backgroundColor: C.lift1, borderRadius: 16, padding: "18px 20px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 13 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.09em", textTransform: "uppercase", color: C.muted }}>{title}</div>
      {children}
    </div>
  );
}

const s: Record<string, any> = {
  field: { display: "flex", flexDirection: "column", gap: 5, position: "relative" },
  label: { fontSize: 13, fontWeight: 600, color: C.text },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  input: { height: 42, padding: "0 16px", border: "1px solid #505050", borderRadius: 12, backgroundColor: "#484848", color: C.text, fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none", width: "100%" },
  select: { height: 42, padding: "0 16px", border: "1px solid #505050", borderRadius: 12, backgroundColor: "#484848", color: C.text, fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none", width: "100%", cursor: "pointer" },
  ta: { padding: "12px 16px", border: "1px solid #505050", borderRadius: 12, backgroundColor: "#484848", color: C.text, fontSize: 14, fontFamily: "Inter,sans-serif", outline: "none", width: "100%", resize: "vertical", lineHeight: 1.5 },
  chip: { display: "inline-flex", alignItems: "center", gap: 8, height: 42, padding: "0 16px", backgroundColor: "#484848", borderRadius: 12, fontSize: 14, border: "1px solid #606060" },
  chipX: { background: "none", border: "none", color: C.muted, fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1 },
  rowX: { background: "none", border: "none", color: C.muted, fontSize: 22, cursor: "pointer", padding: "0 4px", lineHeight: 1, flexShrink: 0 },
  addRow: { alignSelf: "flex-start", background: "transparent", border: `1.5px dashed ${C.lift3}`, color: C.muted, padding: "8px 16px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif" },
  ckLabel: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: C.text, userSelect: "none" },
  ck: { width: 15, height: 15, cursor: "pointer", accentColor: C.white },
  dd: { position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: C.lift2, borderRadius: 12, zIndex: 300, marginTop: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", maxHeight: 240, overflowY: "auto" },
  ddRow: { padding: "10px 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14, color: C.text, borderBottom: `1px solid ${C.lift1}` },
  ddCreate: { padding: "10px 16px", cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 },
  pill: { fontSize: 11, color: C.muted, backgroundColor: C.lift1, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },
  overlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: C.lift1, borderRadius: 20, width: "100%", maxWidth: 420, boxShadow: "0 16px 48px rgba(0,0,0,0.6)" },
  mHead: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: `1px solid ${C.lift2}` },
  mTitle: { fontSize: 15, fontWeight: 600, color: C.text },
  mX: { background: "none", border: "none", color: C.dim, fontSize: 24, cursor: "pointer", padding: 0, lineHeight: 1 },
  mBody: { padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 },
  mFoot: { padding: "14px 20px", borderTop: `1px solid ${C.lift2}`, display: "flex", justifyContent: "flex-end", gap: 10 },
  btnPrimary: { height: 40, padding: "0 22px", backgroundColor: C.white, color: "#212121", border: "none", borderRadius: 20, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  btnGhost: { height: 40, padding: "0 18px", backgroundColor: C.lift2, color: C.muted, border: "none", borderRadius: 20, fontSize: 14, cursor: "pointer" },
  btnOff: { opacity: 0.4, cursor: "not-allowed" },
};
