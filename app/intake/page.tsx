"use client";

import { useState, useRef, useEffect } from "react";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const PLATFORMS = [
  { id: "457b78e4-4758-455b-a72b-7ee79c41b46a", name: "Instagram", slug: "instagram" },
  { id: "f003e6ff-7e20-459e-85c8-95d2bdc666c7", name: "Brand Website", slug: "brand-website" },
  { id: "0cb4b776-cea5-483d-8b75-2a75d356e68d", name: "Arise Fashion Week", slug: "arise-fashion-week" },
  { id: "d0f372ca-984e-4d83-9cc9-eefb4953fbee", name: "Dakar Fashion Week", slug: "dakar-fashion-week" },
  { id: "6c404e95-db6a-4b08-ab82-4bcd8c19e9f8", name: "Dazed", slug: "dazed" },
  { id: "63ff261f-d445-47d1-bfa4-3fa9226ffdb6", name: "Fashion Network", slug: "fashion-network" },
  { id: "b00ef47b-e584-48c0-b0de-ba384508f8d1", name: "Highsnobiety", slug: "highsnobiety" },
  { id: "9f964305-b9c5-4276-803a-021067dc3f05", name: "Hypebeast", slug: "hypebeast" },
  { id: "d3e59786-4c92-497a-99f4-607c10e3c43e", name: "i-D Magazine", slug: "id-magazine" },
  { id: "a2e86215-044a-4e3b-9b7f-f53c6ae8b64c", name: "Lagos Fashion Week", slug: "lagos-fashion-week" },
  { id: "de5cbaff-35cc-4e88-b60c-56c2fa1248fa", name: "Nairobi Fashion Week", slug: "nairobi-fashion-week" },
  { id: "a5da175b-39d9-40e3-a58d-3f30a5e65acd", name: "SDR Photo", slug: "sdr-photo" },
  { id: "fc9570c9-0ab0-4033-9caf-4a0b99c6ffef", name: "South Africa Fashion Week", slug: "sa-fashion-week" },
  { id: "8fa0b045-3bd1-4fdd-bf0f-5a4ea4b59447", name: "Style House Files", slug: "style-house-files" },
  { id: "197a6028-9289-4f75-bd39-a4b23c6ae1b6", name: "System Magazine", slug: "system-magazine" },
  { id: "97e8da1e-6ce6-419e-85d8-1a89f8b7f3a8", name: "Vogue", slug: "vogue" },
  { id: "1192d6e1-deb3-4025-83ec-4fa679811b95", name: "Vogue Runway", slug: "vogue-runway" },
];

const BRANDS_SEED = [
  { id: "6c3f6478-130a-48fb-9134-dd812be0a271", name: "Absent Findings" },
  { id: "d4266d56-8b88-4dbd-9685-faa6064a6887", name: "Ahluwalia" },
  { id: "37fe3b12-acb0-4ca1-bfe5-4bbf3d138d3d", name: "Ajabeng" },
  { id: "e335baaf-e5b5-46c7-bb69-22f61651ef79", name: "Orange Culture" },
  { id: "d471337c-936b-4a6f-9b5e-ccacd13b739e", name: "Thebe Magugu" },
  { id: "2f1e3aba-22f7-4d88-acfa-68bcfe8ee706", name: "Emmy Kasbit" },
  { id: "2e8fc4b8-f369-4c1c-9515-7a0f44a6ada9", name: "MaXhosa Africa" },
  { id: "87e6de5a-3a64-40eb-a95b-af1e86d05198", name: "Lagos Space Programme" },
  { id: "6f105708-5ff6-4234-9fa1-996e04084c27", name: "Iamisigo" },
  { id: "873c143a-3deb-422f-aa75-fa97ed56690b", name: "Kilentar" },
  { id: "934feec4-f3fc-48d6-bf60-2161447d1b7e", name: "Rich Mnisi" },
  { id: "3af43919-6872-4241-ad95-aa1c887ca917", name: "Sindiso Khumalo" },
  { id: "0f29f594-f430-4c9b-bf69-ddb75c444582", name: "Selly Raby Kane" },
  { id: "cbfd089d-3d3a-4949-8785-37f5868a13b1", name: "Tongoro" },
  { id: "f2aee82a-68ed-423d-abb4-baa3c623bb63", name: "Maki Oh" },
  { id: "e017f773-61f6-4c41-9364-f2f10a7d71db", name: "Tokyo James" },
  { id: "f2d47a6a-7cd0-481d-994e-cb084ed5246b", name: "Tolu Coker" },
  { id: "304e5e18-5dbb-4cc0-af39-7ab6551b6bd4", name: "Lukhanyo Mdingi" },
  { id: "96587400-555d-4ed8-8019-38cdd24c5314", name: "Kenneth Ize" },
  { id: "d3a5782a-abce-47b3-95b3-c8485d9052cd", name: "Masa Mara" },
];

