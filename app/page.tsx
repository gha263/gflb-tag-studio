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
  "garment types","silouhettes","length",
  "color","color intensity","color complexity","color palette",
  "materials","patterns","pattern-scale","surface texture",
  "techniques","construction",
];

const TYPE_LABELS: {[key: string]: string} = {
  "garment types":"Garment","silouhettes":"Silhouette","length":"Length",
  "color":"Color","color intensity":"Intensity","color complexity":"Complexity","color palette":"Palette",
  "materials":"Material","patterns":"Pattern","pattern-scale":"Scale",
  "surface texture":"Texture","techniques":"Technique","construction":"Construction",
};

const EXCLUDED = ["brand","season","event"];

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
  const [idx, setIdx] = useState(0);
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(false);
  const [loading, setLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState("all");
  const [filtered, setFiltered] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("");
  const [adding, setAdding] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [notes, setNotes] = useState("");
  const [editingNotes, setEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const f = brandFilter === "all" ? looks : looks.filter(l => l.brand_id === brandFilter);
    setFiltered(f); setIdx(0);
  }, [brandFilter, looks]);

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
      const [l, b, t] = await Promise.all([
        sb("looks?select=id,cloudinary_url,caption,brand_id,season_display,source_url,notes&order=brand_id,created_at"),
        sb("brands?select=id,name&order=name"),
        sb("tags?select=*&order=tag_type,name"),
      ]);
      const brandMap: Record<string,string> = {};
      b.forEach((br: any) => { brandMap[br.id] = br.name; });
      const looksWithBrand = l.map((look: any) => ({ ...look, brands: { name: brandMap[look.brand_id] || "" } }));
      const usable = t.filter((t: any) => !EXCLUDED.includes(t.tag_type));
      const grouped = usable.reduce((acc: Record<string,any[]>, tag: any) => {
        if (!acc[tag.tag_type]) acc[tag.tag_type] = [];
        acc[tag.tag_type].push(tag);
        return acc;
      }, {});
      setLooks(looksWithBrand); setFiltered(looksWithBrand); setBrands(b); setTagsByType(grouped);
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const loadTags = async (lookId: string) => {
    const data = await sb(`look_tags?look_id=eq.${lookId}&source=eq.human&select=tag_id`);
    setActiveTags(new Set(data.map((t: any) => t.tag_id)));
  };

  const toggleTag = async (tagId: string) => {
    const look = filtered[idx];
    if (!look) return;
    setSaving(true);
    const next = new Set(activeTags);
    try {
      if (next.has(tagId)) {
        next.delete(tagId);
        await sb(`look_tags?look_id=eq.${look.id}&tag_id=eq.${tagId}&source=eq.human`, { method:"DELETE", prefer:"" });
      } else {
        next.add(tagId);
        await sb("look_tags", { method:"POST", body: JSON.stringify({ look_id:look.id, tag_id:tagId, source:"human", model:null }), prefer:"resolution=merge-duplicates" });
      }
      setActiveTags(next);
    } catch(e) { console.error(e); }
    setSaving(false); setFlash(true); setTimeout(() => setFlash(false), 900);
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
            onChange={e => setBrandFilter(e.target.value)}
            style={{background:"#484848",border:"1px solid #606060",color:C.text,padding:"7px 12px",fontSize:13,borderRadius:20,outline:"none",cursor:"pointer",fontFamily:"Inter,sans-serif",fontWeight:500}}>
            <option value="all">All Brands</option>
            {brands.map((b:any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* Save indicator */}
          <span style={{fontSize:12,color:flash&&!saving?C.green:C.muted,opacity:saving||flash?1:0,transition:"opacity 0.3s",minWidth:60,textAlign:"right",fontWeight:500}}>
            {saving ? "saving…" : "saved ✓"}
          </span>
        </div>

        {/* ── Body ── */}
        <div style={{display:"flex",flex:1,overflow:"hidden"}}>

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
                    return (
                      <button
                        key={tag.id}
                        className={`tag-btn${on?" on":""}`}
                        onClick={() => toggleTag(tag.id)}
                        title={tag.definition || undefined}
                        style={{
                          background: on ? C.white : C.lift1,
                          border: "none",
                          color: on ? "#212121" : C.text,
                          padding:"6px 14px",
                          fontSize:13,
                          fontWeight: on ? 600 : 400,
                          cursor:"pointer",
                          borderRadius:20,
                          fontFamily:"Inter,sans-serif",
                          transition:"all 0.1s",
                          textDecoration: tag.definition ? "underline dotted" : "none",
                          textUnderlineOffset: 3,
                        }}>
                        {tag.name}{on ? " ✓" : ""}
                      </button>
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
                    <option value="cultural">Cultural</option>
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
      </div>
    </>
  );
}
