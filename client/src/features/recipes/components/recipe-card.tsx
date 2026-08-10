import { Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { RecipeListItem } from '@/features/recipes/types';
import { getInitials } from '@/lib/get-initials';

interface RecipeCardProps {
  recipe: RecipeListItem;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Card className="group gap-0 overflow-hidden border-border/70 py-0 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/8">
      <Link
        className="relative block aspect-[4/3] overflow-hidden bg-[radial-gradient(circle_at_72%_24%,color-mix(in_oklch,var(--accent),white_14%),transparent_32%),linear-gradient(145deg,var(--secondary),color-mix(in_oklch,var(--accent),white_48%))] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
        to={`/recipes/${recipe.slug}`}
        aria-label={`View ${recipe.title}`}
      >
        {recipe.imageUrl ? (
          <img
            className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
            src={recipe.imageUrl}
            alt={recipe.title}
          />
        ) : (
          <div className="grid size-full place-items-center" aria-hidden="true">
            <div className="absolute inset-8 rounded-full border border-primary/12" />
            <img
              className="w-[42%] opacity-75 drop-shadow-[0_16px_20px_color-mix(in_oklch,var(--primary),transparent_78%)] transition duration-500 group-hover:scale-105 group-hover:rotate-2"
              src="/brand/claypot-logo.png"
              alt=""
            />
          </div>
        )}
        <Badge className="absolute top-4 left-4 bg-card/90 text-foreground shadow-sm backdrop-blur-sm">
          {recipe.category}
        </Badge>
      </Link>

      <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{recipe.cuisine}</span>
          <span aria-hidden="true">·</span>
          <span className="capitalize">{recipe.difficulty}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {recipe.totalTimeMinutes} min
          </span>
        </div>

        <h3 className="mt-3 font-serif text-2xl leading-tight font-medium tracking-[-0.025em]">
          <Link
            className="rounded-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to={`/recipes/${recipe.slug}`}
          >
            {recipe.title}
          </Link>
        </h3>
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {recipe.summary}
        </p>

        <div className="mt-6 flex items-center gap-3 border-t pt-4">
          <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-bold text-primary">
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
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{recipe.author.name}</p>
            <p className="truncate text-xs text-muted-foreground">@{recipe.author.username}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
