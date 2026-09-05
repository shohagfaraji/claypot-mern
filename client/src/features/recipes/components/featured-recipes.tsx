import { RecipeGrid } from '@/features/recipes/components/recipe-grid';
import { useRecipes } from '@/features/recipes/hooks/use-recipes';

export function FeaturedRecipes() {
  const { recipes, isLoading, error, retry } = useRecipes('limit=3&sort=popular');

  return (
    <div className="mt-10">
      <RecipeGrid
        recipes={recipes}
        isLoading={isLoading}
        error={error}
        onRetry={retry}
        emptyTitle="The first dish is still cooking"
        emptyDescription="Published recipes will appear here as soon as they are ready to share."
        skeletonCount={3}
      />
    </div>
  );
}