const PEOPLE_SEED = [
  { id: "f4da6e79-1016-46dd-98bd-c12b6fecf939", name: "Adebayo Oke-Lawal", primary_role: "creative director" },
  { id: "d4191ed0-bf88-490a-a438-a74aedebb7a0", name: "Thebetsile Magugu", primary_role: "creative director" },
  { id: "a2c783cd-9b62-43a4-bcac-7c10d84a41c8", name: "Rich Mnisi", primary_role: "creative director" },
  { id: "268b1854-bd7e-458d-a516-e863311ba030", name: "Sindiso Khumalo", primary_role: "creative director" },
  { id: "97be7108-5f20-4424-aa41-5133ea3ce9ef", name: "Priya Ahluwalia", primary_role: "creative director" },
  { id: "20c770f9-8101-4115-aa17-bcf8c387071e", name: "Tolu Coker", primary_role: "creative director" },
  { id: "16b49f40-8bda-40b5-bb7b-37ae1f2ebea1", name: "Lukhanyo Mdingi", primary_role: "creative director" },
  { id: "b34790e5-1f4e-48d8-998e-1e1c4118ca64", name: "Kristin Lee Moolman", primary_role: "photographer" },
  { id: "3ff2d938-508a-45ac-aec5-fc75e172d633", name: "Simon Deiner", primary_role: "photographer" },
  { id: "60f15aa2-af09-47c8-8ef4-8d772af2ea76", name: "Ibrahim Kamara", primary_role: "photographer" },
  { id: "3b882d1c-a9f0-47c1-a7e9-8fc8883860ad", name: "Tosin Ogundadegbe", primary_role: "stylist" },
  { id: "b3076fee-c51b-44ad-89b9-5cc5f8885d2f", name: "Beri Kukua", primary_role: "stylist" },
  { id: "be1e8f31-d705-473c-a5bb-2655e0a32049", name: "Eniafe Momodu", primary_role: "stylist" },
];

const LOCATIONS_SEED = [
  { id: "fe519377-3486-40de-b508-4100daebf2fb", name: "Lagos", location_type: "city" },
  { id: "9f928bc8-136e-4466-b649-1f157e15aee4", name: "Accra", location_type: "city" },
  { id: "7f988e5c-f642-442d-81ef-22bc420bb97a", name: "Johannesburg", location_type: "city" },
  { id: "c81ee8d5-799a-4af4-9287-0f29ae83fb6a", name: "Cape Town", location_type: "city" },
  { id: "74352752-4a91-4c65-824b-509041fed6aa", name: "Nairobi", location_type: "city" },
  { id: "c6b94ca0-fa31-4dcb-929d-9c323fb6145e", name: "Dakar", location_type: "city" },
  { id: "779be68c-cfd1-4ded-8462-c6c1762eee25", name: "Paris", location_type: "city" },
  { id: "b0777b8c-0fdd-4139-a893-acc895255936", name: "London", location_type: "city" },
  { id: "2dde81c9-ee7d-49d9-b2ba-27211648b24b", name: "New York City", location_type: "city" },
  { id: "3eb9335a-76f9-4a8b-9fba-5c08d5a46121", name: "Mumbai", location_type: "city" },
  { id: "d0f2239e-8964-438e-b32e-789a2b4255c3", name: "Jakarta", location_type: "city" },
  { id: "efaaea08-9ee8-410d-80ee-19ae44044d2a", name: "São Paulo", location_type: "city" },
  { id: "1ac42e4f-4510-499d-b479-02657f265689", name: "Nigeria", location_type: "country" },
  { id: "99fe2396-7c8e-4154-b9d0-0dbec5f43a07", name: "South Africa", location_type: "country" },
  { id: "d8ebe365-8c6f-4665-8d80-5cb8fe893e87", name: "Ghana", location_type: "country" },
  { id: "47eec268-bd27-47a4-b348-5a556b3494a9", name: "Kenya", location_type: "country" },
  { id: "7f661801-217d-4e5d-8719-f33f73750bda", name: "Senegal", location_type: "country" },
  { id: "6c3871b7-422e-470e-b39b-b3a3470929f6", name: "India", location_type: "country" },
  { id: "e86dbc98-99b2-4bf5-a065-701163810c0d", name: "Indonesia", location_type: "country" },
  { id: "1c288058-de05-42c0-8f39-56ed63da8cfb", name: "United Kingdom", location_type: "country" },
  { id: "e1182073-90ca-488b-9dc4-a0fe8a5163f4", name: "France", location_type: "country" },
];

