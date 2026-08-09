import { ChefHat, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RecipeCard } from '@/features/recipes/components/recipe-card';
import { useFeaturedRecipes } from '@/features/recipes/hooks/use-featured-recipes';

function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <div className="space-y-4 p-6">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-7 w-4/5" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex items-center gap-3 border-t pt-4">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeaturedRecipes() {
  const { recipes, isLoading, error, retry } = useFeaturedRecipes();

  if (isLoading) {
    return (
      <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Loading recipes">
        {Array.from({ length: 3 }, (_, index) => (
          <RecipeCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/45 px-6 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
          <RefreshCw className="size-5" />
        </div>
        <h3 className="mt-4 font-serif text-2xl font-medium">We could not load the recipes</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{error}</p>
        <Button className="mt-5" variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="mt-10 flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed bg-card/45 px-6 text-center">
        <div className="grid size-12 place-items-center rounded-full bg-secondary text-primary">
          <ChefHat className="size-5" />
        </div>
        <h3 className="mt-4 font-serif text-2xl font-medium">The first dish is still cooking</h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          Published recipes will appear here as soon as they are ready to share.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
