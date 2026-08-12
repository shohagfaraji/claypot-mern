import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  ChefHat,
  Clock3,
  LoaderCircle,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useRecipe } from '@/features/recipes/hooks/use-recipe';
import { useSavedRecipeStatus } from '@/features/recipes/hooks/use-saved-recipe-status';
import { RecipeReviews } from '@/features/reviews/components/recipe-reviews';
import { getInitials } from '@/lib/get-initials';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/not-found-page';

function RecipeDetailSkeleton() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <Skeleton className="h-5 w-32" />
        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div className="space-y-5">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        </div>
        <div className="mt-14 grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    </AppShell>
  );
}

export function RecipeDetailPage() {
  const { slug = '' } = useParams();
  const location = useLocation();
  const { status } = useAuth();
  const { recipe, isLoading, error, isNotFound, retry } = useRecipe(slug);
  const savedStatus = useSavedRecipeStatus(
    recipe?.id ?? '',
    status === 'authenticated' && recipe !== null,
  );

  if (isLoading) {
    return <RecipeDetailSkeleton />;
  }

  if (isNotFound) {
    return <NotFoundPage />;
  }

  if (error || recipe === null) {
    return (
      <AppShell>
        <section className="mx-auto grid min-h-[68vh] w-full max-w-7xl place-items-center px-5 py-20 text-center sm:px-8 lg:px-10">
          <div>
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
              <RefreshCw className="size-6" />
            </div>
            <h1 className="mt-5 font-serif text-4xl font-medium">We could not load this recipe</h1>
            <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">{error}</p>
            <Button className="mt-7" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <article>
        <header className="border-b bg-card/45">
          <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
            <Link
              className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              to="/recipes"
            >
              <ArrowLeft className="size-4" />
              Back to recipes
            </Link>

            <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{recipe.category}</Badge>
                  <Badge variant="outline">{recipe.cuisine}</Badge>
                </div>
                <h1 className="mt-5 font-serif text-5xl leading-[0.98] font-medium tracking-[-0.05em] sm:text-6xl">
                  {recipe.title}
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  {recipe.summary}
                </p>

                <Link
                  className="mt-7 flex w-fit items-center gap-3 rounded-lg transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  to={`/cooks/${recipe.author.username}`}
                  aria-label={`View ${recipe.author.name}'s profile`}
                >
                  <div className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-primary">
                    {recipe.author.avatarUrl ? (
                      <img
                        className="size-full object-cover"
                        src={recipe.author.avatarUrl}
                        alt={recipe.author.name}
                      />
                    ) : (
                      getInitials(recipe.author.name)
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Recipe by {recipe.author.name}</p>
                    <p className="text-sm text-muted-foreground">@{recipe.author.username}</p>
                  </div>
                </Link>

                <div className="mt-6">
                  {status === 'authenticated' ? (
                    <Button
                      type="button"
                      variant={savedStatus.isSaved ? 'secondary' : 'outline'}
                      disabled={savedStatus.isLoading || savedStatus.isUpdating}
                      onClick={() => void savedStatus.toggle()}
                    >
                      {savedStatus.isLoading || savedStatus.isUpdating ? (
                        <LoaderCircle className="animate-spin" />
                      ) : savedStatus.isSaved ? (
                        <BookmarkCheck />
                      ) : (
                        <Bookmark />
                      )}
                      {savedStatus.isLoading
                        ? 'Checking collection…'
                        : savedStatus.isUpdating
                          ? savedStatus.isSaved
                            ? 'Removing…'
                            : 'Saving…'
                          : savedStatus.isSaved
                            ? 'Saved to collection'
                            : 'Save recipe'}
                    </Button>
                  ) : status === 'unauthenticated' ? (
                    <Link
                      className={buttonVariants({ variant: 'outline' })}
                      to="/login"
                      state={{
                        from: `${location.pathname}${location.search}${location.hash}`,
                      }}
                    >
                      <Bookmark />
                      Sign in to save
                    </Link>
                  ) : (
                    <Button type="button" variant="outline" disabled>
                      <LoaderCircle className="animate-spin" />
                      Checking session…
                    </Button>
                  )}

                  {savedStatus.error && (
                    <p className="mt-2 text-sm text-destructive" role="alert">
                      {savedStatus.error}
                    </p>
                  )}
                </div>

                <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-4">
                  {[
                    { icon: Clock3, label: 'Prep', value: `${recipe.prepTimeMinutes} min` },
                    { icon: Clock3, label: 'Cook', value: `${recipe.cookTimeMinutes} min` },
                    { icon: Users, label: 'Serves', value: String(recipe.servings) },
                    { icon: ChefHat, label: 'Level', value: recipe.difficulty },
                  ].map((item) => (
                    <div key={item.label} className="bg-background p-4">
                      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <item.icon className="size-3.5 text-primary" />
                        {item.label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold capitalize">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-[radial-gradient(circle_at_72%_24%,color-mix(in_oklch,var(--accent),white_14%),transparent_32%),linear-gradient(145deg,var(--secondary),color-mix(in_oklch,var(--accent),white_48%))] shadow-2xl shadow-primary/10">
                {recipe.imageUrl ? (
                  <img
                    className="size-full object-cover"
                    src={recipe.imageUrl}
                    alt={recipe.title}
                  />
                ) : (
                  <div className="grid size-full place-items-center" aria-hidden="true">
                    <div className="absolute inset-12 rounded-full border border-primary/15" />
                    <img
                      className="w-[45%] opacity-80 drop-shadow-[0_18px_24px_color-mix(in_oklch,var(--primary),transparent_76%)]"
                      src="/brand/claypot-logo.png"
                      alt=""
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[0.72fr_1.28fr] lg:px-10">
          <aside>
            <div className="rounded-2xl border bg-card p-6 shadow-sm lg:sticky lg:top-24">
              <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">Ingredients</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Everything you need to get started.
              </p>
              <ul className="mt-6 divide-y">
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={`${ingredient.name}-${index}`}
                    className="flex items-start justify-between gap-5 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="font-medium">{ingredient.name}</span>
                    <span className="shrink-0 text-sm text-muted-foreground">
                      {ingredient.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <section>
            <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">Method</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Follow each step in order for the best result.
            </p>
            <ol className="mt-7 space-y-7">
              {recipe.instructions.map((instruction) => (
                <li key={instruction.step} className="grid grid-cols-[2.75rem_1fr] gap-4">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary font-serif text-lg font-semibold text-primary-foreground">
                    {instruction.step}
                  </span>
                  <div className="border-b pb-7">
                    <h3 className="font-semibold">Step {instruction.step}</h3>
                    <p className="mt-2 leading-7 text-muted-foreground">
                      {instruction.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {recipe.tags.length > 0 && (
              <div className="mt-10 border-t pt-6">
                <p className="text-sm font-semibold">Filed under</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {recipe.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Link
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'mt-10')}
              to="/recipes"
            >
              <ArrowLeft />
              Discover more recipes
            </Link>
          </section>
        </div>
        <RecipeReviews recipeId={recipe.id} authorId={recipe.author.id} />
      </article>
    </AppShell>
  );
}
