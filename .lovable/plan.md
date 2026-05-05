# Plan: Update receive-from-polisher edge function

## Changes to `supabase/functions/receive-from-polisher/index.ts`

### 1. Make `date` validation conditional

Replace the current combined check:

```ts
if (!content || !date) { ... 'content and date are required' ... }
```

With two checks:

- `content` is always required.
- `date` is only required when `pipeline_id` is NOT provided (i.e., the INSERT branch).

### 2. Expand the UPDATE branch fields

In the `if (pipeline_id) { ... }` branch, change the `.update({...})` payload to also persist `channel`, `platform`, and `date` so they don't get lost on incoming polisher updates:

```ts
.update({
  hook: contentStr.slice(0, 280),
  status: 'Polishing',
  notes: 'From Polisher',
  channel: channel ?? null,
  platform: platform ?? null,
  date: date,
})
```

Note: when `pipeline_id` is provided without `date`, `date` will be `undefined` and the column will simply not be overwritten by Supabase's update (undefined values are stripped). Existing date stays intact.

### 3. Everything else unchanged

- CORS, JWT bypass, method check, error handling, response shape all stay as-is.
- INSERT branch unchanged.
- `polisher_queue` "mark done" best-effort logic unchanged.
- Returns `{ success: true, pipeline_id: <id> }` in both branches.
