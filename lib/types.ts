// ─────────────────────────────────────────────────────────────────────────────
// lib/types.ts
// Shared types for Look World Studio core entities. Mirrors the live Supabase schema.
//
// IMPORTANT naming asymmetry (do not "fix" these to match each other):
//   - people.instagram_url        (renamed from instagram_handle — holds full URLs)
//   - brands.instagram_handle     (unchanged)
//   - events.instagram_handle     (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

export type LookStatus = "draft" | "published" | "archived";

export interface Look {
  id: string;
  cloudinary_url: string | null;
  cloudinary_public_id: string | null;
  source_cdn_url: string | null;
  caption: string | null;
  source_url: string | null;
  source_name: string | null;
  publication_id: string | null;
  is_collaboration: boolean;
  event_id: string | null;
  scene: string | null;
  gender: string | null;
  season_display: string | null;
  season_term: string | null;
  season_year: number | null;
  date_published: string | null;
  is_key_look: boolean;
  status: LookStatus;
  notes: string | null;
  collection_title: string | null;
  collection_description: string | null;
  slug: string | null;
  created_at: string | null;
}

export interface Person {
  id: string;
  name: string;
  slug: string;
  primary_role: string | null;
  instagram_url: string | null; // full URL, not bare handle
  website: string | null;
  profile_image: string | null;
  created_at: string | null;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  instagram_handle: string | null;
  website: string | null;
  country_id: string | null;
  city_id: string | null;
  card_image_url: string | null;
}

export interface EventRow {
  id: string;
  name: string;
  slug: string;
  event_type: string;
  location_id: string;
  instagram_handle: string | null;
  website: string | null;
  description_display: string | null;
  card_image_url: string | null;
  is_discoverable: boolean;
  recurrence: string | null;
  year_founded: number | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  tag_type: string;
  parent_tag_id: string | null;
  definition: string | null;
}

export interface CreditRole {
  id: string;
  slug: string;
  name: string;
  sort_order: number | null;
}

export interface LookCredit {
  id: string;
  look_id: string;
  person_id: string;
  role: string;
  notes: string | null;
}

export interface LookBrandCredit {
  id: string;
  look_id: string;
  brand_id: string;
  role: string;
}

export interface Location {
  id: string;
  name: string;
  location_type: string; // city | country | region | continent
  country_code?: string | null;
}
