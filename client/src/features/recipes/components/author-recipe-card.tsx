import { CalendarDays, Clock3, ExternalLink, LoaderCircle, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { AuthorRecipeListItem } from '@/features/recipes/types';
import { cn } from '@/lib/utils';

interface AuthorRecipeCardProps {
  recipe: AuthorRecipeListItem;
  isPublishing: boolean;
  onPublish: (recipeId: string) => void;
}

const dateFormatter = new Intl.DateTimeFormat('en', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function AuthorRecipeCard({ recipe, isPublishing, onPublish }: AuthorRecipeCardProps) {
  return (
    <Card className="gap-0 overflow-hidden border-border/70 py-0 shadow-sm">
      <div className="relative aspect-[16/9] overflow-hidden bg-[radial-gradient(circle_at_72%_24%,color-mix(in_oklch,var(--accent),white_14%),transparent_32%),linear-gradient(145deg,var(--secondary),color-mix(in_oklch,var(--accent),white_48%))]">
        {recipe.imageUrl ? (
          <img className="size-full object-cover" src={recipe.imageUrl} alt={recipe.title} />
        ) : (
          <div className="grid size-full place-items-center" aria-hidden="true">
            <div className="absolute inset-8 rounded-full border border-primary/12" />
            <img className="w-[35%] opacity-75" src="/brand/claypot-logo.png" alt="" />
          </div>
        )}
        <Badge
          className="absolute top-4 left-4 capitalize shadow-sm"
          variant={recipe.status === 'published' ? 'default' : 'secondary'}
        >
          {recipe.status}
        </Badge>
      </div>

      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span>{recipe.category}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" />
            {recipe.totalTimeMinutes} min
          </span>
        </div>
        <h2 className="mt-3 font-serif text-2xl leading-tight font-medium tracking-[-0.025em]">
          {recipe.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
          {recipe.summary}
        </p>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          Updated {dateFormatter.format(new Date(recipe.updatedAt))}
        </p>

        <div className="mt-5 border-t pt-4">
          {recipe.status === 'published' ? (
            <Link
              className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
              to={`/recipes/${recipe.slug}`}
            >
              <ExternalLink />
              View published recipe
            </Link>
          ) : (
            <Button className="w-full" disabled={isPublishing} onClick={() => onPublish(recipe.id)}>
              {isPublishing ? <LoaderCircle className="animate-spin" /> : <Send />}
              {isPublishing ? 'Publishing…' : 'Publish recipe'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
