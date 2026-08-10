export function getAuthRedirectPath(state: unknown) {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    state.from.startsWith('/') &&
    state.from[1] !== '/' &&
    state.from[1] !== '\\'
  ) {
    return state.from;
  }

  return '/';
}
