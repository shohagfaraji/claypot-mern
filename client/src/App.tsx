import { Badge } from '@/components/ui/badge';

function App() {
  return (
    <div className="grid min-h-svh grid-rows-[auto_1fr_auto] px-5 sm:px-[6vw]">
      <header className="mx-auto flex w-full max-w-295 items-center justify-between border-b py-6">
        <a
          className="flex items-center gap-3 text-lg font-bold tracking-tight"
          href="/"
          aria-label="Claypot home"
        >
          <img className="size-10 object-contain" src="/brand/claypot-logo.png" alt="" />
          <span>Claypot</span>
        </a>
        <Badge
          variant="outline"
          className="hidden h-auto border-primary/25 bg-card/50 px-3 py-1.5 text-[0.68rem] font-bold tracking-widest text-primary uppercase sm:inline-flex"
        >
          In development
        </Badge>
      </header>

      <main className="mx-auto my-auto w-full max-w-295 py-16 sm:py-24">
        <p className="mb-4 text-xs font-bold tracking-[0.14em] text-primary uppercase">
          Cook · Share · Discover
        </p>
        <h1 className="max-w-195 font-serif text-5xl leading-[0.94] font-medium tracking-[-0.055em] text-foreground sm:text-7xl lg:text-8xl">
          Recipes worth passing around.
        </h1>
        <p className="mt-8 max-w-155 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          Claypot is a place to collect kitchen favourites, tell the story behind them, and discover
          what other home cooks are making.
        </p>
      </main>

      <footer className="mx-auto w-full max-w-295 border-t py-6 text-sm text-muted-foreground">
        <p className="m-0">Full-stack recipe sharing, thoughtfully made.</p>
      </footer>
    </div>
  );
}

export default App;
