import { ArrowLeft, Clock3, LoaderCircle, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AppShell } from '@/components/layout/app-shell';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { createRecipe } from '@/features/recipes/api/create-recipe';
import { updateRecipe } from '@/features/recipes/api/update-recipe';
import { useAuthorRecipe } from '@/features/recipes/hooks/use-author-recipe';
import type {
  AuthorRecipeDetail,
  CreateRecipeInput,
  RecipeDifficulty,
} from '@/features/recipes/types';
import { cn } from '@/lib/utils';
import { NotFoundPage } from '@/pages/not-found-page';

interface IngredientField {
  id: string;
  name: string;
  quantity: string;
}

interface InstructionField {
  id: string;
  description: string;
}

function createIngredient(): IngredientField {
  return { id: crypto.randomUUID(), name: '', quantity: '' };
}

function createInstruction(): InstructionField {
  return { id: crypto.randomUUID(), description: '' };
}

interface RecipeFormProps {
  recipe: AuthorRecipeDetail | null;
}

function RecipeForm({ recipe }: RecipeFormProps) {
  const navigate = useNavigate();
  const request = useAuthenticatedRequest();
  const [ingredients, setIngredients] = useState<IngredientField[]>(() =>
    recipe
      ? recipe.ingredients.map((ingredient) => ({ ...ingredient, id: crypto.randomUUID() }))
      : [createIngredient()],
  );
  const [instructions, setInstructions] = useState<InstructionField[]>(() =>
    recipe
      ? recipe.instructions.map((instruction) => ({
          id: crypto.randomUUID(),
          description: instruction.description,
        }))
      : [createInstruction()],
  );
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>(recipe?.difficulty ?? 'easy');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = recipe !== null;

  function updateIngredient(id: string, field: 'name' | 'quantity', value: string) {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.id === id ? { ...ingredient, [field]: value } : ingredient,
      ),
    );
  }

  function updateInstruction(id: string, description: string) {
    setInstructions((current) =>
      current.map((instruction) =>
        instruction.id === id ? { ...instruction, description } : instruction,
      ),
    );
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const imageUrl = String(formData.get('imageUrl') ?? '').trim();
    const tags = [
      ...new Set(
        String(formData.get('tags') ?? '')
          .split(',')
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];

    if (tags.length > 10 || tags.some((tag) => tag.length > 30)) {
      setError('Add no more than 10 tags, with at most 30 characters in each tag.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const input: CreateRecipeInput = {
        title: String(formData.get('title') ?? '').trim(),
        summary: String(formData.get('summary') ?? '').trim(),
        ...(imageUrl ? { imageUrl } : {}),
        ingredients: ingredients.map(({ name, quantity }) => ({
          name: name.trim(),
          quantity: quantity.trim(),
        })),
        instructions: instructions.map(({ description }) => ({
          description: description.trim(),
        })),
        prepTimeMinutes: Number(formData.get('prepTimeMinutes')),
        cookTimeMinutes: Number(formData.get('cookTimeMinutes')),
        servings: Number(formData.get('servings')),
        difficulty,
        cuisine: String(formData.get('cuisine') ?? '').trim(),
        category: String(formData.get('category') ?? '').trim(),
        tags,
      };

      if (recipe) await updateRecipe(request, recipe.id, input);
      else await createRecipe(request, input);

      navigate('/my-recipes', {
        replace: true,
        state: isEditing ? { recipeUpdated: true } : { recipeCreated: true },
      });
    } catch (saveRecipeError) {
      setError(
        saveRecipeError instanceof Error
          ? saveRecipeError.message
          : 'The recipe could not be saved.',
      );
      setIsSubmitting(false);
    }
  }

  return (
    <AppShell>
      <section className="border-b bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 sm:py-14 lg:px-10">
          <Link
            className="inline-flex items-center gap-2 rounded-md text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            to="/my-recipes"
          >
            <ArrowLeft className="size-4" />
            Back to my recipes
          </Link>
          <p className="mt-7 text-xs font-bold tracking-[0.14em] text-primary uppercase">
            {isEditing ? 'Edit recipe' : 'New recipe'}
          </p>
          <h1 className="mt-3 font-serif text-5xl font-medium tracking-[-0.045em] sm:text-6xl">
            {isEditing ? 'Refine your recipe' : 'Add something delicious'}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {isEditing
              ? recipe.status === 'published'
                ? 'Update the details carefully. Saved changes will appear on the published recipe immediately.'
                : 'Update the ingredients, timings, and steps while this recipe remains a private draft.'
              : 'Capture the ingredients, timings, and steps now. Your recipe will remain a private draft until you choose to publish it.'}
          </p>
        </div>
      </section>

      <form
        className="mx-auto grid w-full max-w-7xl gap-6 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_0.68fr] lg:items-start lg:px-10"
        onSubmit={handleSubmit}
      >
        <div className="space-y-6">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6 sm:p-8">
              <div>
                <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">The basics</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Give your recipe a clear name and a short introduction.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Recipe title</Label>
                <Input
                  id="title"
                  className="h-11"
                  name="title"
                  defaultValue={recipe?.title}
                  minLength={3}
                  maxLength={120}
                  placeholder="Spiced claypot rice"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="summary">Short description</Label>
                <Textarea
                  id="summary"
                  className="min-h-28 resize-y"
                  name="summary"
                  defaultValue={recipe?.summary}
                  minLength={10}
                  maxLength={300}
                  placeholder="What makes this recipe worth cooking?"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">Up to 300 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  className="h-11"
                  name="imageUrl"
                  type="url"
                  defaultValue={recipe?.imageUrl ?? ''}
                  maxLength={2048}
                  placeholder="https://example.com/recipe.jpg"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Optional. A Claypot-branded placeholder is used when no image is provided.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">
                    Ingredients
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    List each ingredient with its quantity.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={ingredients.length >= 50 || isSubmitting}
                  onClick={() => setIngredients((current) => [...current, createIngredient()])}
                >
                  <Plus />
                  Add
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                {ingredients.map((ingredient, index) => (
                  <div
                    key={ingredient.id}
                    className="grid gap-3 rounded-xl border bg-muted/25 p-4 sm:grid-cols-[1fr_0.55fr_auto] sm:items-end"
                  >
                    <div className="space-y-2">
                      <Label htmlFor={`ingredient-name-${ingredient.id}`}>
                        Ingredient {index + 1}
                      </Label>
                      <Input
                        id={`ingredient-name-${ingredient.id}`}
                        value={ingredient.name}
                        minLength={1}
                        maxLength={100}
                        placeholder="Basmati rice"
                        required
                        disabled={isSubmitting}
                        onChange={(event) =>
                          updateIngredient(ingredient.id, 'name', event.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`ingredient-quantity-${ingredient.id}`}>Quantity</Label>
                      <Input
                        id={`ingredient-quantity-${ingredient.id}`}
                        value={ingredient.quantity}
                        minLength={1}
                        maxLength={50}
                        placeholder="2 cups"
                        required
                        disabled={isSubmitting}
                        onChange={(event) =>
                          updateIngredient(ingredient.id, 'quantity', event.target.value)
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ingredient ${index + 1}`}
                      disabled={ingredients.length === 1 || isSubmitting}
                      onClick={() =>
                        setIngredients((current) =>
                          current.filter((item) => item.id !== ingredient.id),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-3xl font-medium tracking-[-0.03em]">Method</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Break the cooking process into clear steps.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={instructions.length >= 50 || isSubmitting}
                  onClick={() => setInstructions((current) => [...current, createInstruction()])}
                >
                  <Plus />
                  Add step
                </Button>
              </div>

              <div className="mt-6 space-y-4">
                {instructions.map((instruction, index) => (
                  <div
                    key={instruction.id}
                    className="grid grid-cols-[2.5rem_1fr_auto] gap-3 rounded-xl border bg-muted/25 p-4"
                  >
                    <span className="grid size-10 place-items-center rounded-lg bg-primary font-serif font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <div className="space-y-2">
                      <Label className="sr-only" htmlFor={`instruction-${instruction.id}`}>
                        Step {index + 1}
                      </Label>
                      <Textarea
                        id={`instruction-${instruction.id}`}
                        className="min-h-24 resize-y bg-background"
                        value={instruction.description}
                        minLength={3}
                        maxLength={500}
                        placeholder="Describe this step"
                        required
                        disabled={isSubmitting}
                        onChange={(event) => updateInstruction(instruction.id, event.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove step ${index + 1}`}
                      disabled={instructions.length === 1 || isSubmitting}
                      onClick={() =>
                        setInstructions((current) =>
                          current.filter((item) => item.id !== instruction.id),
                        )
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="border-border/70 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-primary" />
                <h2 className="font-serif text-2xl font-medium">Recipe details</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prepTimeMinutes">Prep minutes</Label>
                  <Input
                    id="prepTimeMinutes"
                    name="prepTimeMinutes"
                    type="number"
                    min={0}
                    max={1440}
                    step={1}
                    defaultValue={recipe?.prepTimeMinutes ?? 15}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cookTimeMinutes">Cook minutes</Label>
                  <Input
                    id="cookTimeMinutes"
                    name="cookTimeMinutes"
                    type="number"
                    min={0}
                    max={1440}
                    step={1}
                    defaultValue={recipe?.cookTimeMinutes ?? 30}
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input
                    id="servings"
                    name="servings"
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    defaultValue={recipe?.servings ?? 4}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={difficulty}
                    disabled={isSubmitting}
                    onValueChange={(value) => setDifficulty(value as RecipeDifficulty)}
                  >
                    <SelectTrigger id="difficulty" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cuisine">Cuisine</Label>
                <Input
                  id="cuisine"
                  name="cuisine"
                  defaultValue={recipe?.cuisine}
                  minLength={2}
                  maxLength={60}
                  placeholder="South Asian"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  defaultValue={recipe?.category}
                  minLength={2}
                  maxLength={60}
                  placeholder="Main course"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={recipe?.tags.join(', ')}
                  placeholder="rice, comfort food, one pot"
                  disabled={isSubmitting}
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  Separate up to 10 tags with commas.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-secondary/45 shadow-sm">
            <CardContent className="p-6">
              <h2 className="font-serif text-2xl font-medium">
                {isEditing ? 'Save your changes' : 'Save as a draft'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {isEditing
                  ? recipe.status === 'published'
                    ? 'This recipe is already public, so updates will be visible after saving.'
                    : 'The recipe will stay private until you publish it from your workspace.'
                  : 'You can review this recipe in your workspace before publishing it.'}
              </p>

              {error && (
                <div
                  className="mt-5 rounded-xl border border-destructive/20 bg-background px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <Button className="mt-6 h-11 w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoaderCircle className="animate-spin" /> : <Save />}
                {isSubmitting ? 'Saving recipe…' : isEditing ? 'Save changes' : 'Save recipe'}
              </Button>
              <Link
                className={cn(buttonVariants({ variant: 'ghost' }), 'mt-2 w-full')}
                to="/my-recipes"
              >
                Cancel
              </Link>
            </CardContent>
          </Card>
        </div>
      </form>
    </AppShell>
  );
}

function RecipeEditorSkeleton() {
  return (
    <AppShell>
      <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="mt-8 h-14 w-3/5" />
        <Skeleton className="mt-4 h-5 w-2/5" />
        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.68fr]">
          <div className="space-y-6">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
          <Skeleton className="h-128 rounded-2xl" />
        </div>
      </div>
    </AppShell>
  );
}

function EditRecipeLoader({ recipeId }: { recipeId: string }) {
  const { recipe, isLoading, error, isNotFound, retry } = useAuthorRecipe(recipeId);

  if (isLoading) return <RecipeEditorSkeleton />;
  if (isNotFound) return <NotFoundPage />;

  if (error || recipe === null) {
    return (
      <AppShell>
        <section className="mx-auto grid min-h-[68vh] w-full max-w-7xl place-items-center px-5 py-20 text-center sm:px-8 lg:px-10">
          <div>
            <RefreshCw className="mx-auto size-7 text-destructive" />
            <h1 className="mt-5 font-serif text-4xl font-medium">The recipe could not load</h1>
            <p className="mx-auto mt-3 max-w-md leading-7 text-muted-foreground">{error}</p>
            <Button className="mt-6" variant="outline" onClick={retry}>
              Try again
            </Button>
          </div>
        </section>
      </AppShell>
    );
  }

  return <RecipeForm key={recipe.id} recipe={recipe} />;
}

export function CreateRecipePage() {
  const { recipeId } = useParams();

  return recipeId ? <EditRecipeLoader recipeId={recipeId} /> : <RecipeForm recipe={null} />;
}
