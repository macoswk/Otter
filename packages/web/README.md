# Otter Web

### Setup

1. Fork this repo
2. Go to [database.new](https://database.new) and create a new [Supabase](https://supabase.com) project. You will need the project ID (found in the project settings page) and the database password for the next step.
3. Install npm dependencies with [pnpm](https://pnpm.io): `pnpm install`
4. Create a `.dev.vars` file in the `packages/web` directory with the required env vars (see below)
5. Generate Supabase types: `pnpm supabase:types:app`
6. To allow signups, set the value of `ALLOW_SIGNUP` in `./src/constants.ts` to `true`
7. Run the app locally using `pnpm dev`
8. Visit [`http://localhost:5678`](http://localhost:5678) and create an account

### Scripts

```bash
pnpm dev              # Start dev server on port 5678
pnpm build            # TypeScript check and Vite build
pnpm preview          # Build and preview with Vite
pnpm deploy           # Build and deploy to Cloudflare Workers
pnpm cf-typegen       # Generate Cloudflare Workers types
pnpm supabase:types:app  # Generate Supabase TypeScript types
pnpm type-check       # Run TypeScript type checking
```

### Env vars

Create a `.dev.vars` file for local development, or set these as secrets in your Cloudflare Workers project settings.

```bash
# Update these with your Supabase details from your project settings > API
# https://app.supabase.com/project/_/settings/api

# frontend
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# backend
SUPABASE_SERVICE_KEY=your-service-key # used for API access in conjunction with user's API key

# the following two are only required for the Mastodon integration
BOT_MASTODON_ACCESS_TOKEN=
PERSONAL_MASTODON_ACCESS_TOKEN=
```

### Tech Stack

- **Frontend**: React 19, TanStack Router, React Query, Tailwind CSS v4
- **Backend**: Hono API on Cloudflare Workers
- **Database**: Supabase (PostgreSQL)
- **AI**: Cloudflare Workers AI for title/description generation
- **Build**: Vite

### Docs

### API Endpoints

The API uses a [hono](https://hono.dev/) server hosted on Cloudflare Workers.

Interactive API docs can be found in the various `*.rest` files in the `/worker` directory.

- `GET /api/` - health check
- `POST /api/new` - create new item in Otter
- `GET /api/new?url=https://example.com` - quick create new item in Otter. Pass in a `url` query param and it will create a new item with that URL and includes its metadata too
- `GET /api/bookmarks` - returns all bookmarks
- `GET /api/search?searchTerm=zander` - search bookmarks
- `GET /api/media` - returns media items grouped by type and status
- `GET /api/media-search` - search media items
- `POST /api/toot` - A PostgreSQL trigger function calls this endpoint anytime a bookmark is created or edited which then creates a new toot on two of my Mastodon accounts ([@otterbot@botsin.space](https://botsin.space/@otterbot) & [@zander@toot.cafe](https://toot.cafe/@zander)). It only sends a toot if the bookmark has the `public` column set to `true`.
- `GET /api/scrape?url=https://example.com` - scrape a URL using Cloudflare's `HTMLRewriter`
- `POST /api/ai/title` - rewrite a page's title with AI. Uses Cloudflare Workers AI.
- `POST /api/ai/description` - rewrite a page's description with AI
- `GET /api/rss?feed=https://example.com/rss` - convert an RSS feed to JSON

### Mastodon integration

Otter has the ability to auto-toot to 2 Mastodon accounts when a new bookmark is created or edited. This is done via a PostgreSQL trigger function that calls the `/api/toot` endpoint.
The trigger function below uses an environment variable in the `Authorization` header to ensure only the owner of the Otter instance can call the endpoint.

```sql
create trigger "toot-otter-items"
after insert
or
update on bookmarks for each row
execute function supabase_functions.http_request (
  'https://{your-otter-instance}/api/toot',
  'POST',
  -- replace {OTTER_API_TOKEN} with your own token
  '{"Content-type":"application/json","Authorization":"{OTTER_API_TOKEN}"}',
  '{}',
  '1000'
);
```

TODO:

- [ ] document the PostgreSQL trigger function that calls the `/api/toot` endpoint

### Bookmarks

#### Adding new bookmark types

1. Add the new type to the types enum `ALTER TYPE type ADD VALUE '???';`
2. Run `pnpm run supabase:types:app` to update the TypeScript types
3. Add a new `case` to the `TypeToIcon` component
4. Add a new `TypeRadio` component to the `BookmarkForm` component