const EVENTS_SEED = [
  { id: "b196c528-f381-490d-9ea6-daf7981663d1", name: "Lagos Fashion Week", event_type: "fashion_week" },
  { id: "319f8d7b-5e6e-4f3c-b726-5f914c94fc82", name: "South African Fashion Week", event_type: "fashion_week" },
  { id: "9df58881-8ca7-47c4-abe5-530c48d064b0", name: "London Fashion Week", event_type: "fashion_week" },
  { id: "6e130467-baf6-478c-8c54-31f1a81e8cdf", name: "Paris Fashion Week", event_type: "fashion_week" },
  { id: "31d50ffe-231f-4623-88c3-e6fbd129bb1a", name: "New York Fashion Week", event_type: "fashion_week" },
  { id: "939a2687-9e4d-4839-aa5d-48d26432db45", name: "Jakarta Fashion Week", event_type: "fashion_week" },
  { id: "9190c268-7757-4d40-a382-206be43fd905", name: "Lakme Fashion Week", event_type: "fashion_week" },
  { id: "19ad70f7-5c11-4a2d-9961-625934503f42", name: "GTCO Fashion Weekend", event_type: "fashion_fair" },
  { id: "61c1a0e5-9336-4ea2-a2ad-86006f55f136", name: "Pitti Uomo", event_type: "presentation_series" },
];

const SUPABASE_URL = "https://rsslbgfbdoqxgogbuuzc.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzc2xiZ2ZiZG9xeGdvZ2J1dXpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjE2NTUsImV4cCI6MjA3NjEzNzY1NX0.lBL-KUrQbT9N4ACc-CdMauvXmhtuG9_Jr7nhIhQz-g0";

