import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { App } from '@/App';
import { client } from '@/api/client';
import {
  CONFIDENCE_GRADES,
  PRIMARY_PATTERNS,
  CLUSTERS,
  ROUTE_TYPES,
  MODEL_TYPES,
  ECT_TYPES,
  GRANULARITIES,
} from '@/types/literals';

// test_app_renders
describe('test_app_renders', () => {
  it('renders header, filter-bar, main-area, and panel placeholders', () => {
    const { getByTestId } = render(App());
    expect(getByTestId('header')).toBeInTheDocument();
    expect(getByTestId('filter-bar')).toBeInTheDocument();
    expect(getByTestId('main-area')).toBeInTheDocument();
    expect(getByTestId('panel')).toBeInTheDocument();
  });
});

// test_commodities_mock_response
describe('test_commodities_mock_response', () => {
  it('returns 10-item array with required fields and valid literal values', async () => {
    const res = await client.get('/commodities');
    const { commodities } = res.data as {
      commodities: {
        commodity_id: string;
        cluster: string;
        route_type: string;
      }[];
    };

    expect(Array.isArray(commodities)).toBe(true);
    expect(commodities).toHaveLength(10);

    for (const item of commodities) {
      expect(item).toHaveProperty('commodity_id');
      expect(item).toHaveProperty('cluster');
      expect(item).toHaveProperty('route_type');
      expect(CLUSTERS).toContain(item.cluster);
      expect(['3seg', '4seg']).toContain(item.route_type);
    }
  });
});

// test_literal_types_consistency
describe('test_literal_types_consistency', () => {
  it('all literal arrays match expected values from §6.2', () => {
    expect([...CONFIDENCE_GRADES]).toEqual(['high', 'medium', 'reference']);
    expect([...PRIMARY_PATTERNS]).toEqual(['pattern1', 'pattern2', 'pattern3']);
    expect([...CLUSTERS]).toEqual(['grain', 'oil_sugar', 'tropical', 'livestock', 'independent']);
    expect([...ROUTE_TYPES]).toEqual(['3seg', '4seg']);
    expect([...MODEL_TYPES]).toEqual(['VAR', 'VECM']);
    expect([...ECT_TYPES]).toEqual(['ECT', 'log_spread']);
    expect([...GRANULARITIES]).toEqual(['monthly', 'quarterly', 'yearly']);
  });
});
