

## Where we are today

**Duzza Content Tracker** is a single-user content operations app (login: `mombasalinks@gmail.com`) for managing posts across four brands (CyberSpace, MarketMakers, WatuWaWatu, RythmRhymRealm) on X, Instagram, and Telegram.

**Working modules:**
- **Auth** — email/password login, protected routes, profiles table auto-populated on signup
- **Today** — shows today's scheduled posts grouped by brand with quick "Mark posted" actions
- **Pipeline** — ideas → drafting → ready, collapsible by Channel · Platform, with date-picker that promotes "Scheduled" items into the calendar
- **Calendar** — week view + list view, CSV/paste bulk upload, click-to-edit any card, status restricted to Scheduled/Posted, prompts for posted URL when marking posted, auto-migrates legacy Planned/Skipped rows back to Pipeline as Ideas
- **Channels** — brand registry with per-channel bulk content upload (CSV + paste with cadence)

**Backend:** 8 tables with RLS locked to authenticated users; `profiles`, `pipeline`, `calendar`, `channels` actively used. `ideas`, `repurposing`, `growth`, `posts` are leftover from removed modules.

---

## Next best actions (priority order)

### 1. Critical — finish the loop
- **Pipeline count badges** on sidebar nav (Today / Pipeline / Calendar) so you see workload at a glance
- **"Send back to Pipeline"** action on calendar cards to reverse a scheduling mistake
- **Copy-to-clipboard** button on Today's posts for fast pasting into X/IG/Telegram
- **Channel link surfacing** — on Today and Calendar cards, show the channel's destination link from `channels.link` so you can jump straight to the platform to post

### 2. High value — reduce manual work
- **AI calendar generation per channel** — "Generate 30 days" button on each Channels card using Lovable AI (Gemini 2.5 Flash) seeded by brand category
- **Search & filter** on Calendar (keyword + date range) and Pipeline (keyword)
- **Profile page** at `/profile` to edit display name and avatar (table already exists, no UI yet)

### 3. Cleanup — remove dead weight
- **Drop unused tables**: `ideas`, `repurposing`, `growth`, `posts` (not referenced by any current page)
- **Remove unused dependencies** flagged in `package.json` after the module deletions
- **Consolidate migrations** — the two empty placeholder migrations were patched in the last diff; verify none remain blank

### 4. Polish
- **Expand/Collapse all** for Pipeline groups (toggle exists but verify it persists per session)
- **Empty states** with clearer CTAs (e.g., Today empty → "Schedule something from Pipeline")
- **Mobile layout pass** — viewport is 633px wide; Calendar's 7-column grid stacks but day cards become tall; consider a vertical agenda view on small screens

---

## Premortem — what could go wrong

**Auth & access**
- Single-user is fine today, but RLS uses `true` for both USING and WITH CHECK on every table. If you ever add a second user (collaborator, VA), they see and can mutate everything. **Mitigation:** when adding users, switch to `auth.uid() = owner_id` and add an `owner_id` column to `pipeline`, `calendar`, `channels`.
- Password is stored in chat history. **Mitigation:** rotate it after first successful login via the Auth page or a profile settings screen.

**Data integrity**
- `calendar.status` default is still `'Planned'` at the DB level, but the UI only allows Scheduled/Posted. A direct DB insert or stale CSV could create a "Planned" row, which the auto-migrate effect will then move to Pipeline — silent data movement could surprise you. **Mitigation:** add a CHECK-style validation trigger restricting status to `('Scheduled','Posted')`, or change the default to `'Scheduled'`.
- No foreign key between `calendar.channel`/`pipeline.channel` and `channels.brand`. Renaming a brand orphans content. **Mitigation:** either add a FK on brand, or run a rename-cascade trigger.
- `posted_link` accepts any string. **Mitigation:** add a simple URL validation trigger.

**UX traps**
- Bulk CSV upload with a wrong header silently produces zero rows; current toast says "no rows" but doesn't list missing headers. **Mitigation:** show which headers were detected vs expected.
- The auto-migrate effect runs on every Calendar mount. If it fails partway (insert succeeds, delete fails), rows duplicate. **Mitigation:** wrap in a single RPC that does both in a transaction.
- "Jump to first post" only looks at `date >= today` implicitly via sort — actually it sorts all dates, so it can jump backward into the past unexpectedly. **Mitigation:** filter to `>= today` first, fall back to earliest overall.

**AI generation (when added)**
- Gemini can hallucinate platform-specific limits (e.g., X char count). **Mitigation:** post-process and truncate per platform.
- Generation is non-deterministic — re-running could create duplicates. **Mitigation:** dedupe on `(channel, date, content[:60])` before insert.

**Operational**
- No backup/export. Losing the Supabase project = losing everything. **Mitigation:** add a one-click "Export all to CSV/JSON" on a Settings page.
- No edit history — accidental overwrite of a long-form post is unrecoverable. **Mitigation:** add a lightweight `content_history` table written by a trigger.

---

## Recommended first sprint (one message of work)

1. Drop the four unused tables
2. Add `owner_id` scaffolding (nullable now, enforced later) on `pipeline`/`calendar`/`channels`
3. Surface channel `link` on Today + Calendar cards
4. Add Copy-to-clipboard on Today
5. Add nav count badges
6. Fix "Jump to first post" to prefer future dates
7. Tighten the Planned/Skipped auto-migrate into a transactional RPC

Tell me to proceed and I'll ship sprint 1, or pick a different starting point.

