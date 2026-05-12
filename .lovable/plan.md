## Pipeline cleanup plan

Current pipeline: **702 rows** (April 2026 → January 2027). The volume is a real cause of slowness — every Pipeline page render loads all rows and groups/sorts them client-side.

### What I'll do

**Step 1 — Date cutoff**
Delete every pipeline row with `date > 2026-08-31`.
- Removes **195 rows** (Sep 2026 → Jan 2027, ~39/month).

**Step 2 — Deduplicate**
Within the remaining rows, treat two rows as duplicates when they share the same `idea` + `channel` + `platform`. Different platform = kept (per your note). Date is ignored, so repeats across multiple days collapse into one. Keep the **oldest** row in each group (preserves any edits/status changes made on the original).
- Removes **334 extra rows** across **167 duplicate groups**.

**Final state:** ~173 rows (down from 702, ~75% reduction).

### Safety

- I'll run both deletes inside a single transaction so it's all-or-nothing.
- "Keep oldest" uses `created_at ASC` — if a duplicate has been advanced to `Approved`/`Polishing`/`Scheduled`/`Posted`, that progress could be lost. Posted items dated after Aug 31 would also be deleted by Step 1. **Tell me if you want me to protect non-`Idea`/`Drafting` rows from deletion** — otherwise I proceed as above.
- No schema changes. Data-only. Backed by a single SQL transaction via the insert tool.

### Technical detail

```sql
BEGIN;

-- Step 1
DELETE FROM pipeline WHERE date > '2026-08-31';

-- Step 2
DELETE FROM pipeline p
USING (
  SELECT id FROM (
    SELECT id, row_number() OVER (
      PARTITION BY idea, channel, platform
      ORDER BY created_at ASC
    ) rn
    FROM pipeline
  ) t WHERE rn > 1
) d
WHERE p.id = d.id;

COMMIT;
```

### My thoughts (you asked)

Cleanup is the right move, but it only treats the symptom. Even at 173 rows the Pipeline page still fetches everything and does grouping/sorting in JS. After cleanup I'd recommend (separate task, your call):
1. Server-side filter by date range (default: next 8 weeks) so the page never loads 700+ rows again.
2. Pagination or virtualized rows for the table.
3. A scheduled job that auto-archives `Posted` items older than 60 days.

Reply **"go"** to run the cleanup, or tell me to protect advanced-status rows first.