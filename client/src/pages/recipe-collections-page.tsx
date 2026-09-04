import { ArrowRight, Bookmark, FolderHeart, FolderPlus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionFormDialog } from '@/features/collections/components/collection-form-dialog';
import { useRecipeCollections } from '@/features/collections/hooks/use-recipe-collections';
import { cn } from '@/lib/utils';

const dateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

function CollectionCardSkeleton() {
  return (
    <Card>
      <CardContent>
        <Skeleton className="size-11 rounded-xl" />
        <Skeleton className="mt-5 h-7 w-3/5" />
        <Skeleton className="mt-3 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
        <Skeleton className="mt-6 h-4 w-2/5" />
      </CardContent>
    </Card>
  );
}

export function RecipeCollectionsPage() {
  const collections = useRecipeCollections();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-7 px-5 py-12 sm:px-8 sm:py-16 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-primary uppercase">
              <FolderHeart className="size-4" />
              Your recipe library
            </p>
            <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
              Recipe collections
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Keep every saved recipe together, then arrange favorites into private collections
              built around the way you cook.
            </p>
          </div>
          <Button
            className="shrink-0"
            type="button"
            disabled={collections.collections.length >= 30}
            onClick={() => setCreateOpen(true)}
          >
            <FolderPlus />
            {collections.collections.length >= 30 ? 'Collection limit reached' : 'New collection'}
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-primary/20 bg-primary/4 shadow-sm">
            <CardContent className="flex h-full flex-col">
              <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <Bookmark className="size-5" />
              </div>
              <h2 className="mt-5 font-serif text-2xl font-medium">All saved recipes</h2>
              <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                Browse every recipe you have saved, including recipes not assigned to a custom
                collection.
              </p>
              <Link
                className={cn(buttonVariants({ variant: 'outline' }), 'mt-6 w-fit')}
                to="/saved-recipes"
              >
                Browse saved recipes
                <ArrowRight />
              </Link>
            </CardContent>
          </Card>

          {collections.isLoading ? (
            Array.from({ length: 5 }, (_, index) => <CollectionCardSkeleton key={index} />)
          ) : collections.error ? (
            <Card className="md:col-span-2">
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <RefreshCw className="size-6 text-destructive" />
                <h2 className="mt-4 font-serif text-2xl font-medium">Collections could not load</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {collections.error}
                </p>
                <Button className="mt-5" variant="outline" onClick={collections.retry}>
                  <RefreshCw />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : collections.collections.length === 0 ? (
            <Card className="border-dashed md:col-span-2">
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <FolderPlus className="size-7 text-primary" />
                <h2 className="mt-4 font-serif text-2xl font-medium">
                  Create your first collection
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Build collections for weeknight meals, celebrations, cuisines, or anything else
                  that fits your kitchen.
                </p>
                <Button className="mt-5" onClick={() => setCreateOpen(true)}>
                  <FolderPlus />
                  New collection
                </Button>
              </CardContent>
            </Card>
          ) : (
            collections.collections.map((collection) => (
              <Card key={collection.id} className="shadow-sm transition hover:-translate-y-0.5">
                <CardContent className="flex h-full flex-col">
                  <div className="grid size-11 place-items-center rounded-xl bg-secondary text-primary">
                    <FolderHeart className="size-5" />
                  </div>
                  <h2 className="mt-5 font-serif text-2xl font-medium">{collection.name}</h2>
                  <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                    {collection.description ?? 'A private collection from your saved recipes.'}
                  </p>
                  <div className="mt-5 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span>
                      {collection.recipeCount} {collection.recipeCount === 1 ? 'recipe' : 'recipes'}
                    </span>
                    <span>Updated {dateFormatter.format(new Date(collection.updatedAt))}</span>
                  </div>
                  <Link
                    className={cn(buttonVariants({ variant: 'outline' }), 'mt-5 w-fit')}
                    to={`/collections/${collection.id}`}
                  >
                    Open collection
                    <ArrowRight />
                  </Link>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>

      {createOpen && (
        <CollectionFormDialog
          open
          onOpenChange={setCreateOpen}
          onSaved={() => collections.retry()}
        />
      )}
    </AppShell>
  );
}
