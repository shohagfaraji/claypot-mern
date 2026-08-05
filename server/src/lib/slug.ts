const maximumSlugBaseLength = 140;

export function createSlugBase(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maximumSlugBaseLength)
    .replace(/-+$/g, '');

  return slug || 'recipe';
}
