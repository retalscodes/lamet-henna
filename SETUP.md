# Lamet Henna — Setup Guide

## Step 1 — Add the Logo

Place your logo file at: `assets/logo.png`
(PNG with transparent background recommended, ~300×300px)

---

## Step 2 — Create a Supabase Project

1. Go to https://supabase.com → "New Project"
2. Name it `lamet-henna`, choose any region close to Jordan
3. Save the **Project URL** and **Service Role Key** (Settings → API)
4. Run this SQL in the **SQL Editor**:

```sql
-- Available time slots (admin-managed)
CREATE TABLE time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(date, time)
);

-- Customer bookings
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service TEXT NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gallery photos (uploaded from admin panel)
CREATE TABLE gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,        -- 'henna', 'events', 'sedr'
  image_url TEXT NOT NULL,
  file_path TEXT NOT NULL,      -- path inside Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing packages (managed from admin panel)
CREATE TABLE pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service TEXT NOT NULL,        -- 'henna', 'events', 'sedr', 'other'
  label TEXT NOT NULL,          -- e.g. "حنة العروس الكاملة"
  amount NUMERIC(8,2) NOT NULL, -- price in JD
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Then create the **Storage bucket** for gallery photos:

1. In Supabase → **Storage** → **New bucket**
2. Name: `gallery`
3. Set to **Public** (so images load on the website without auth)

---

## Step 3 — Deploy to Netlify

1. Push this folder to a GitHub repo (or drag-drop to Netlify)
2. In Netlify → **Site Settings → Environment Variables**, add:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Claude API key (from console.anthropic.com) |
| `ADMIN_PASSWORD` | A strong password for your aunt to log into /admin |
| `ADMIN_SECRET` | Any random string (used to sign tokens) |

3. Deploy — Netlify will automatically install dependencies and deploy functions.

---

## Step 4 — Add Photos

Replace the gray gallery placeholders by adding images to the `assets/` folder and updating the gallery sections in `henna.html`, `events.html`, `sedr.html`. Example:

```html
<div class="gallery-item">
  <img src="assets/henna-1.jpg" alt="حنة عروس" loading="lazy">
</div>
```

---

## Admin Panel Usage

Your aunt visits: `https://your-site.netlify.app/admin`

- **Login** with the password set in `ADMIN_PASSWORD`
- **Bookings tab**: See all requests → Confirm or Cancel → WhatsApp customer directly
- **Manage Slots tab**: Pick a date and which hours to open/close for that day
  - By default, all days Sat–Thu show 10AM–5PM as available
  - Use this to block out days she's unavailable, or open extra hours

---

## Domain (Optional)

In Netlify → Domain Management → Add custom domain (e.g. `lamet-henna.com`)
