import { ChefHat, RefreshCw, Search, SlidersHorizontal } from 'lucide-react';
import type { SubmitEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CookCard } from '@/features/discovery/components/cook-card';
import { useCooks } from '@/features/discovery/hooks/use-cooks';

const sortOptions = ['popular', 'newest', 'name'] as const;

function getPage(value: string | null) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function CookCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex gap-4">
        <Skeleton className="size-16 shrink-0 rounded-2xl" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-2/5" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      </CardContent>
      <CardContent className="flex gap-5">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-24" />
      </CardContent>
    </Card>
  );
}

export function CooksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search')?.trim() ?? '';
  const sortParam = searchParams.get('sort');
  const sort = sortOptions.find((option) => option === sortParam) ?? 'popular';
  const page = getPage(searchParams.get('page'));
  const query = new URLSearchParams({ page: String(page), limit: '12', sort });
  if (search) query.set('search', search);

  const cooks = useCooks(query.toString());
  const hasFilters = search.length > 0 || sort !== 'popular';

  function updateFilter(name: string, value: string | null) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(name, value);
      else next.delete(name);
      next.delete('page');
      return next;
    });
  }

  function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const value = String(formData.get('search') ?? '').trim();
    updateFilter('search', value || null);
  }

  function goToPage(nextPage: number) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('page', String(nextPage));
      return next;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-18 lg:px-10">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
            Cook directory
          </p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
            Meet the cooks behind the dishes
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Find home cooks, explore their published recipes, and follow the people whose cooking
            inspires you.
          </p>
          <Link className={`${buttonVariants({ variant: 'outline' })} mt-6`} to="/recipes">
            Explore recipes
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <SlidersHorizontal className="size-4 text-primary" />
              Search and sort cooks
            </div>
            {hasFilters && (
              <Button type="button" variant="ghost" size="sm" onClick={() => setSearchParams({})}>
                Clear filters
              </Button>
            )}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_14rem]">
            <form key={search} className="relative flex gap-2" onSubmit={handleSearch}>
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-10 pl-9"
                type="search"
                name="search"
                defaultValue={search}
                maxLength={80}
                placeholder="Search by name, username, or bio"
                aria-label="Search cooks"
              />
              <Button className="h-10 px-4" type="submit">
                Search
              </Button>
            </form>
            <Select value={sort} onValueChange={(value) => updateFilter('sort', value)}>
              <SelectTrigger className="h-10 w-full" aria-label="Sort cooks">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popular">Most followed</SelectItem>
                <SelectItem value="newest">Newest cooks</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">
              {cooks.isLoading
                ? 'Finding cooks…'
                : `${cooks.pagination.total} ${cooks.pagination.total === 1 ? 'cook' : 'cooks'} found`}
            </p>
            {hasFilters && !cooks.isLoading && (
              <p className="mt-1 text-sm text-muted-foreground">
                Results reflect your current search and sorting.
              </p>
            )}
          </div>
          {cooks.pagination.totalPages > 0 && (
            <p className="text-sm text-muted-foreground">
              Page {cooks.pagination.page} of {cooks.pagination.totalPages}
            </p>
          )}
        </div>

        <div className="mt-5">
          {cooks.isLoading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <CookCardSkeleton key={index} />
              ))}
            </div>
          ) : cooks.error ? (
            <Card className="border-destructive/25 bg-destructive/5">
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <RefreshCw className="size-7 text-destructive" />
                <h2 className="mt-4 font-serif text-2xl font-medium">Cooks could not load</h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {cooks.error}
                </p>
                <Button className="mt-5" variant="outline" onClick={cooks.retry}>
                  <RefreshCw />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : cooks.cooks.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
                <ChefHat className="size-8 text-muted-foreground" />
                <h2 className="mt-4 font-serif text-2xl font-medium">
                  {hasFilters ? 'No cooks match your search' : 'No cooks to discover yet'}
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  {hasFilters
                    ? 'Try a different search or reset the sorting.'
                    : 'Cooks with published recipes will appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {cooks.cooks.map((cook) => (
                <CookCard key={cook.id} cook={cook} />
              ))}
            </div>
          )}
        </div>

        {!cooks.isLoading && !cooks.error && cooks.pagination.totalPages > 1 && (
          <nav className="mt-10 flex justify-center gap-3" aria-label="Cook pages">
            <Button variant="outline" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= cooks.pagination.totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </nav>
        )}
      </section>
    </AppShell>
  );
}
