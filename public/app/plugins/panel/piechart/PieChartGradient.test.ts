import { FieldColorModeId, FieldDisplay } from '@grafana/data';

import { computeGradientFills } from './PieChart';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal FieldDisplay stub with just the properties we need. */
function makeItem(title: string, value: number): FieldDisplay {
  return {
    display: { title, numeric: value, text: String(value) },
    field: { config: {} },
    hasLinks: false,
    view: undefined,
  } as unknown as FieldDisplay;
}

/**
 * Build a FieldDisplay stub that simulates a series with a field-level color
 * override (e.g. the user pinned it to a fixed color via the Overrides editor).
 * PieChartPanel filters these out before calling computeGradientFills so that
 * the override color is preserved instead of being replaced by a gradient fill.
 */
function makeItemWithOverride(title: string, value: number, overrideColor: string): FieldDisplay {
  return {
    display: { title, numeric: value, text: String(value), color: overrideColor },
    // FieldDisplay.field is FieldConfig — the merged config for this series.
    // An overridden series has field.color.mode set to the override value (e.g. 'fixed').
    field: { color: { mode: FieldColorModeId.Fixed, fixedColor: overrideColor } },
    hasLinks: false,
    view: undefined,
  } as unknown as FieldDisplay;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

const COLOR_GREEN = '#00ff00'; // rgb(0, 255, 0)
const COLOR_RED = '#ff0000'; // rgb(255, 0, 0)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeGradientFills', () => {
  describe('N = 1 (single slice)', () => {
    it('returns colorFrom for the only slice', () => {
      const items = [makeItem('A', 100)];
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);

      expect(fills.size).toBe(1);
      // t = 0 → should be exactly colorFrom
      const { r, g, b } = hexToRgb(fills.get('A')!);
      expect(r).toBe(0);
      expect(g).toBe(255);
      expect(b).toBe(0);
    });
  });

  describe('N = 2 (two slices)', () => {
    it('assigns colorFrom to the largest and colorTo to the smallest', () => {
      const items = [makeItem('small', 10), makeItem('large', 90)];
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);

      expect(fills.size).toBe(2);

      // largest → t=0 → colorFrom (green)
      const large = hexToRgb(fills.get('large')!);
      expect(large.r).toBe(0);
      expect(large.g).toBe(255);
      expect(large.b).toBe(0);

      // smallest → t=1 → colorTo (red)
      const small = hexToRgb(fills.get('small')!);
      expect(small.r).toBe(255);
      expect(small.g).toBe(0);
      expect(small.b).toBe(0);
    });
  });

  describe('N = 5 (multiple slices)', () => {
    const items = [
      makeItem('rank4', 10),
      makeItem('rank2', 60),
      makeItem('rank0', 100),
      makeItem('rank3', 30),
      makeItem('rank1', 80),
    ];

    // GREEN (#00ff00) → RED (#ff0000)
    // Sorted descending: rank0(100), rank1(80), rank2(60), rank3(30), rank4(10)
    // t values:         0,         0.25,       0.5,       0.75,      1.0

    it('produces 5 distinct fills', () => {
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);
      expect(fills.size).toBe(5);
    });

    it('rank0 (largest) gets colorFrom', () => {
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);
      const { r, g, b } = hexToRgb(fills.get('rank0')!);
      expect(r).toBe(0);
      expect(g).toBe(255);
      expect(b).toBe(0);
    });

    it('rank4 (smallest) gets colorTo', () => {
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);
      const { r, g, b } = hexToRgb(fills.get('rank4')!);
      expect(r).toBe(255);
      expect(g).toBe(0);
      expect(b).toBe(0);
    });

    it('rank2 (middle, t=0.5) gets the midpoint color', () => {
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);
      // t=0.5 → r=round(0*(0.5)+255*0.5)=128, g=round(255*0.5+0*0.5)=128, b=0
      const { r, g, b } = hexToRgb(fills.get('rank2')!);
      expect(r).toBe(128);
      expect(g).toBe(128);
      expect(b).toBe(0);
    });

    it('colors become progressively more red as rank increases', () => {
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);
      const ranks = ['rank0', 'rank1', 'rank2', 'rank3', 'rank4'];
      const reds = ranks.map((k) => hexToRgb(fills.get(k)!).r);
      // Red channel should be monotonically non-decreasing
      for (let i = 0; i < reds.length - 1; i++) {
        expect(reds[i]).toBeLessThanOrEqual(reds[i + 1]);
      }
    });
  });

  describe('edge cases', () => {
    it('handles all slices with the same value (stable order, no NaN)', () => {
      const items = [makeItem('A', 50), makeItem('B', 50), makeItem('C', 50)];
      const fills = computeGradientFills(items, COLOR_GREEN, COLOR_RED);

      expect(fills.size).toBe(3);
      // No NaN or undefined values
      for (const color of fills.values()) {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });

    it('returns an empty Map for an empty input array', () => {
      const fills = computeGradientFills([], COLOR_GREEN, COLOR_RED);
      expect(fills.size).toBe(0);
    });

    it('does not mutate the input array order', () => {
      const items = [makeItem('first', 10), makeItem('second', 90)];
      const originalOrder = items.map((i) => i.display.title);
      computeGradientFills(items, COLOR_GREEN, COLOR_RED);
      expect(items.map((i) => i.display.title)).toEqual(originalOrder);
    });

    it('accepts shorthand hex colors (tinycolor normalises them)', () => {
      const items = [makeItem('A', 100), makeItem('B', 50)];
      // #f00 = red, #0f0 = green — tinycolor expands these
      expect(() => computeGradientFills(items, '#0f0', '#f00')).not.toThrow();
      const fills = computeGradientFills(items, '#0f0', '#f00');
      expect(fills.size).toBe(2);
    });
  });

  describe('field-level color overrides', () => {
    it('override item excluded by caller does not appear in the fills map', () => {
      // Simulate the PieChartPanel pattern: filter out items whose field.config.color.mode
      // differs from 'gradient' (meaning a field override has changed the color mode).
      const normal = makeItem('normal', 80);
      const overridden = makeItemWithOverride('overridden', 100, '#0000ff');

      const allItems = [normal, overridden];

      // Caller filters: only include items without a non-gradient color override
      const itemsForGradient = allItems.filter(
        (item) => !item.field.color || item.field.color.mode === FieldColorModeId.Gradient
      );

      const fills = computeGradientFills(itemsForGradient, COLOR_GREEN, COLOR_RED);

      // 'overridden' was filtered out → not in fills map
      expect(fills.has('overridden')).toBe(false);
      // 'normal' is in fills map and gets colorFrom (only item → t=0)
      expect(fills.has('normal')).toBe(true);
      const { r, g, b } = hexToRgb(fills.get('normal')!);
      expect(r).toBe(0);
      expect(g).toBe(255);
      expect(b).toBe(0);
    });
  });
});
