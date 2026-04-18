"use client";

import { useState, useEffect, useCallback } from "react";

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

const TAG_TYPE_ORDER = [
  "color",
  "form",
  "craft",
  "pattern",
  "design_language",
  "mood",
  "garment_types",
];

const TYPE_LABELS: {[key: string]: string} = {
  "color":           "Color",
  "form":            "Form",
  "craft":           "Craft",
  "pattern":         "Pattern",
  "design_language": "Design Language",
  "mood":            "Mood",
  "garment_types":   "Garment",
};

const EXCLUDED = ["brand","season","event","brand_category","brand_production","event_format"];

// ── ChatGPT palette ────────────────────────────────────────────────────────────
const C = {
  bg:      "#212121",
  lift1:   "#2f2f2f",   // first level surface
  lift2:   "#3a3a3a",   // second level — inputs, buttons
  lift3:   "#424242",   // hover states
  text:    "#ececec",
  muted:   "#8e8ea0",
  dim:     "#555",
  white:   "#fff",
  green:   "#4caf6e",
  red:     "#e05a4e",
};

export default function TagStudio() {
  const [looks, setLooks] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [tagsByType, setTagsByType] = useState<Record<string,any[]>>({});
  const [idx, setIdx] = useState(() => { try { return parseInt(localStorage.getItem("ts_idx") || "0") || 0; } catch { return 0; } });
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [primaryTagId, setPrimaryTagId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState(() => { try { return localStorage.getItem("ts_brand") || "all"; } catch { return "all"; } });
  const [tagFilter, setTagFilter] = useState("all");
  const [lookTagsMap, setLookTagsMap] = useState<Record<string, string[]>>({});
  const [jumpInput, setJumpInput] = useState("");
  const [filtered, setFiltered] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Browse mode ──────────────────────────────────────────────────────────────
  const [browseMode, setBrowseMode] = useState(false);
  const [browseTagIds, setBrowseTagIds] = useState<Set<string>>(new Set());
  const [browseScrollPos, setBrowseScrollPos] = useState(0);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(["color"]));

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    let f = brandFilter === "all" ? looks : looks.filter(l => l.brand_id === brandFilter);
    if (tagFilter !== "all") f = f.filter(l => (lookTagsMap[l.id] || []).includes(tagFilter));
    setFiltered(f);
  }, [brandFilter, tagFilter, looks, lookTagsMap]);

  // Persist position
  useEffect(() => { try { localStorage.setItem("ts_idx", String(idx)); } catch {} }, [idx]);
  useEffect(() => { try { localStorage.setItem("ts_brand", brandFilter); } catch {} }, [brandFilter]);

  useEffect(() => {
    if (filtered[idx]) {
      loadTags(filtered[idx].id);
      setNotes(filtered[idx].notes || "");
      setEditingNotes(false);
      setImgLoaded(false);
    }
  }, [idx, filtered]);

  const next = useCallback(() => { if (idx < filtered.length - 1) setIdx(i => i + 1); }, [idx, filtered.length]);
  const prev = useCallback(() => { if (idx > 0) setIdx(i => i - 1); }, [idx]);

  const handleBrandFilter = (val: string) => { setBrandFilter(val); setIdx(0); };
  const handleTagFilter = (val: string) => { setTagFilter(val); setIdx(0); };

  const handleJump = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const n = parseInt(jumpInput) - 1;
    if (!isNaN(n) && n >= 0 && n < filtered.length) setIdx(n);
    setJumpInput("");
  };

  // ── Browse mode helpers ──────────────────────────────────────────────────────
  const toggleBrowseTag = (tagId: string) => {
    setBrowseTagIds(prev => {
      const next = new Set(prev);
      if (next.has(tagId)) next.delete(tagId); else next.add(tagId);
      return next;
    });
  };

  const toggleExpandedType = (type: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  // Count how many looks have each tag
  const tagCountMap = Object.fromEntries(
    Object.values(tagsByType).flat().map((tag: any) => [
      tag.id,
      Object.values(lookTagsMap).filter(ids => ids.includes(tag.id)).length
    ])
  );

  const browseLooks = browseTagIds.size === 0
    ? looks
    : looks.filter(l => {
        const lTags = lookTagsMap[l.id] || [];
        return Array.from(browseTagIds).every(tid => lTags.includes(tid));
      });

  const enterEditFromBrowse = (lookId: string) => {
    const grid = document.getElementById("browse-grid");
    if (grid) setBrowseScrollPos(grid.scrollTop);
    const i = filtered.findIndex(l => l.id === lookId);
    if (i >= 0) setIdx(i);
    else {
      // look might not be in current filter — find in full looks array
      const allIdx = looks.findIndex(l => l.id === lookId);
      if (allIdx >= 0) {
        handleBrandFilter("all");
        setIdx(allIdx);
      }
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
      if (e.key === "ArrowLeft"  || e.key === "h") prev();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [next, prev]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [l, b, t, et] = await Promise.all([
        sb("looks?select=id,cloudinary_url,caption,brand_id,season_display,source_url,notes&order=brand_id,created_at"),
        sb("brands?select=id,name&order=name"),
        sb("tags?select=*&order=tag_type,name"),
        sb("entity_tags?entity_type=eq.look&source=eq.human&select=entity_id,tag_id&limit=10000"),
      ]);
      const brandMap: Record<string,string> = {};
      b.forEach((br: any) => { brandMap[br.id] = br.name; });
      const looksWithBrand = l.map((look: any) => ({ ...look, brands: { name: brandMap[look.brand_id] || "" } }));
      // Build lookId → [tagIds] map
      const tagMap: Record<string, string[]> = {};
      et.forEach((row: any) => {
        if (!tagMap[row.entity_id]) tagMap[row.entity_id] = [];
        tagMap[row.entity_id].push(row.tag_id);
      });
      const usable = t.filter((t: any) => !EXCLUDED.includes(t.tag_type));
      const grouped = usable.reduce((acc: Record<string,any[]>, tag: any) => {
        if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
        acc[tag.tag_type].push(tag);
        return acc;
      }, {});
      setLooks(looksWithBrand); setFiltered(looksWithBrand); setBrands(b); setTagsByType(grouped); setLookTagsMap(tagMap);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const loadTags = async (lookId: string) => {
    const data = await sb(`entity_tags?entity_id=eq.${lookId}&entity_type=eq.look&source=eq.human&select=tag_id,is_primary`);
    setActiveTags(new Set(data.map((t: any) => t.tag_id)));
    const primary = data.find((t: any) => t.is_primary);
    setPrimaryTagId(primary?.tag_id || null);
  };

  const toggleTag = async (tagId: string) => {
    const look = filtered[idx];
    if (!look) return;
    setSaving(true);
    const next = new Set(activeTags);
    try {
      if (next.has(tagId)) {
        next.delete(tagId);
        if (primaryTagId === tagId) setPrimaryTagId(null);
        await sb(`entity_tags?entity_id=eq.${look.id}&tag_id=eq.${tagId}&entity_type=eq.look&source=eq.human`, { method:"DELETE", prefer:"" });
        setLookTagsMap(prev => ({ ...prev, [look.id]: (prev[look.id] || []).filter(id => id !== tagId) }));
      } else {
        next.add(tagId);
        await sb("entity_tags", { method:"POST", body: JSON.stringify({ entity_id:look.id, entity_type:"look", tag_id:tagId, source:"human", model:null }), prefer:"resolution=merge-duplicates" });
        setLookTagsMap(prev => ({ ...prev, [look.id]: [...(prev[look.id] || []), tagId] }));
      }
      setActiveTags(next);
    } catch(e) { console.error(e); }
    setSaving(false); setFlash(true); setTimeout(() => setFlash(false), 900);
  };

  const setPrimary = async (tagId: string) => {
    const look = filtered[idx];
    if (!look) return;
    setSaving(true);
    try {
      // Clear existing primary on this look
      await sb(`entity_tags?entity_id=eq.${look.id}&entity_type=eq.look&source=eq.human&is_primary=eq.true`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({ is_primary: false }),
      });
      // If clicking the already-primary tag, just clear it
      if (primaryTagId === tagId) {
        setPrimaryTagId(null);
      } else {
        // Set new primary
        await sb(`entity_tags?entity_id=eq.${look.id}&tag_id=eq.${tagId}&entity_type=eq.look&source=eq.human`, {
          method: "PATCH", prefer: "",
          body: JSON.stringify({ is_primary: true }),
        });
        setPrimaryTagId(tagId);
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
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');`}</style>
      <div style={{background:C.bg,height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif"}}>
        <span style={{fontSize:15,color:C.muted}}>Loading…</span>
      </div>
    </>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #4a4a4a; border-radius: 3px; }
        button:hover { filter: brightness(1.12); }
        a:hover { opacity: 1 !important; }
        .tag-btn:hover { background: #4a4a4a !important; }
        .tag-btn.on:hover { background: #e0e0e0 !important; }
        input::placeholder { color: #888 !important; }
        textarea::placeholder { color: #888 !important; }
      `}</style>

      <div style={{fontFamily:"Inter,sans-serif",background:C.bg,color:C.text,height:"calc(100vh - 44px)",display:"flex",flexDirection:"column",overflow:"hidden",fontSize:14,lineHeight:1.5}}>

        {/* ── Toolbar ── */}
        <div style={{display:"flex",alignItems:"center",padding:"8px 20px",background:C.bg,gap:16,flexShrink:0,borderBottom:`1px solid ${C.lift1}`}}>
          {/* Progress bar */}
          <div style={{flex:1,display:"flex",alignItems:"center",gap:10}}>
            <div style={{flex:1,height:3,background:C.lift2,borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:C.white,width:`${pct}%`,transition:"width 0.3s",borderRadius:2}}/>
            </div>
            <span style={{fontSize:13,color:C.muted,whiteSpace:"nowrap",fontWeight:500}}>{idx+1} / {filtered.length}</span>
          </div>

          {/* Brand filter */}
          <select
            value={brandFilter}
            onChange={e => handleBrandFilter(e.target.value)}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500}}>
            <option value="all">All Brands</option>
            {brands.map((b:any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Tag filter */}
          <select
            value={tagFilter}
            onChange={e => handleTagFilter(e.target.value)}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500}}>
            <option value="all">All Tags</option>
            {TAG_TYPE_ORDER.filter(type => tagsByType[type]).map(type => (
              <optgroup key={type} label={TYPE_LABELS[type] || type}>
                {(tagsByType[type] || []).map((tag: any) => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Jump to look */}
          <input
            value={jumpInput}
            onChange={e => setJumpInput(e.target.value)}
            onKeyDown={handleJump}
            placeholder="Go to #"
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",fontFamily:"Inter,sans-serif",width:80,textAlign:"center"}}
          />

          {/* Browse / Edit toggle */}
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

          {/* Save indicator */}
          <span style={{fontSize:12,color:flash&&!saving?C.green:C.muted,opacity:saving||flash?1:0,transition:"opacity 0.3s",minWidth:60,textAlign:"right",fontWeight:500}}>
            {saving ? "saving…" : "saved ✓"}
          </span>
        </div>

        {/* ── Browse Mode ── */}
        {browseMode && (
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>

            {/* Left sidebar — tag filters */}
            <div style={{width:220,flexShrink:0,borderRight:`1px solid ${C.lift1}`,overflowY:"auto",padding:"16px 12px",display:"flex",flexDirection:"column",gap:16}}>

              {/* Clear filters */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:C.muted}}>
                  Filter
                </span>
                {browseTagIds.size > 0 && (
                  <button onClick={() => setBrowseTagIds(new Set())}
                    style={{background:"transparent",border:"none",color:C.muted,fontSize:12,cursor:"pointer",padding:0,fontFamily:"Inter,sans-serif"}}>
                    Clear {browseTagIds.size}
                  </button>
                )}
              </div>

              {/* Match count */}
              <div style={{fontSize:13,color:C.text,fontWeight:500}}>
                <span style={{color:C.white,fontWeight:700}}>{browseLooks.length}</span>
                <span style={{color:C.muted}}> looks</span>
              </div>

              {/* Tag categories with checkboxes */}
              {TAG_TYPE_ORDER.filter(type => tagsByType[type]).map(type => {
                const tagsWithLooks = (tagsByType[type] || []).filter((tag: any) => (tagCountMap[tag.id] || 0) > 0);
                if (tagsWithLooks.length === 0) return null;
                const isExpanded = expandedTypes.has(type);
                return (
                  <div key={type}>
                    <button
                      onClick={() => toggleExpandedType(type)}
                      style={{display:"flex",alignItems:"center",justifyContent:"space-between",width:"100%",background:"transparent",border:"none",cursor:"pointer",padding:"0 0 6px 0",marginBottom:6,borderBottom:`1px solid ${C.lift1}`}}>
                      <span style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#b0aec0"}}>
                        {TYPE_LABELS[type] || type}
                      </span>
                      <span style={{fontSize:10,color:C.dim}}>{isExpanded ? "▲" : "▼"}</span>
                    </button>
                    {isExpanded && (
                      <div style={{display:"flex",flexDirection:"column",gap:2}}>
                        {tagsWithLooks.map((tag: any) => {
                          const checked = browseTagIds.has(tag.id);
                          const tagCount = tagCountMap[tag.id] || 0;
                          return (
                            <label key={tag.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"3px 4px",borderRadius:6,background:checked?C.lift2:"transparent"}}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleBrowseTag(tag.id)}
                                style={{accentColor:C.white,width:13,height:13,cursor:"pointer"}}
                              />
                              <span style={{fontSize:13,color:checked?C.text:C.muted,flex:1}}>{tag.name}</span>
                              <span style={{fontSize:11,color:C.dim}}>{tagCount}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right — look grid */}
            <div id="browse-grid" style={{flex:1,overflowY:"auto",padding:16}}>
              {browseLooks.length === 0 ? (
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:C.dim,fontSize:14}}>
                  No looks match the selected tags
                </div>
              ) : (
                <div style={{display:"grid",gridTemplateColumns:"repeat(2, 1fr)",gap:16}}>
                  {browseLooks.map((l: any) => {
                    const lTags = lookTagsMap[l.id] || [];
                    const primaryColorTag = lTags.map(tid => 
                      Object.values(tagsByType).flat().find((t:any) => t.id === tid && t.tag_type === "color")
                    ).find(Boolean) as any;
                    return (
                      <div key={l.id}
                        onClick={() => enterEditFromBrowse(l.id)}
                        style={{cursor:"pointer",borderRadius:10,overflow:"hidden",background:C.lift1,transition:"transform 0.1s",position:"relative"}}
                        onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.02)")}
                        onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}>
                        {/* Image — tall aspect ratio to show the looks properly */}
                        <div style={{paddingTop:"133%",position:"relative",background:"#181818"}}>
                          <img
                            src={l.cloudinary_url}
                            alt=""
                            loading="lazy"
                            style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}}
                          />
                        </div>
                        {/* Footer */}
                        <div style={{padding:"8px 10px",display:"flex",flexDirection:"column",gap:2}}>
                          <span style={{fontSize:12,fontWeight:600,color:C.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                            {l.brands?.name || "—"}
                          </span>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                            <span style={{fontSize:11,color:C.muted}}>{l.season_display || ""}</span>
                            <span style={{fontSize:11,color:lTags.length > 0 ? C.green : C.dim}}>
                              {lTags.length} tags
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Edit Mode ── */}
        {!browseMode && (
          <div style={{display:"flex",flex:1,overflow:"hidden"}}>

            {/* Back to browse button */}
            <div style={{position:"absolute",top:52,left:8,zIndex:10}}>
              <button onClick={returnToBrowse}
                style={{background:C.lift2,border:"none",color:C.muted,padding:"5px 12px",fontSize:12,cursor:"pointer",borderRadius:20,fontFamily:"Inter,sans-serif",display:"flex",alignItems:"center",gap:6}}>
                ← Browse
              </button>
            </div>

          {/* Left — image 50% */}
          <div style={{width:"50%",flexShrink:0,display:"flex",flexDirection:"column",overflow:"hidden",borderRight:`1px solid ${C.lift1}`}}>
            {look ? (
              <>
                {/* Image */}
                <div style={{flex:1,minHeight:0,background:"#181818",position:"relative",overflow:"hidden"}}>
                  {!imgLoaded && <div style={{position:"absolute",inset:0,background:"#181818"}}/>}
                  <img
                    key={look.cloudinary_url}
                    src={look.cloudinary_url}
                    alt=""
                    onLoad={() => setImgLoaded(true)}
                    style={{width:"100%",height:"100%",objectFit:"contain",display:"block",opacity:imgLoaded?1:0,transition:"opacity 0.4s"}}
                  />
                </div>

                {/* Meta panel below image — fixed height so Prev/Next always visible */}
                <div style={{flexShrink:0,background:C.lift1,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>

                  {/* Brand / season / source / tag count */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{display:"flex",alignItems:"baseline",gap:8}}>
                      <span style={{fontSize:15,fontWeight:600,color:C.text}}>{look.brands?.name || "—"}</span>
                      {look.season_display && <span style={{fontSize:12,color:C.muted}}>{look.season_display}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      {look.source_url && (
                        <a href={look.source_url} target="_blank" rel="noreferrer"
                          style={{fontSize:12,color:C.text,textDecoration:"none",background:C.lift2,padding:"5px 12px",borderRadius:20,fontWeight:500}}>
                          ↗ source
                        </a>
                      )}
                      <span style={{fontSize:13,color:C.muted,fontWeight:500}}>
                        <span style={{color:C.text,fontWeight:600}}>{activeTags.size}</span> tags
                      </span>
                    </div>
                  </div>

                  {/* Notes — fixed max height, scrollable if long */}
                  {!editingNotes ? (
                    <div
                      onClick={() => setEditingNotes(true)}
                      style={{
                        fontSize:14,color:notes?C.text:C.dim,
                        background:C.lift2,borderRadius:10,
                        padding:"8px 12px",cursor:"pointer",
                        lineHeight:1.5,fontStyle:notes?"normal":"italic",
                        maxHeight:72,overflowY:"auto",
                      }}>
                      {notes || "Add notes…"}
                    </div>
                  ) : (
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        autoFocus rows={2}
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

                  {/* Prev / Next — always visible */}
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

          {/* Right — tags scrollable */}
          <div style={{flex:1,overflowY:"auto",padding:"20px 24px",display:"flex",flexDirection:"column",gap:20,background:C.bg}}>
            {orderedTypes.map(type => (
              <div key={type}>
                <div style={{fontSize:11,fontWeight:600,letterSpacing:"0.08em",textTransform:"uppercase",color:"#b0aec0",paddingBottom:8,marginBottom:8,borderBottom:`1px solid ${C.lift1}`}}>
                  {TYPE_LABELS[type]||type}
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(tagsByType[type]||[]).map(tag => {
                    const on = activeTags.has(tag.id);
                    const isColor = type === "color";
                    const isPrimary = primaryTagId === tag.id;
                    return (
                      <div key={tag.id} style={{ display: "inline-flex", alignItems: "center", gap: 0 }}>
                        {isColor && on && (
                          <button
                            onClick={e => { e.stopPropagation(); setPrimary(tag.id); }}
                            title={isPrimary ? "Primary color — click to clear" : "Set as primary color"}
                            style={{
                              background: isPrimary ? "#f0a500" : C.lift2,
                              border: "none",
                              color: isPrimary ? "#212121" : C.muted,
                              padding: "6px 8px 6px 10px",
                              fontSize: 12,
                              cursor: "pointer",
                              borderRadius: "20px 0 0 20px",
                              fontFamily: "Inter,sans-serif",
                              lineHeight: 1,
                              transition: "all 0.1s",
                            }}>
                            {isPrimary ? "★" : "☆"}
                          </button>
                        )}
                        <button
                          className={`tag-btn${on?" on":""}`}
                          onClick={() => toggleTag(tag.id)}
                          title={tag.definition || undefined}
                          style={{
                            background: on ? C.white : C.lift1,
                            border: "none",
                            color: on ? "#212121" : C.text,
                            padding: "6px 14px",
                            fontSize: 13,
                            fontWeight: on ? 600 : 400,
                            cursor: "pointer",
                            borderRadius: isColor && on ? "0 20px 20px 0" : 20,
                            fontFamily: "Inter,sans-serif",
                            transition: "all 0.1s",
                            textDecoration: tag.definition ? "underline dotted" : "none",
                            textUnderlineOffset: 3,
                          }}>
                          {tag.name}{on && !isColor ? " ✓" : ""}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Add tag */}
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
        )}
      </div>
    </>
  );
}
