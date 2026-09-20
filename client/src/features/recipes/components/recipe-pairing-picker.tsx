import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecipes } from '@/features/recipes/hooks/use-recipes';
import { pairingLabels, type PairedRecipe, type RecipePairing } from '@/features/recipes/types';

interface Props {
  value: RecipePairing[];
  onChange: (value: RecipePairing[]) => void;
  currentRecipeId?: string | undefined;
  initialRecipes: PairedRecipe[];
  disabled: boolean;
}

export function RecipePairingPicker({
  value,
  onChange,
  currentRecipeId,
  initialRecipes,
  disabled,
}: Props) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [titles, setTitles] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialRecipes.map((recipe) => [recipe.id, recipe.title])),
  );
  const results = useRecipes(
    new URLSearchParams({ search: query, page: String(page), limit: '6' }).toString(),
  );
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="font-serif text-2xl font-medium">Recipe pairings</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Optional: choose up to six published recipes to serve with this dish or recommend to
            readers.
          </p>
        </div>
        <fieldset disabled={disabled} className="min-w-0 space-y-5">
          <legend className="sr-only">Choose recipe pairings</legend>
          {value.length > 0 && (
            <ul className="space-y-3">
              {value.map((pairing) => (
                <li key={pairing.recipeId} className="space-y-3 rounded-xl border p-3">
                  <p className="text-sm font-medium">
                    {titles[pairing.recipeId] ?? 'Unavailable recipe — remove this selection'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Select
                      value={pairing.label}
                      disabled={disabled}
                      onValueChange={(label) => {
                        if (label)
                          onChange(
                            value.map((item) =>
                              item.recipeId === pairing.recipeId
                                ? { ...item, label: label as RecipePairing['label'] }
                                : item,
                            ),
                          );
                      }}
                    >
                      <SelectTrigger
                        aria-label={`Pairing type for ${titles[pairing.recipeId] ?? 'unavailable recipe'}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pairingLabels.map((label) => (
                          <SelectItem key={label} value={label}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={disabled}
                      aria-label={`Remove pairing ${titles[pairing.recipeId] ?? 'unavailable recipe'}`}
                      onClick={() =>
                        onChange(value.filter((item) => item.recipeId !== pairing.recipeId))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            <Label htmlFor="pairing-search">Find a recipe to pair</Label>
            <div className="flex gap-2">
              <Input
                id="pairing-search"
                value={search}
                maxLength={100}
                placeholder="Search for naan, rice, or a salad"
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    setQuery(search.trim());
                    setPage(1);
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery(search.trim());
                  setPage(1);
                }}
              >
                Search
              </Button>
            </div>
          </div>
          <div aria-live="polite">
            {results.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading recipes…</p>
            ) : results.error ? (
              <div role="alert">
                <p className="text-sm text-destructive">{results.error}</p>
                <Button type="button" variant="outline" onClick={results.retry}>
                  Try again
                </Button>
              </div>
            ) : (
              <>
                {results.recipes.filter((recipe) => recipe.id !== currentRecipeId).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No matching recipes on this page. Try another search.
                  </p>
                )}
                <ul className="divide-y">
                  {results.recipes
                    .filter((recipe) => recipe.id !== currentRecipeId)
                    .map((recipe) => {
                      const selected = value.some((item) => item.recipeId === recipe.id);
                      return (
                        <li
                          key={recipe.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium break-words">{recipe.title}</p>
                            <p className="text-xs text-muted-foreground">
                              By {recipe.author.name} · {recipe.category}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={disabled || selected || value.length >= 6}
                            aria-label={`Add pairing ${recipe.title}`}
                            onClick={() => {
                              setTitles((current) => ({ ...current, [recipe.id]: recipe.title }));
                              onChange([...value, { recipeId: recipe.id, label: 'Side dish' }]);
                            }}
                          >
                            {selected ? 'Added' : 'Add'}
                          </Button>
                        </li>
                      );
                    })}
                </ul>
                {results.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-2 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Page {page} of {results.pagination.totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={page >= results.pagination.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </fieldset>
      </CardContent>
    </Card>
  );
}
