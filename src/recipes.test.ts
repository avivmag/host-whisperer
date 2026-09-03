import { describe, expect, it } from 'vitest';
import { recipes } from './recipes';
import { providers } from './types';

describe('provider recipes', () => {
  it('covers every catalog provider exactly once', () => {
    expect(recipes.map((recipe) => recipe.provider).sort()).toEqual([...providers].sort());
  });

  it('only claims the verified Render recipe as live-tested', () => {
    expect(recipes.filter((recipe) => recipe.capability === 'live-tested').map((recipe) => recipe.provider)).toEqual(['render']);
  });

  it('includes dated provider-specific cost sources', () => {
    for (const recipe of recipes) {
      expect(recipe.cost.sourceUrl).toMatch(/^https:\/\//);
      expect(recipe.cost.checkedAt).toBe('2026-09-03');
      expect(recipe.artifacts.length).toBeGreaterThan(1);
    }
  });
});
