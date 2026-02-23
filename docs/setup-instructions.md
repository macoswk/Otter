# Otter Setup Instructions

This guide walks you through setting up your own instance of Otter, from creating the Supabase database to deploying on Cloudflare Workers.

## Prerequisites

- [Node.js](https://nodejs.org) (v20+)
- [pnpm](https://pnpm.io) — install with `npm i -g pnpm`
- [Supabase](https://supabase.com) account and the [Supabase CLI](https://supabase.com/docs/reference/cli/introduction)
- [Cloudflare](https://cloudflare.com) account and the [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) — install with `npm i -g wrangler`

---

## 1. Clone and install

```bash
git clone https://github.com/mrmartineau/otter.git
cd otter
pnpm install
```

---

## 2. Supabase setup

### 2.1 Create a project

1. Go to [database.new](https://database.new) and create a new Supabase project
2. Note down your **project URL**, **anon key**, and **service role key** from **Project Settings → API**
3. Note down your **project ID** from **Project Settings → General**

### 2.2 Create the database schema

Run the following SQL in the [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql) (or via the CLI) to create the required enums, tables, views, and functions.

#### Enums

```sql
-- Bookmark status
CREATE TYPE status AS ENUM ('active', 'inactive');

-- Bookmark type
CREATE TYPE type AS ENUM (
  'link', 'video', 'audio', 'recipe', 'image', 'document',
  'article', 'game', 'book', 'event', 'product', 'note', 'file', 'place'
);

-- Feed type
CREATE TYPE feeds_type AS ENUM ('rss', 'api');

-- Media enums
CREATE TYPE media_status AS ENUM ('now', 'skipped', 'done', 'wishlist');
CREATE TYPE media_type AS ENUM ('tv', 'film', 'game', 'book', 'podcast', 'music', 'other');
CREATE TYPE media_rating AS ENUM (
  '0', '0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'
);
```

#### Tables

```sql
-- Bookmarks
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT,
  title TEXT,
  description TEXT,
  image TEXT,
  note TEXT,
  type type,
  status status NOT NULL DEFAULT 'active',
  star BOOLEAN NOT NULL DEFAULT false,
  public BOOLEAN NOT NULL DEFAULT false,
  click_count INTEGER NOT NULL DEFAULT 0,
  feed TEXT,
  tags TEXT[],
  tweet JSONB,
  "user" UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tag TEXT NOT NULL
);

-- Bookmark ↔ Tag join table
CREATE TABLE bookmark_tags (
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id),
  tag_id UUID NOT NULL REFERENCES tags(id),
  PRIMARY KEY (bookmark_id, tag_id)
);

-- User profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT,
  avatar_url TEXT,
  api_key TEXT DEFAULT gen_random_uuid(),
  settings_tags_visible BOOLEAN NOT NULL DEFAULT true,
  settings_types_visible BOOLEAN NOT NULL DEFAULT true,
  settings_collections_visible BOOLEAN NOT NULL DEFAULT true,
  settings_group_by_date BOOLEAN DEFAULT false,
  settings_pinned_tags TEXT[] NOT NULL DEFAULT '{}',
  settings_top_tags_count INTEGER DEFAULT 20,
  updated_at TIMESTAMPTZ
);

-- RSS Feeds
CREATE TABLE feeds (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  type feeds_type NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Media tracking
CREATE TABLE media (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type media_type,
  status media_status,
  platform TEXT,
  media_id TEXT,
  image TEXT,
  rating media_rating,
  sort_order INTEGER,
  "user" UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  modified_at TIMESTAMPTZ
);

-- Toots (Mastodon backup)
CREATE TABLE toots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  toot_id TEXT,
  toot_url TEXT,
  text TEXT,
  user_id TEXT,
  user_name TEXT,
  user_avatar TEXT,
  hashtags TEXT[],
  urls JSONB,
  media JSONB,
  reply JSONB,
  liked_toot BOOLEAN NOT NULL DEFAULT false,
  db_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ
);

-- Tweets (Twitter/X backup)
CREATE TABLE tweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id TEXT,
  tweet_url TEXT,
  text TEXT,
  user_id TEXT,
  user_name TEXT,
  user_avatar TEXT,
  hashtags TEXT[],
  urls JSONB,
  media JSONB,
  reply JSONB,
  liked_tweet BOOLEAN NOT NULL DEFAULT false,
  db_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ
);
```

#### Views

```sql
-- Bookmark counts
CREATE VIEW bookmark_counts AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active') AS all_count,
  COUNT(*) FILTER (WHERE star = true AND status = 'active') AS stars_count,
  COUNT(*) FILTER (WHERE public = true AND status = 'active') AS public_count,
  COUNT(*) FILTER (WHERE status = 'inactive') AS trash_count,
  COUNT(*) FILTER (WHERE click_count > 0 AND status = 'active') AS top_count
FROM bookmarks;

-- Tag counts
CREATE VIEW tags_count AS
SELECT
  unnest(tags) AS tag,
  COUNT(*) AS count
FROM bookmarks
WHERE status = 'active'
GROUP BY tag
ORDER BY count DESC;

CREATE VIEW tags_count1 AS
SELECT
  unnest(tags) AS tag,
  COUNT(*) AS bookmark_count
FROM bookmarks
WHERE status = 'active'
GROUP BY tag
ORDER BY bookmark_count DESC;

-- Types count
CREATE VIEW types_count AS
SELECT
  type,
  COUNT(*) AS count
FROM bookmarks
WHERE status = 'active' AND type IS NOT NULL
GROUP BY type
ORDER BY count DESC;

-- Collection tags view
CREATE VIEW collection_tags_view AS
SELECT
  tags[1] AS collection,
  tags,
  COUNT(*) AS bookmark_count
FROM bookmarks
WHERE status = 'active' AND array_length(tags, 1) > 0
GROUP BY tags[1], tags
ORDER BY bookmark_count DESC;
```

#### Functions

```sql
-- Check if a URL already exists
CREATE OR REPLACE FUNCTION check_url(url_input TEXT)
RETURNS SETOF bookmarks AS $$
  SELECT * FROM bookmarks WHERE url = url_input;
$$ LANGUAGE sql;

-- Get bookmarks by collection (first tag)
CREATE OR REPLACE FUNCTION get_bookmarks_by_collection(collection_name TEXT)
RETURNS SETOF bookmarks AS $$
  SELECT * FROM bookmarks
  WHERE tags[1] = collection_name AND status = 'active'
  ORDER BY created_at DESC;
$$ LANGUAGE sql;

-- Update bookmark tags (rename a tag across all bookmarks)
CREATE OR REPLACE FUNCTION update_bookmark_tags(user_id UUID, old_tag TEXT, new_tag TEXT)
RETURNS VOID AS $$
  UPDATE bookmarks
  SET tags = array_replace(tags, old_tag, new_tag),
      modified_at = now()
  WHERE "user" = user_id AND old_tag = ANY(tags);
$$ LANGUAGE sql;
```

### 2.3 Row-Level Security (RLS)

Enable RLS on all tables so that users can only access their own data:

```sql
-- Enable RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
ALTER TABLE toots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tweets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE feeds ENABLE ROW LEVEL SECURITY;

-- Bookmarks: users can CRUD their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT USING (auth.uid() = "user");
CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT WITH CHECK (auth.uid() = "user");
CREATE POLICY "Users can update own bookmarks"
  ON bookmarks FOR UPDATE USING (auth.uid() = "user");
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE USING (auth.uid() = "user");

-- Profiles: users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Media: users can CRUD their own media
CREATE POLICY "Users can view own media"
  ON media FOR SELECT USING (auth.uid() = "user");
CREATE POLICY "Users can insert own media"
  ON media FOR INSERT WITH CHECK (auth.uid() = "user");
CREATE POLICY "Users can update own media"
  ON media FOR UPDATE USING (auth.uid() = "user");
CREATE POLICY "Users can delete own media"
  ON media FOR DELETE USING (auth.uid() = "user");

-- Toots: users can CRUD their own toots
CREATE POLICY "Users can view own toots"
  ON toots FOR SELECT USING (auth.uid() = db_user_id);
CREATE POLICY "Users can insert own toots"
  ON toots FOR INSERT WITH CHECK (auth.uid() = db_user_id);

-- Tweets: users can CRUD their own tweets
CREATE POLICY "Users can view own tweets"
  ON tweets FOR SELECT USING (auth.uid() = db_user_id);
CREATE POLICY "Users can insert own tweets"
  ON tweets FOR INSERT WITH CHECK (auth.uid() = db_user_id);

-- Tags: all authenticated users can read and insert
CREATE POLICY "Authenticated users can view tags"
  ON tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert tags"
  ON tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Bookmark tags: all authenticated users can read and insert
CREATE POLICY "Authenticated users can view bookmark_tags"
  ON bookmark_tags FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert bookmark_tags"
  ON bookmark_tags FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Feeds: all authenticated users can read and manage
CREATE POLICY "Authenticated users can view feeds"
  ON feeds FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert feeds"
  ON feeds FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

### 2.4 Auto-create profile on signup

Create a trigger to automatically create a `profiles` row when a new user signs up:

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2.5 Configure authentication

1. In the Supabase dashboard, go to **Authentication → Providers**
2. Ensure **Email** provider is enabled
3. Optionally configure additional providers (GitHub, Google, etc.)

---

## 3. Cloudflare setup

### 3.1 Authenticate with Cloudflare

```bash
wrangler login
```

### 3.2 Configure environment variables

For **local development**, create a `.dev.vars` file in `packages/web/`:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

For **production**, set secrets via Wrangler:

```bash
cd packages/web

# Required
wrangler secret put VITE_SUPABASE_URL
wrangler secret put VITE_SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_KEY

# Optional — only needed for Mastodon integration
wrangler secret put BOT_MASTODON_ACCESS_TOKEN
wrangler secret put PERSONAL_MASTODON_ACCESS_TOKEN

# Optional — API key for external API access
wrangler secret put SUPABASE_USER_API_KEY
```

### 3.3 Workers AI

The Cloudflare Workers AI binding is already configured in `wrangler.jsonc`. No additional setup is required — AI features (title and description rewriting) will work automatically when deployed to Cloudflare.

---

## 4. Enable signups

By default, signups are disabled. To allow new user registration, edit `packages/web/src/constants.ts`:

```ts
export const ALLOW_SIGNUP = true
```

After creating your account, set this back to `false` if you want to prevent other users from signing up.

---

## 5. Running locally

```bash
# From the project root
pnpm web:dev
```

This starts the Vite dev server with the Cloudflare Workers runtime at [http://localhost:5678](http://localhost:5678).

### Other useful commands

```bash
# Build the web app
pnpm web:build

# Type-check
pnpm type-check

# Format code
pnpm format

# Lint code
pnpm lint

# Regenerate Supabase TypeScript types
cd packages/web
pnpm supabase:types:app

# Regenerate Cloudflare worker types
cd packages/web
pnpm cf-typegen
```

---

## 6. Deploying to Cloudflare

```bash
cd packages/web
pnpm deploy
```

This runs `tsc -b && vite build` then `wrangler deploy`, which builds the app and deploys it to Cloudflare Workers.

The Worker name defaults to `otter-web` (configured in `wrangler.jsonc`). Your app will be available at `https://otter-web.<your-account>.workers.dev`, or you can configure a custom domain in the Cloudflare dashboard.

### Custom domain

1. Go to the [Cloudflare dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages → otter-web → Settings → Domains & Routes**
3. Add your custom domain

---

## 7. Optional integrations

### Mastodon auto-toot

Otter can automatically toot to Mastodon when a bookmark with `public = true` is created or updated. This is triggered by a PostgreSQL trigger function.

1. Set the `BOT_MASTODON_ACCESS_TOKEN` and/or `PERSONAL_MASTODON_ACCESS_TOKEN` secrets (see [3.2](#32-configure-environment-variables))
2. Create the database trigger in the Supabase SQL Editor:

```sql
CREATE TRIGGER "toot-otter-items"
AFTER INSERT OR UPDATE ON bookmarks
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request (
  'https://your-otter-instance.com/api/toot',
  'POST',
  '{"Content-type":"application/json","Authorization":"your-api-key"}',
  '{}',
  '1000'
);
```

Replace `your-otter-instance.com` with your deployed URL and `your-api-key` with the API key from your user profile.

### Raycast extension

The [Raycast extension](https://www.raycast.com/mrmartineau/otter) is available on the Raycast extension store. It lets you search bookmarks, view recent items, and create new bookmarks from Raycast.

### Browser extension

The `packages/web-extension` package provides a cross-browser extension for Chrome and Firefox. See [its README](../packages/web-extension/README.md) for installation instructions.

### macOS & iOS app

The `packages/app` directory contains a native Swift app with share extensions for macOS and iOS, allowing you to save bookmarks directly from the share sheet.

---

## Database schema reference

### Tables

| Table | Description |
| --- | --- |
| `bookmarks` | Saved bookmarks with URL, title, description, tags, type, and status |
| `tags` | Tag definitions |
| `bookmark_tags` | Many-to-many join between bookmarks and tags |
| `profiles` | User profiles with app settings and API key |
| `media` | Media items (films, TV, games, books, etc.) with status tracking |
| `feeds` | RSS feed subscriptions |
| `toots` | Mastodon toot backups |
| `tweets` | Twitter/X tweet backups |

### Enums

| Enum | Values |
| --- | --- |
| `status` | `active`, `inactive` |
| `type` | `link`, `video`, `audio`, `recipe`, `image`, `document`, `article`, `game`, `book`, `event`, `product`, `note`, `file`, `place` |
| `feeds_type` | `rss`, `api` |
| `media_status` | `now`, `skipped`, `done`, `wishlist` |
| `media_type` | `tv`, `film`, `game`, `book`, `podcast`, `music`, `other` |
| `media_rating` | `0` through `5` in `0.5` increments |

### Views

| View | Description |
| --- | --- |
| `bookmark_counts` | Aggregate counts (all, starred, public, trash, top) |
| `tags_count` / `tags_count1` | Tag usage counts |
| `types_count` | Bookmark type counts |
| `collection_tags_view` | Collections derived from first tag |

### API endpoints

All endpoints are served from `/api` on your Otter instance.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/` | Health check |
| `POST` | `/api/new` | Create a new bookmark |
| `GET` | `/api/new?url=...` | Quick-create bookmark from URL with scraped metadata |
| `GET` | `/api/bookmarks` | List all bookmarks |
| `GET` | `/api/search?searchTerm=...` | Search bookmarks |
| `GET` | `/api/media` | List media items grouped by type and status |
| `GET` | `/api/media-search` | Search media items |
| `POST` | `/api/toot` | Send Mastodon toots (called by DB trigger) |
| `GET` | `/api/scrape?url=...` | Scrape URL metadata via Cloudflare HTMLRewriter |
| `POST` | `/api/ai/title` | Rewrite a title using Workers AI |
| `POST` | `/api/ai/description` | Rewrite a description using Workers AI |
| `GET` | `/api/rss?feed=...` | Convert an RSS feed to JSON |

API endpoints that modify data require a `Bearer` token in the `Authorization` header. The token is the `api_key` from your user's `profiles` row.
