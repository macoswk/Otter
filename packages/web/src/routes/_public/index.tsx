import {
  BookmarkSimpleIcon,
  BrainIcon,
  BrowserIcon,
  DeviceMobileIcon,
  FilmStripIcon,
  GlobeIcon,
  LockIcon,
  MagnifyingGlassIcon,
  MoonStarsIcon,
  PlugIcon,
  RssIcon,
  TagIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/Button'
import { Flex } from '@/components/Flex'
import { Link } from '@/components/Link'
import { useSession } from '../../components/AuthProvider'
import { CONTENT, ROUTE_HOME, ROUTE_SIGNIN } from '../../constants'

export const Route = createFileRoute('/_public/')({
  component: Index,
  loader: async ({ context }) => {
    if (context.session !== null) {
      throw redirect({ to: ROUTE_HOME })
    }
  },
})

const features = [
  {
    description: 'Save links, articles, videos, and more with rich metadata.',
    icon: BookmarkSimpleIcon,
    title: 'Bookmarking',
  },
  {
    description: 'Organise with tags, collections, stars, and filters.',
    icon: TagIcon,
    title: 'Tags & Collections',
  },
  {
    description: 'Full-text search across all your saved items.',
    icon: MagnifyingGlassIcon,
    title: 'Search',
  },
  {
    description: 'Kanban board for tracking movies, TV shows, games, and more.',
    icon: FilmStripIcon,
    title: 'Media Tracking',
  },
  {
    description: 'Rewrite titles and descriptions with Cloudflare Workers AI.',
    icon: BrainIcon,
    title: 'AI-Powered',
  },
  {
    description: 'Parse RSS feeds and scrape metadata from any URL.',
    icon: RssIcon,
    title: 'RSS & Scraping',
  },
  {
    description: 'Back up your own toots and favourite toots.',
    icon: GlobeIcon,
    title: 'Mastodon Integration',
  },
  {
    description:
      'Native iOS and macOS app with share extension for quickly saving bookmarks.',
    icon: DeviceMobileIcon,
    title: 'Native iOS App',
  },
  {
    description:
      'Browser extensions for Chrome and Firefox, Raycast extension, and bookmarklet.',
    icon: BrowserIcon,
    title: 'Extensions',
  },
  {
    description: 'Automatic colour mode that follows your system preference.',
    icon: MoonStarsIcon,
    title: 'Dark & Light Mode',
  },
  {
    description: 'Integrate with AI assistants via the Model Context Protocol.',
    icon: PlugIcon,
    title: 'MCP Server',
  },
  {
    description:
      'Your data stays yours. Self-host on Cloudflare Workers and Supabase.',
    icon: LockIcon,
    title: 'Private & Self-Hosted',
  },
]

function Index() {
  const navigate = useNavigate()
  const session = useSession()

  if (session) {
    navigate({ to: ROUTE_HOME })
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-3xl text-center px-s">
        <img
          src="/otter-logo.svg"
          width="90"
          height="90"
          className="mx-auto"
          alt="Otter logo"
        />
        <h1 className="mt-m">{CONTENT.appName}</h1>
        <p className="mt-s text-step-1 text-[var(--text)] max-w-[50ch] mx-auto text-balance">
          A self-hosted bookmark manager and media tracker built for people who
          value privacy and ownership.
        </p>
        <Flex
          align="center"
          justify="center"
          gap="s"
          className="mt-m"
          wrap="wrap"
        >
          <Button asChild>
            <a href={ROUTE_SIGNIN}>
              <UserCircleIcon weight="duotone" width="20" height="20" />
              {CONTENT.signInTitle}
            </a>
          </Button>
          <Button asChild variant="outline">
            <a
              href="https://github.com/mrmartineau/Otter"
              target="_blank"
              rel="noopener noreferrer"
            >
              View on GitHub
            </a>
          </Button>
        </Flex>
      </section>

      {/* Features */}
      <section className="max-w-[1000px] mx-auto px-s pb-3xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-m">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-[var(--border)] bg-[var(--theme2)] p-m"
            >
              <feature.icon
                weight="duotone"
                width="28"
                height="28"
                className="text-[var(--accent9)] mb-xs"
              />
              <h3 className="text-step-0 mb-3xs">{feature.title}</h3>
              <p className="text-step--1 text-[var(--text)]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center pb-l px-s text-step--1 text-[var(--text)]">
        <Flex align="center" justify="center" gap="s" wrap="wrap">
          <span>
            Made by{' '}
            <a href="https://zander.wtf" className="underline">
              Zander Martineau
            </a>
          </span>
          <span>·</span>
          <Link href="/privacy" className="underline">
            Privacy Policy
          </Link>
          <span>·</span>
          <Link href="/terms" className="underline">
            Terms of Service
          </Link>
        </Flex>
      </footer>
    </div>
  )
}
