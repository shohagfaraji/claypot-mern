import { Badge } from '@/components/ui/badge';
import { AppShell } from '@/components/layout/app-shell';
import { ArrowRight, BookOpen, Heart, Users } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { FeaturedRecipes } from '@/features/recipes/components/featured-recipes';
import { cn } from '@/lib/utils';

function App() {
  return (
    <AppShell>
      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 -z-10 h-120 bg-[radial-gradient(circle_at_78%_22%,color-mix(in_oklch,var(--accent),transparent_35%),transparent_34%),radial-gradient(circle_at_18%_12%,color-mix(in_oklch,var(--secondary),transparent_20%),transparent_30%)]" />
        <div className="mx-auto grid w-full max-w-7xl gap-14 px-5 py-18 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:py-28">
          <div>
            <Badge
              variant="outline"
              className="h-auto border-primary/25 bg-card/70 px-3 py-1.5 text-[0.68rem] font-bold tracking-widest text-primary uppercase shadow-sm"
            >
              Cook · Share · Discover
            </Badge>
            <h1 className="mt-6 max-w-190 font-serif text-5xl leading-[0.95] font-medium tracking-[-0.055em] text-foreground sm:text-7xl lg:text-[5.4rem]">
              Recipes worth passing around.
            </h1>
            <p className="mt-7 max-w-155 text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              Preserve kitchen favourites, tell the story behind every dish, and discover what home
              cooks are making around the table.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-11 px-5 text-base shadow-md shadow-primary/15',
                )}
                href="#discover"
              >
                Explore recipes
                <ArrowRight />
              </a>
              <a
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-11 px-5 text-base',
                )}
                href="#how-it-works"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-120" aria-hidden="true">
            <div className="absolute inset-6 rounded-full border border-primary/15 bg-card/80 shadow-2xl shadow-primary/10" />
            <div className="absolute inset-14 rounded-full border border-dashed border-primary/25" />
            <div className="absolute inset-0 grid place-items-center">
              <img
                className="w-[68%] drop-shadow-[0_22px_30px_color-mix(in_oklch,var(--primary),transparent_72%)]"
                src="/brand/claypot-logo.png"
                alt=""
              />
            </div>
            <div className="absolute top-[12%] right-[4%] rounded-2xl border bg-card px-4 py-3 shadow-lg">
              <p className="text-xs font-semibold text-muted-foreground">Made with care</p>
              <p className="mt-0.5 font-serif text-lg">From real kitchens</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-y bg-card/45">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 sm:px-8 lg:px-10">
          {[
            { icon: BookOpen, value: 'Keep', label: 'Your trusted recipes together' },
            { icon: Heart, value: 'Share', label: 'Food and the stories behind it' },
            { icon: Users, value: 'Discover', label: 'Ideas from fellow home cooks' },
          ].map((item) => (
            <div key={item.value} className="flex items-center gap-4 sm:justify-center">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <item.icon className="size-5" />
              </div>
              <div>
                <p className="font-serif text-xl font-medium">{item.value}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="discover"
        className="mx-auto w-full max-w-7xl px-5 py-18 sm:px-8 sm:py-24 lg:px-10"
      >
        <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
          Fresh from Claypot
        </p>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-4xl font-medium tracking-[-0.035em] sm:text-5xl">
              Discover something delicious
            </h2>
            <p className="mt-3 max-w-150 leading-7 text-muted-foreground">
              Find comforting favourites, quick weeknight ideas, and dishes worth sharing with the
              people around your table.
            </p>
          </div>
        </div>
        <FeaturedRecipes />
      </section>
    </AppShell>
  );
}

export default App;
