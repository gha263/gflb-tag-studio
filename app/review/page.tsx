"use client";

import { useState, useEffect } from "react";

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

const STATUS_COLORS: Record<string, string> = {
  draft: C.amber, published: C.green, archived: C.dim,
};

type Look = {
  id: string;
  status: string;
  cloudinary_url: string;
  source_url: string | null;
  source_name: string | null;
  scene: string | null;
  gender: string | null;
  season_display: string | null;
  season_term: string | null;
  season_year: number | null;
  date_published: string | null;
  is_key_look: boolean;
  notes: string | null;
  created_at: string;
  brand_id: string | null;
  brand_name: string;
  credit_count: number;
  tag_count: number;
};

export default function ReviewQueue() {
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "published" | "archived">("draft");
  const [selected, setSelected] = useState<Look | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Edit state
  const [editScene, setEditScene] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editSeasonTerm, setEditSeasonTerm] = useState("");
  const [editSeasonYear, setEditSeasonYear] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editKeyLook, setEditKeyLook] = useState(false);

  useEffect(() => { loadLooks(); }, [statusFilter]);

  const loadLooks = async () => {
    setLoading(true);
    setSelected(null);
    try {
      // Get status counts
      const allLooks = await sb("looks?select=status");
      const c: Record<string, number> = { draft: 0, published: 0, archived: 0 };
      allLooks.forEach((l: any) => { c[l.status] = (c[l.status] || 0) + 1; });
      setCounts(c);

      // Get filtered looks with brand + credit + tag counts
      const filter = statusFilter === "all" ? "" : `status=eq.${statusFilter}&`;
      const data = await sb(
        `looks?${filter}select=id,status,cloudinary_url,source_url,source_name,scene,gender,season_display,season_term,season_year,date_published,is_key_look,notes,created_at,brand_id,brands(name),look_credits(id),look_tags(id)&order=created_at.desc&limit=200`
      );
      const mapped = data.map((l: any) => ({
        ...l,
        brand_name: l.brands?.name || "",
        credit_count: l.look_credits?.length || 0,
        tag_count: l.look_tags?.length || 0,
      }));
      setLooks(mapped);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const selectLook = (look: Look) => {
    setSelected(look);
    setEditScene(look.scene || "");
    setEditGender(look.gender || "");
    setEditSeasonTerm(look.season_term || "");
    setEditSeasonYear(look.season_year?.toString() || "");
    setEditNotes(look.notes || "");
    setEditKeyLook(look.is_key_look);
  };

  const saveEdits = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await sb(`looks?id=eq.${selected.id}`, {
        method: "PATCH", prefer: "",
        body: JSON.stringify({
          scene: editScene || null,
          gender: editGender || null,
          season_term: editSeasonTerm || null,
          season_year: editSeasonYear ? parseInt(editSeasonYear) : null,
          notes: editNotes || null,
          is_key_look: editKeyLook,
        }),
      });
      await loadLooks();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const setStatus = async (lookId: string, status: string, takedownReason?: string) => {
    setSaving(true);
    try {
      const body: any = { status };
      if (takedownReason) { body.takedown_reason = takedownReason; body.takedown_at = new Date().toISOString(); }
      await sb(`looks?id=eq.${lookId}`, { method: "PATCH", prefer: "", body: JSON.stringify(body) });
      await loadLooks();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const publishAll = async () => {
    const drafts = looks.filter(l => l.status === "draft");
    if (!drafts.length) return;
    if (!confirm(`Publish all ${drafts.length} draft looks?`)) return;
    setSaving(true);
    try {
      await sb(`looks?status=eq.draft`, { method: "PATCH", prefer: "", body: JSON.stringify({ status: "published" }) });
      await loadLooks();
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const missingFields = (look: Look) => {
    const missing = [];
    if (!look.brand_name) missing.push("brand");
    if (!look.scene) missing.push("scene");
    if (!look.gender) missing.push("gender");
    if (!look.season_year) missing.push("season");
    if (look.credit_count === 0) missing.push("credits");
    if (look.tag_count === 0) missing.push("tags");
    return missing;
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
        .look-row:hover { background: #2a2a2a !important; }
        .look-row.active { background: #2f2f2f !important; border-left: 2px solid #ececec !important; }
      `}</style>

      <div style={{ fontFamily: "Inter,sans-serif", background: C.bg, color: C.text, height: "calc(100vh - 44px)", display: "flex", flexDirection: "column", overflow: "hidden", fontSize: 14 }}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: `1px solid ${C.lift1}`, flexShrink: 0 }}>
          
          {/* Status filter tabs */}
          <div style={{ display: "flex", gap: 4 }}>
            {(["draft", "published", "archived", "all"] as const).map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{
                  background: statusFilter === s ? C.lift2 : "transparent",
                  border: "none", color: statusFilter === s ? C.text : C.muted,
                  padding: "6px 14px", fontSize: 13, cursor: "pointer",
                  borderRadius: 20, fontFamily: "Inter,sans-serif", fontWeight: statusFilter === s ? 600 : 400,
                }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
                {s !== "all" && counts[s] !== undefined && (
                  <span style={{ marginLeft: 6, fontSize: 11, color: s === "draft" ? C.amber : C.muted }}>
                    {counts[s]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {statusFilter === "draft" && counts.draft > 0 && (
            <button onClick={publishAll} disabled={saving}
              style={{ background: C.green, border: "none", color: "#fff", padding: "7px 18px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
              Publish all drafts ({counts.draft})
            </button>
          )}

          <span style={{ fontSize: 12, color: C.muted }}>{looks.length} looks</span>
        </div>

        {/* Body — split list + detail */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Left — look list */}
          <div style={{ width: selected ? "45%" : "100%", flexShrink: 0, overflowY: "auto", borderRight: selected ? `1px solid ${C.lift1}` : "none", transition: "width 0.2s" }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200, color: C.muted }}>Loading…</div>
            ) : looks.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 300, gap: 8, color: C.muted }}>
                <div style={{ fontSize: 32 }}>✓</div>
                <div style={{ fontSize: 14 }}>No {statusFilter === "all" ? "" : statusFilter} looks</div>
                {statusFilter === "draft" && <div style={{ fontSize: 12, color: C.dim }}>Ingest some looks to get started</div>}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.lift1}` }}>
                    {["Image", "Brand", "Scene", "Season", "Credits", "Tags", "Missing", "Status", ""].map(h => (
                      <th key={h} style={{ padding: "8px 12px", fontSize: 11, fontWeight: 600, color: C.muted, textAlign: "left", letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {looks.map(look => {
                    const missing = missingFields(look);
                    const isActive = selected?.id === look.id;
                    return (
                      <tr key={look.id}
                        className={`look-row${isActive ? " active" : ""}`}
                        onClick={() => selectLook(look)}
                        style={{ borderBottom: `1px solid ${C.lift1}`, cursor: "pointer", background: isActive ? C.lift1 : "transparent", borderLeft: isActive ? `2px solid ${C.white}` : "2px solid transparent" }}>
                        
                        {/* Thumbnail */}
                        <td style={{ padding: "8px 12px", width: 60 }}>
                          {look.cloudinary_url ? (
                            <img src={look.cloudinary_url} alt="" style={{ width: 44, height: 52, objectFit: "cover", borderRadius: 4, display: "block" }} />
                          ) : (
                            <div style={{ width: 44, height: 52, background: C.lift2, borderRadius: 4 }} />
                          )}
                        </td>

                        {/* Brand */}
                        <td style={{ padding: "8px 12px", maxWidth: 140 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: look.brand_name ? C.text : C.dim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {look.brand_name || "—"}
                          </div>
                          {look.source_name && !look.brand_name && (
                            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{look.source_name}</div>
                          )}
                        </td>

                        {/* Scene */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 12, color: look.scene ? C.text : C.dim }}>
                            {look.scene || "—"}
                          </span>
                        </td>

                        {/* Season */}
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                          <span style={{ fontSize: 12, color: look.season_display ? C.text : C.dim }}>
                            {look.season_display || (look.season_year ? look.season_year.toString() : "—")}
                          </span>
                        </td>

                        {/* Credits */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 12, color: look.credit_count > 0 ? C.green : C.dim }}>
                            {look.credit_count}
                          </span>
                        </td>

                        {/* Tags */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 12, color: look.tag_count > 0 ? C.text : C.dim }}>
                            {look.tag_count}
                          </span>
                        </td>

                        {/* Missing fields */}
                        <td style={{ padding: "8px 12px", maxWidth: 160 }}>
                          {missing.length > 0 ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {missing.map(m => (
                                <span key={m} style={{ fontSize: 10, background: "#3a2a1a", color: C.amber, padding: "1px 6px", borderRadius: 10, fontWeight: 500 }}>
                                  {m}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: 12, color: C.green }}>✓ complete</span>
                          )}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "8px 12px" }}>
                          <span style={{ fontSize: 11, color: STATUS_COLORS[look.status] || C.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            {look.status}
                          </span>
                          {look.is_key_look && <span style={{ marginLeft: 6, fontSize: 10, color: C.white, background: C.lift2, padding: "1px 6px", borderRadius: 10 }}>key</span>}
                        </td>

                        {/* Quick actions */}
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }} onClick={e => e.stopPropagation()}>
                          {look.status === "draft" && (
                            <button onClick={() => setStatus(look.id, "published")}
                              style={{ background: C.green, border: "none", color: "#fff", padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontWeight: 600, fontFamily: "Inter,sans-serif" }}>
                              Publish
                            </button>
                          )}
                          {look.status === "published" && (
                            <button onClick={() => setStatus(look.id, "archived", "manual")}
                              style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>
                              Archive
                            </button>
                          )}
                          {look.status === "archived" && (
                            <button onClick={() => setStatus(look.id, "published")}
                              style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "4px 10px", fontSize: 11, cursor: "pointer", borderRadius: 12, fontFamily: "Inter,sans-serif" }}>
                              Restore
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Right — detail/edit panel */}
          {selected && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              
              {/* Image */}
              <div style={{ position: "relative", background: "#181818", flexShrink: 0 }}>
                <img src={selected.cloudinary_url} alt="" style={{ width: "100%", maxHeight: 380, objectFit: "contain", display: "block" }} />
                <button onClick={() => setSelected(null)}
                  style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,0.6)", border: "none", color: C.text, width: 28, height: 28, borderRadius: 14, fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  ×
                </button>
              </div>

              {/* Detail fields */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{selected.brand_name || "No brand"}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {new Date(selected.created_at).toLocaleDateString()} · {selected.credit_count} credits · {selected.tag_count} tags
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {selected.source_url && (
                      <a href={selected.source_url} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: C.text, textDecoration: "none", background: C.lift2, padding: "5px 12px", borderRadius: 20, fontWeight: 500 }}>
                        ↗ source
                      </a>
                    )}
                  </div>
                </div>

                {/* Editable fields */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Scene</label>
                    <select value={editScene} onChange={e => setEditScene(e.target.value)}
                      style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                      <option value="">— select —</option>
                      <option value="runway">Runway</option>
                      <option value="street">Street</option>
                      <option value="editorial">Editorial</option>
                      <option value="designer_showcase">Designer Showcase</option>
                      <option value="lookbook">Lookbook</option>
                      <option value="presentation">Presentation</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Gender</label>
                    <select value={editGender} onChange={e => setEditGender(e.target.value)}
                      style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                      <option value="">— select —</option>
                      <option value="womenswear">Womenswear</option>
                      <option value="menswear">Menswear</option>
                      <option value="unisex">Unisex</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Season</label>
                    <div style={{ display: "flex", gap: 6 }}>
                      <select value={editSeasonTerm} onChange={e => setEditSeasonTerm(e.target.value)}
                        style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", flex: 1 }}>
                        <option value="">— term —</option>
                        <option value="Spring">Spring</option>
                        <option value="Summer">Summer</option>
                        <option value="Fall">Fall</option>
                        <option value="Winter">Winter</option>
                        <option value="Resort">Resort</option>
                        <option value="Pre-Fall">Pre-Fall</option>
                        <option value="No Season">No Season</option>
                      </select>
                      <input value={editSeasonYear} onChange={e => setEditSeasonYear(e.target.value)}
                        placeholder="2025" maxLength={4}
                        style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", width: 70, fontFamily: "Inter,sans-serif" }} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Key Look</label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: C.text, paddingTop: 6 }}>
                      <input type="checkbox" checked={editKeyLook} onChange={e => setEditKeyLook(e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: C.white, cursor: "pointer" }} />
                      Mark as key look
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 12, color: C.muted, fontWeight: 500 }}>Notes</label>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={3}
                    style={{ background: C.lift3, border: "none", color: C.text, padding: "8px 12px", fontSize: 13, borderRadius: 10, outline: "none", resize: "vertical", fontFamily: "Inter,sans-serif", lineHeight: 1.5 }} />
                </div>

                {/* Missing fields warning */}
                {missingFields(selected).length > 0 && (
                  <div style={{ background: "#2a1f0a", border: "1px solid #5a3a0a", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: C.amber, fontWeight: 600, marginBottom: 4 }}>Missing fields</div>
                    <div style={{ fontSize: 12, color: "#c8a060" }}>{missingFields(selected).join(", ")}</div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, paddingTop: 4 }}>
                  <button onClick={saveEdits} disabled={saving}
                    style={{ background: C.white, border: "none", color: "#212121", padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                    {saving ? "Saving…" : "Save changes"}
                  </button>

                  {selected.status === "draft" && (
                    <button onClick={() => setStatus(selected.id, "published")} disabled={saving}
                      style={{ background: C.green, border: "none", color: "#fff", padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontWeight: 600, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                      Publish
                    </button>
                  )}

                  {selected.status === "published" && (
                    <button onClick={() => setStatus(selected.id, "archived", "manual")} disabled={saving}
                      style={{ background: "transparent", border: `1px solid ${C.lift2}`, color: C.muted, padding: "9px 20px", fontSize: 13, cursor: "pointer", borderRadius: 20, fontFamily: "Inter,sans-serif", opacity: saving ? 0.5 : 1 }}>
                      Archive
                    </button>
                  )}

                  {selected.status === "archived" && (
                    <button onClick={() => setStatus(selected.id, "published")} disabled={saving}
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
