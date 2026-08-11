import { useCallback, useEffect, useState } from 'react';

import { useAuthenticatedRequest } from '@/features/auth/hooks/use-authenticated-request';
import { getSavedRecipeStatus } from '@/features/recipes/api/get-saved-recipe-status';
import { saveRecipe } from '@/features/recipes/api/save-recipe';
import { unsaveRecipe } from '@/features/recipes/api/unsave-recipe';

interface SavedRecipeStatusState {
  requestKey: string | null;
  isSaved: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
}

const initialState: SavedRecipeStatusState = {
  requestKey: null,
  isSaved: false,
  isLoading: false,
  isUpdating: false,
  error: null,
};

export function useSavedRecipeStatus(recipeId: string, enabled: boolean) {
  const request = useAuthenticatedRequest();
  const [state, setState] = useState(initialState);
  const isCurrentRequest = enabled && state.requestKey === recipeId;

  useEffect(() => {
    if (!enabled || recipeId.length === 0) return;

    const controller = new AbortController();

    void getSavedRecipeStatus(request, recipeId, controller.signal)
      .then((isSaved) => {
        setState({
          requestKey: recipeId,
          isSaved,
          isLoading: false,
          isUpdating: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          requestKey: recipeId,
          isSaved: false,
          isLoading: false,
          isUpdating: false,
          error: error instanceof Error ? error.message : 'Saved status could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [enabled, recipeId, request]);

  const toggle = useCallback(async () => {
    if (!isCurrentRequest || state.isLoading || state.isUpdating) return;

    setState((current) => ({ ...current, isUpdating: true, error: null }));

    try {
      if (state.isSaved) await unsaveRecipe(request, recipeId);
      else await saveRecipe(request, recipeId);

      setState((current) => ({
        ...current,
        isSaved: !state.isSaved,
        isUpdating: false,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isUpdating: false,
        error: error instanceof Error ? error.message : 'Saved status could not be updated.',
      }));
    }
  }, [isCurrentRequest, recipeId, request, state.isLoading, state.isSaved, state.isUpdating]);

  return {
    isSaved: isCurrentRequest && state.isSaved,
    isLoading: enabled && !isCurrentRequest ? true : state.isLoading,
    isUpdating: isCurrentRequest && state.isUpdating,
    error: isCurrentRequest ? state.error : null,
    toggle,
  };
}