// ── Shared headers — used everywhere ─────────────────────────────────────────
const H = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_ANON_KEY,
  "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
};

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: "#212121", lift1: "#2f2f2f", lift2: "#3a3a3a", lift3: "#424242",
  text: "#ececec", muted: "#8e8ea0", dim: "#555",
  white: "#fff", green: "#4caf6e", red: "#e05a4e",
};

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Typeahead ─────────────────────────────────────────────────────────────────

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
          <button onClick={onClear} style={s.chipX}>×</button>
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
          {query.length > 1 && onCreateClick && (
            <div style={s.ddCreate} onMouseDown={() => { onCreateClick(query); setQuery(""); setOpen(false); }}>
              + Create "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

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

function CreateBrandModal({ initialName, locations, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [ig, setIg] = useState("");
  const [website, setWebsite] = useState("");
  const [country, setCountry] = useState<any>(null);
  const [city, setCity] = useState<any>(null);
  return (
    <Modal title="New Brand" onClose={onClose} saveDisabled={!name.trim()}
      onSave={() => onSave({ name: name.trim(), instagram_handle: ig || null, website: website || null, country_id: country?.id || null, city_id: city?.id || null, slug: slugify(name) })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Instagram Handle"><input style={s.input} value={ig} onChange={e => setIg(e.target.value)} placeholder="@handle" /></F>
      <F label="Website"><input style={s.input} value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." /></F>
      <Typeahead label="Country" items={locations.filter((l: any) => l.location_type === "country")} value={country} onChange={setCountry} onClear={() => setCountry(null)} />
      <Typeahead label="City" items={locations.filter((l: any) => l.location_type === "city")} value={city} onChange={setCity} onClear={() => setCity(null)} />
    </Modal>
  );
}

function CreatePersonModal({ initialName, role, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [ig, setIg] = useState("");
  const [r, setR] = useState(role || "creative director");
  return (
    <Modal title="New Person" onClose={onClose} saveDisabled={!name.trim()}
      onSave={() => onSave({ name: name.trim(), primary_role: r, instagram_handle: ig || null, slug: slugify(name) })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Role">
        <select style={s.select} value={r} onChange={e => setR(e.target.value)}>
          <option value="creative director">Creative Director</option>
          <option value="photographer">Photographer</option>
          <option value="stylist">Stylist</option>
        </select>
      </F>
      <F label="Instagram Handle"><input style={s.input} value={ig} onChange={e => setIg(e.target.value)} placeholder="@handle" /></F>
    </Modal>
  );
}

function CreateEventModal({ initialName, locations, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [type, setType] = useState("fashion_week");
  const [loc, setLoc] = useState<any>(null);
  return (
    <Modal title="New Event" onClose={onClose} saveDisabled={!name.trim()}
      onSave={() => onSave({ name: name.trim(), event_type: type, location_id: loc?.id || null, slug: slugify(name) })}>
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
    </Modal>
  );
}

function CreateLocationModal({ initialName, type, locations, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [code, setCode] = useState("");
  const [parent, setParent] = useState<any>(null);
  const isCity = type === "city";
  return (
    <Modal title={`New ${isCity ? "City" : "Country"}`} onClose={onClose}
      saveDisabled={!name.trim() || (isCity && !parent)}
      onSave={() => onSave({ name: name.trim(), location_type: type, slug: slugify(name), country_code: isCity ? null : (code || null), parent_location_id: isCity ? parent?.id : null })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      {isCity
        ? <Typeahead label="Country *" items={locations.filter((l: any) => l.location_type === "country")} value={parent} onChange={setParent} onClear={() => setParent(null)} />
        : <F label="ISO Code"><input style={s.input} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. NG" maxLength={2} /></F>
      }
    </Modal>
  );
}

function CreatePlatformModal({ initialName, onSave, onClose }: any) {
  const [name, setName] = useState(initialName || "");
  const [url, setUrl] = useState("");
  return (
    <Modal title="New Platform" onClose={onClose} saveDisabled={!name.trim()}
      onSave={() => onSave({ name: name.trim(), base_url: url || null, slug: slugify(name) })}>
      <F label="Name *"><input style={s.input} value={name} onChange={e => setName(e.target.value)} autoFocus /></F>
      <F label="Base URL"><input style={s.input} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." /></F>
    </Modal>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const INSTAGRAM_ID = "457b78e4-4758-455b-a72b-7ee79c41b46a";
const BRAND_WEBSITE_ID = "f003e6ff-7e20-459e-85c8-95d2bdc666c7";

export default function IntakePage() {
  const [platformId, setPlatformId] = useState(INSTAGRAM_ID);
  const [customPlatform, setCustomPlatform] = useState<any>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [cdnUrl, setCdnUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [isKeyLook, setIsKeyLook] = useState(false);

  const [brand, setBrand] = useState<any>(null);
  const [creditCD, setCreditCD] = useState<any>(null);
  const [creditPhotog, setCreditPhotog] = useState<any>(null);
  const [creditStylist, setCreditStylist] = useState<any>(null);
  const [courtesy, setCourtesy] = useState(false);

  const [event, setEvent] = useState<any>(null);
  const [scene, setScene] = useState("");
  const [seasonTerm, setSeasonTerm] = useState("");
  const [seasonYear, setSeasonYear] = useState("");
  const [gender, setGender] = useState("");
  const [publishDate, setPublishDate] = useState("");

  const [photoCity, setPhotoCity] = useState<any>(null);
  const [photoCountry, setPhotoCountry] = useState<any>(null);
  const [notes, setNotes] = useState("");

  const [brands, setBrands] = useState(BRANDS_SEED);
  const [people, setPeople] = useState(PEOPLE_SEED);
  const [events, setEvents] = useState(EVENTS_SEED);
  const [locations, setLocations] = useState(LOCATIONS_SEED);
  const [platforms, setPlatforms] = useState(PLATFORMS);

  const [modal, setModal] = useState<any>(null);
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successCount, setSuccessCount] = useState(0);

  // ── Load all entities from Supabase on mount ──────────────────────────────
  useEffect(() => {
    async function loadEntities() {
      try {
        const [b, p, e, l, pl] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/brands?select=id,name,slug&order=name`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/rest/v1/people?select=id,name,primary_role&order=name`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/rest/v1/events?select=id,name,event_type&order=name`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/rest/v1/locations?select=id,name,location_type,country_code&order=location_type,name`, { headers: H }).then(r => r.json()),
          fetch(`${SUPABASE_URL}/rest/v1/source_platforms?select=id,name,slug&order=name`, { headers: H }).then(r => r.json()),
        ]);
        if (Array.isArray(b) && b.length > 0) setBrands(b);
        if (Array.isArray(p) && p.length > 0) setPeople(p);
        if (Array.isArray(e) && e.length > 0) setEvents(e);
        if (Array.isArray(l) && l.length > 0) setLocations(l);
        if (Array.isArray(pl) && pl.length > 0) setPlatforms(pl);
      } catch (err) {
        console.error("Failed to load entities, using seed data:", err);
      }
    }
    loadEntities();
  }, []);

  const cities = locations.filter(l => l.location_type === "city");
  const countries = locations.filter(l => l.location_type === "country");
  const otherPlatforms = platforms.filter(p => p.id !== INSTAGRAM_ID && p.id !== BRAND_WEBSITE_ID);

  // ── Entity creation helpers ───────────────────────────────────────────────
  async function post(path: string, data: any) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: "POST",
      headers: { ...H, "Prefer": "return=representation" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    return (await res.json())[0];
  }

  async function selectBrand(b: any) {
    setBrand(b);
    if (b?.id && !b.id.startsWith("local-")) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/brands?id=eq.${b.id}&select=creative_director_id,people:creative_director_id(id,name,primary_role)`,
          { headers: H }
        );
        const rows = await res.json();
        const person = rows?.[0]?.people;
        if (person && !creditCD) setCreditCD({ ...person, credit_role: "creative director" });
      } catch { /* skip */ }
    }
  }

  async function handleCreateBrand(data: any) {
    let c; try { c = await post("brands", data); } catch { c = { ...data, id: `local-${Date.now()}` }; }
    setBrands(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    await selectBrand(c); setModal(null);
  }
  async function handleCreatePerson(data: any) {
    let c; try { c = await post("people", data); } catch { c = { ...data, id: `local-${Date.now()}` }; }
    setPeople(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    const role = modal?.role;
    if (role === "creative director") setCreditCD({ ...c, credit_role: "creative director" });
    else if (role === "photographer") setCreditPhotog({ ...c, credit_role: "photographer" });
    else setCreditStylist({ ...c, credit_role: "stylist" });
    setModal(null);
  }
  async function handleCreateEvent(data: any) {
    let c; try { c = await post("events", data); } catch { c = { ...data, id: `local-${Date.now()}` }; }
    setEvents(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setEvent(c); setModal(null);
  }
  async function handleCreateLocation(data: any) {
    let c; try { c = await post("locations", data); } catch { c = { ...data, id: `local-${Date.now()}` }; }
    setLocations(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    if (data.location_type === "city") setPhotoCity(c); else setPhotoCountry(c);
    setModal(null);
  }
  async function handleCreatePlatform(data: any) {
    let c; try { c = await post("source_platforms", data); } catch { c = { ...data, id: `local-${Date.now()}` }; }
    setPlatforms(p => [...p, c].sort((a: any, b: any) => a.name.localeCompare(b.name)));
    setCustomPlatform(c); setPlatformId(""); setModal(null);
  }

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!cdnUrl.trim()) { setStatus("error"); setErrorMsg("CDN image URL is required."); return; }
    setStatus("submitting"); setErrorMsg("");

    const pid = customPlatform?.id?.startsWith("local-") ? null : (customPlatform?.id || platformId);
    const look = {
      source_url: sourceUrl.trim() || null,
      source_cdn_url: cdnUrl.trim(),
      source_name: sourceName.trim() || null,
      source_platform_id: pid,
      brand_id: brand?.id?.startsWith("local-") ? null : (brand?.id || null),
      courtesy_brand_id: courtesy ? (brand?.id?.startsWith("local-") ? null : brand?.id || null) : null,
      event_id: event?.id?.startsWith("local-") ? null : (event?.id || null),
      scene: scene || "other",
      season_term: seasonTerm || null,
      season_year: seasonYear ? parseInt(seasonYear) : null,
      gender: gender || null,
      date_published: publishDate || null,
      photo_city_id: photoCity?.id?.startsWith("local-") ? null : (photoCity?.id || null),
      photo_country_id: photoCountry?.id?.startsWith("local-") ? null : (photoCountry?.id || null),
      is_key_look: isKeyLook,
      status: "draft",
      notes: notes.trim() || null,
    };

    try {
      // Insert look
      const res = await fetch(`${SUPABASE_URL}/rest/v1/looks`, {
        method: "POST",
        headers: { ...H, "Prefer": "return=representation" },
        body: JSON.stringify(look),
      });
      if (!res.ok) throw new Error(await res.text());
      const lookId = (await res.json())[0]?.id;

      // Insert credits
      const credits = [
        creditCD && { look_id: lookId, person_id: creditCD.id?.startsWith("local-") ? null : creditCD.id, role: "creative director" },
        !courtesy && creditPhotog && { look_id: lookId, person_id: creditPhotog.id?.startsWith("local-") ? null : creditPhotog.id, role: "photographer" },
        creditStylist && { look_id: lookId, person_id: creditStylist.id?.startsWith("local-") ? null : creditStylist.id, role: "stylist" },
      ].filter((c: any) => c && c.person_id);

      if (credits.length > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/look_credits`, {
          method: "POST",
          headers: { ...H, "Prefer": "return=representation" },
          body: JSON.stringify(credits),
        });
      }

      setStatus("success");
      setSuccessCount(c => c + 1);
      resetForm();
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(e.message || "Submission failed.");
    }
  }

  function resetForm() {
    setSourceUrl(""); setCdnUrl(""); setSourceName(""); setIsKeyLook(false);
    setBrand(null); setCreditCD(null); setCreditPhotog(null); setCreditStylist(null); setCourtesy(false);
    setEvent(null); setScene(""); setSeasonTerm(""); setSeasonYear(""); setGender(""); setPublishDate("");
    setPhotoCity(null); setPhotoCountry(null); setNotes("");
    setPlatformId(INSTAGRAM_ID); setCustomPlatform(null);
    setTimeout(() => setStatus("idle"), 3000);
  }

  const cdnErr = status === "error" && !cdnUrl.trim();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: Inter, sans-serif; }
        input::placeholder, textarea::placeholder { color: #888; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
      `}</style>

      <div style={{ minHeight: "calc(100vh - 44px)", backgroundColor: C.bg, color: C.text, fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.6 }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 24px 100px" }}>

          {/* SOURCE */}
          <Card title="Source">
            <F label="Platform">
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button style={{ ...s.tog, ...(platformId === INSTAGRAM_ID && !customPlatform ? s.togOn : {}) }}
                  onClick={() => { setPlatformId(INSTAGRAM_ID); setCustomPlatform(null); }}>Instagram</button>
                <button style={{ ...s.tog, ...(platformId === BRAND_WEBSITE_ID && !customPlatform ? s.togOn : {}) }}
                  onClick={() => { setPlatformId(BRAND_WEBSITE_ID); setCustomPlatform(null); }}>Brand Website</button>
                {customPlatform ? (
                  <div style={s.chip}>
                    <span style={{ fontWeight: 500, color: C.text }}>{customPlatform.name}</span>
                    <button style={s.chipX} onClick={() => { setCustomPlatform(null); setPlatformId(INSTAGRAM_ID); }}>×</button>
                  </div>
                ) : (
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Typeahead items={otherPlatforms} value={null}
                      onChange={(p: any) => { setCustomPlatform(p); setPlatformId(""); }}
                      onClear={() => { }} placeholder="Other platform..."
                      onCreateClick={(name: string) => setModal({ type: "platform", name })} />
                  </div>
                )}
              </div>
            </F>
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
              <F label="Source Account">
                <input style={s.input} value={sourceName} onChange={e => setSourceName(e.target.value)} placeholder="@account_handle" />
              </F>
              <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
                <label style={s.ckLabel}>
                  <input type="checkbox" checked={isKeyLook} onChange={e => setIsKeyLook(e.target.checked)} style={s.ck} />
                  Key Look
                </label>
              </div>
            </div>
          </Card>

          {/* ATTRIBUTION */}
          <Card title="Attribution">
            <Typeahead label="Brand" items={brands} value={brand}
              onChange={selectBrand} onClear={() => { setBrand(null); setCreditCD(null); setCourtesy(false); }}
              onCreateClick={(name: string) => setModal({ type: "brand", name })} />
            <Typeahead label="Creative Director" items={people.filter((p: any) => p.primary_role === "creative director")}
              value={creditCD} onChange={(p: any) => setCreditCD({ ...p, credit_role: "creative director" })}
              onClear={() => setCreditCD(null)}
              onCreateClick={(name: string) => setModal({ type: "person", name, role: "creative director" })} />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ ...s.ckLabel, ...(brand ? {} : { color: C.dim, cursor: "default" }) }}>
                <input type="checkbox" checked={courtesy} disabled={!brand} style={s.ck}
                  onChange={e => { setCourtesy(e.target.checked); if (e.target.checked) setCreditPhotog(null); }} />
                Courtesy of brand
              </label>
              {!brand && <span style={{ fontSize: 12, color: C.dim, fontStyle: "italic" }}>select a brand first</span>}
            </div>
            {!courtesy && (
              <Typeahead label="Photographer" items={people.filter((p: any) => p.primary_role === "photographer")}
                value={creditPhotog} onChange={(p: any) => setCreditPhotog({ ...p, credit_role: "photographer" })}
                onClear={() => setCreditPhotog(null)}
                onCreateClick={(name: string) => setModal({ type: "person", name, role: "photographer" })} />
            )}
            <Typeahead label="Stylist" items={people.filter((p: any) => p.primary_role === "stylist")}
              value={creditStylist} onChange={(p: any) => setCreditStylist({ ...p, credit_role: "stylist" })}
              onClear={() => setCreditStylist(null)}
              onCreateClick={(name: string) => setModal({ type: "person", name, role: "stylist" })} />
          </Card>

          {/* CONTEXT */}
          <Card title="Context">
            <Typeahead label="Event" items={events} value={event}
              onChange={setEvent} onClear={() => setEvent(null)}
              onCreateClick={(name: string) => setModal({ type: "event", name })} />
            <div style={s.row2}>
              <F label="Scene">
                <select style={s.select} value={scene} onChange={e => setScene(e.target.value)}>
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

          {/* LOCATION */}
          <Card title="Photo Location">
            <div style={s.row2}>
              <Typeahead label="City" items={cities} value={photoCity}
                onChange={setPhotoCity} onClear={() => setPhotoCity(null)}
                onCreateClick={(name: string) => setModal({ type: "city", name })} />
              <Typeahead label="Country" items={countries} value={photoCountry}
                onChange={setPhotoCountry} onClear={() => setPhotoCountry(null)}
                onCreateClick={(name: string) => setModal({ type: "country", name })} />
            </div>
          </Card>

          {/* NOTES */}
          <Card title="Notes">
            <textarea style={s.ta} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. confirm season, find photographer credit..." rows={2} />
          </Card>

          {/* Submit */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14, paddingTop: 4 }}>
            {errorMsg && <span style={{ fontSize: 13, color: C.red }}>{errorMsg}</span>}
            {status === "success" && <span style={{ fontSize: 13, color: C.green }}>✓ Ingested — Cloudinary processing</span>}
            {successCount > 0 && <span style={{ fontSize: 13, color: C.muted }}>{successCount} ingested</span>}
            <button
              style={{ height: 44, padding: "0 28px", backgroundColor: C.white, color: "#212121", border: "none", borderRadius: 22, fontSize: 15, fontWeight: 600, cursor: "pointer", fontFamily: "Inter,sans-serif", opacity: status === "submitting" ? 0.4 : 1 }}
              onClick={handleSubmit} disabled={status === "submitting"}>
              {status === "submitting" ? "Ingesting..." : "Ingest Look →"}
            </button>
          </div>
        </div>

        {/* Modals */}
        {modal?.type === "brand" && <CreateBrandModal initialName={modal.name} locations={locations} onSave={handleCreateBrand} onClose={() => setModal(null)} />}
        {modal?.type === "person" && <CreatePersonModal initialName={modal.name} role={modal.role} onSave={handleCreatePerson} onClose={() => setModal(null)} />}
        {modal?.type === "event" && <CreateEventModal initialName={modal.name} locations={locations} onSave={handleCreateEvent} onClose={() => setModal(null)} />}
        {modal?.type === "city" && <CreateLocationModal initialName={modal.name} type="city" locations={locations} onSave={handleCreateLocation} onClose={() => setModal(null)} />}
        {modal?.type === "country" && <CreateLocationModal initialName={modal.name} type="country" locations={locations} onSave={handleCreateLocation} onClose={() => setModal(null)} />}
        {modal?.type === "platform" && <CreatePlatformModal initialName={modal.name} onSave={handleCreatePlatform} onClose={() => setModal(null)} />}
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, any> = {
  field: { display: "flex", flexDirection: "column", gap: 5, position: "relative" },
  label: { fontSize: 13, fontWeight: 600, color: C.text },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },

  input: {
    height: 42, padding: "0 16px",
    border: "1px solid #505050", borderRadius: 12,
    backgroundColor: "#484848", color: C.text,
    fontSize: 14, fontFamily: "Inter,sans-serif",
    outline: "none", width: "100%",
  },
  select: {
    height: 42, padding: "0 16px",
    border: "1px solid #505050", borderRadius: 12,
    backgroundColor: "#484848", color: C.text,
    fontSize: 14, fontFamily: "Inter,sans-serif",
    outline: "none", width: "100%", cursor: "pointer",
  },
  ta: {
    padding: "12px 16px", border: "1px solid #505050", borderRadius: 12,
    backgroundColor: "#484848", color: C.text,
    fontSize: 14, fontFamily: "Inter,sans-serif",
    outline: "none", width: "100%", resize: "vertical", lineHeight: 1.5,
  },

  tog: {
    height: 38, padding: "0 18px", border: "none",
    borderRadius: 20, backgroundColor: C.lift2,
    color: C.muted, fontSize: 14, fontFamily: "Inter,sans-serif",
    cursor: "pointer", whiteSpace: "nowrap", fontWeight: 500,
    transition: "all 0.12s",
  },
  togOn: { backgroundColor: C.white, color: "#212121", fontWeight: 600 },

  chip: {
    display: "inline-flex", alignItems: "center", gap: 8,
    height: 42, padding: "0 16px",
    backgroundColor: "#484848", borderRadius: 12,
    fontSize: 14, border: "1px solid #606060",
  },
  chipX: {
    background: "none", border: "none", color: C.muted,
    fontSize: 20, cursor: "pointer", padding: 0, lineHeight: 1,
  },

  ckLabel: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14, color: C.text, userSelect: "none" },
  ck: { width: 15, height: 15, cursor: "pointer", accentColor: C.white },

  dd: {
    position: "absolute", top: "100%", left: 0, right: 0,
    backgroundColor: C.lift2, borderRadius: 12,
    zIndex: 300, marginTop: 4,
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    maxHeight: 240, overflowY: "auto",
  },
  ddRow: {
    padding: "10px 16px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "space-between",
    fontSize: 14, color: C.text,
    borderBottom: `1px solid ${C.lift1}`,
  },
  ddCreate: { padding: "10px 16px", cursor: "pointer", fontSize: 14, color: C.muted, fontWeight: 500 },
  pill: { fontSize: 11, color: C.muted, backgroundColor: C.lift1, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" },

  overlay: {
    position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)",
    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
  },
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
