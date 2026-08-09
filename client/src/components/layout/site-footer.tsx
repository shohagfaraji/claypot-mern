const footerLinks = [
  { label: 'Discover', href: '/#discover' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Our story', href: '/#our-story' },
];

export function SiteFooter() {
  return (
    <footer id="our-story" className="border-t bg-card/45">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1fr_auto] md:items-end lg:px-10">
        <div>
          <Link
            className="inline-flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/"
            aria-label="Claypot home"
          >
            <img className="size-9 object-contain" src="/brand/claypot-logo.png" alt="" />
            <span className="text-lg font-bold tracking-[-0.035em]">Claypot</span>
          </Link>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            A welcoming place for home cooks to preserve recipes, share their stories, and find
            something worth making.
          </p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm" aria-label="Footer navigation">
          {footerLinks.map((item) => (
            <a
              key={item.href}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="border-t pt-5 text-xs text-muted-foreground md:col-span-2 md:flex md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} Claypot. Made for people who love to cook.</p>
          <p className="mt-2 md:mt-0">Cook · Share · Discover</p>
        </div>
      </div>
    </footer>
  );
}
import { Link } from 'react-router-dom';
