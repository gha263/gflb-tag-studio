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

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    const f = brandFilter === "all" ? looks : looks.filter(l => l.brand_id === brandFilter);
    setFiltered(f); setIdx(0);
  }, [brandFilter, looks]);
  useEffect(() => {
    if (filtered[idx]) { loadTags(filtered[idx].id); setImgLoaded(false); }
  }, [idx, filtered]);

  const next = useCallback(() => { if (idx < filtered.length - 1) setIdx(i => i+1); }, [idx, filtered.length]);
  const prev = useCallback(() => { if (idx > 0) setIdx(i => i-1); }, [idx]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (["INPUT","SELECT","TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === "ArrowRight" || e.key === "l") next();
      if (e.key === "ArrowLeft" || e.key === "h") prev();
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [next, prev]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [l, b, t] = await Promise.all([
        sb("looks?select=id,cloudinary_url,caption,brand_id,season_display&order=brand_id,created_at"),
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
  const pct = filtered.length > 0 ? ((idx+1)/filtered.length)*100 : 0;
  const orderedTypes = [...TAG_TYPE_ORDER.filter(t => tagsByType[t]), ...Object.keys(tagsByType).filter(t => !TAG_TYPE_ORDER.includes(t))];

  if (loading) return (
    <div style={{background:"#0e0e0e",height:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20,fontFamily:"Georgia,serif"}}>
      <div style={{fontSize:18,letterSpacing:"0.2em",color:"#c9a84c"}}>GFLB</div>
      <div style={{width:80,height:1,background:"#c9a84c",opacity:0.4}}/>
    </div>
  );

  return (
    <div style={{fontFamily:"Georgia,serif",background:"#0e0e0e",color:"#e8e4dc",height:"100vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",padding:"13px 24px",borderBottom:"1px solid #2a2a2a",gap:16,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8,minWidth:130}}>
          <span style={{fontSize:13,letterSpacing:"0.2em",color:"#c9a84c",fontWeight:700}}>GFLB</span>
          <span style={{fontSize:10,letterSpacing:"0.15em",color:"#666",textTransform:"uppercase"}}>Tag Studio</span>
        </div>
        <div style={{flex:1,display:"flex",alignItems:"center",gap:12}}>
          <div style={{flex:1,height:2,background:"#2a2a2a",borderRadius:1}}>
            <div style={{height:"100%",background:"#c9a84c",width:`${pct}%`,transition:"width 0.3s",borderRadius:1}}/>
          </div>
          <span style={{fontSize:12,color:"#888",whiteSpace:"nowrap"}}>{idx+1} / {filtered.length}</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{background:"#1a1a1a",border:"1px solid #333",color:"#ccc",padding:"5px 8px",fontSize:12,borderRadius:2,outline:"none",cursor:"pointer"}}>
            <option value="all">All Brands</option>
            {brands.map((b:any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <span style={{fontSize:11,letterSpacing:"0.08em",minWidth:52,textAlign:"right",transition:"all 0.3s",opacity:saving||flash?1:0,color:flash&&!saving?"#c9a84c":"#888"}}>
            {saving?"saving…":"saved ✓"}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* Image */}
        <div style={{width:480,flexShrink:0,borderRight:"1px solid #2a2a2a",display:"flex",flexDirection:"column",padding:"12px 14px",gap:8,overflow:"hidden"}}>
          {look ? <>
            <div style={{flex:1,minHeight:0,background:"#1a1a1a",borderRadius:2,overflow:"hidden",position:"relative"}}>
              {!imgLoaded && <div style={{position:"absolute",inset:0,background:"#1a1a1a"}}/>}
              <img key={look.cloudinary_url} src={look.cloudinary_url} alt="" onLoad={()=>setImgLoaded(true)}
                style={{width:"100%",height:"100%",objectFit:"contain",display:"block",opacity:imgLoaded?1:0,transition:"opacity 0.3s"}}/>
            </div>
            <div style={{flexShrink:0,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <span style={{fontSize:12,letterSpacing:"0.1em",color:"#e8e4dc",textTransform:"uppercase",fontWeight:700}}>{look.brands?.name}</span>
                {look.season_display && <span style={{fontSize:11,color:"#888",marginLeft:10}}>{look.season_display}</span>}
              </div>
              <div><span style={{fontSize:16,color:"#c9a84c"}}>{activeTags.size}</span><span style={{fontSize:11,color:"#666"}}> tags</span></div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <button onClick={prev} style={{background:"none",border:"1px solid #333",color:"#aaa",padding:"6px 14px",fontSize:12,cursor:"pointer",borderRadius:2,letterSpacing:"0.06em",opacity:idx===0?0.2:1}}>← Prev</button>
              <span style={{fontSize:10,color:"#555",letterSpacing:"0.05em"}}>arrow keys</span>
              <button onClick={next} style={{background:"none",border:"1px solid #333",color:"#aaa",padding:"6px 14px",fontSize:12,cursor:"pointer",borderRadius:2,letterSpacing:"0.06em",opacity:idx===filtered.length-1?0.2:1}}>Next →</button>
            </div>
          </> : <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:"#555",fontSize:12,letterSpacing:"0.1em"}}>No looks</div>}
        </div>

        {/* Tags */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 26px",display:"flex",flexDirection:"column",gap:20}}>
          {orderedTypes.map(type => (
            <div key={type}>
              <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",paddingBottom:8,borderBottom:"1px solid #2a2a2a",marginBottom:8}}>
                {TYPE_LABELS[type]||type}
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {(tagsByType[type]||[]).map(tag => {
                  const on = activeTags.has(tag.id);
                  return (
                    <button key={tag.id} onClick={() => toggleTag(tag.id)}
                      style={{background:on?"#1c1811":"#1a1a1a",border:`1px solid ${on?"#c9a84c":"#333"}`,color:on?"#c9a84c":"#bbb",padding:"5px 13px",fontSize:12,letterSpacing:"0.03em",cursor:"pointer",borderRadius:2,transition:"all 0.1s",fontFamily:"Georgia,serif"}}>
                      {tag.name}{on?" ✓":""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Add tag */}
          <div>
            <div style={{fontSize:10,letterSpacing:"0.2em",textTransform:"uppercase",color:"#888",paddingBottom:8,borderBottom:"1px solid #2a2a2a",marginBottom:8}}>New Tag</div>
            {!showAdd ? (
              <button onClick={()=>setShowAdd(true)} style={{background:"none",border:"1px dashed #444",color:"#888",padding:"5px 13px",fontSize:12,cursor:"pointer",borderRadius:2,letterSpacing:"0.05em"}}>+ Add tag</button>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:7,maxWidth:280}}>
                <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Tag name"
                  onKeyDown={e=>e.key==="Enter"&&addTag()} autoFocus
                  style={{background:"#1a1a1a",border:"1px solid #333",color:"#e8e4dc",padding:"7px 10px",fontSize:12,borderRadius:2,outline:"none",fontFamily:"Georgia,serif"}}/>
                <select value={newType} onChange={e=>setNewType(e.target.value)}
                  style={{background:"#1a1a1a",border:"1px solid #333",color:"#aaa",padding:"7px 10px",fontSize:12,borderRadius:2,outline:"none",cursor:"pointer"}}>
                  <option value="">Select type…</option>
                  {orderedTypes.map(t=><option key={t} value={t}>{TYPE_LABELS[t]||t}</option>)}
                  <option value="cultural">Cultural</option>
                </select>
                <div style={{display:"flex",gap:7}}>
                  <button onClick={addTag} disabled={adding} style={{background:"#c9a84c",border:"none",color:"#0e0e0e",padding:"6px 16px",fontSize:12,cursor:"pointer",borderRadius:2,fontWeight:700,letterSpacing:"0.06em"}}>
                    {adding?"…":"Add & Apply"}
                  </button>
                  <button onClick={()=>{setShowAdd(false);setNewName("");setNewType("");}} style={{background:"none",border:"1px solid #333",color:"#aaa",padding:"6px 16px",fontSize:12,cursor:"pointer",borderRadius:2,letterSpacing:"0.06em"}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
