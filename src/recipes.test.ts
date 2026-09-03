import { describe, expect, it } from 'vitest';
import { recipes } from './recipes';
import { providers } from './types';

describe('provider recipes', () => {
  it('covers every catalog provider exactly once', () => {
    expect(recipes.map((recipe) => recipe.provider).sort()).toEqual([...providers].sort());
  });

  it('keeps Render proof-ready until the live deployment is verified', () => {
    expect(recipes.filter((recipe) => recipe.capability === 'proof-ready').map((recipe) => recipe.provider)).toEqual(['render']);
    expect(recipes.filter((recipe) => recipe.capability === 'live-tested')).toEqual([]);
  });

  it('includes dated provider-specific cost sources', () => {
    for (const recipe of recipes) {
      expect(recipe.cost.sourceUrl).toMatch(/^https:\/\//);
      expect(recipe.cost.checkedAt).toBe('2026-09-03');
      expect(recipe.artifacts.length).toBeGreaterThan(1);
    }
  });
});
