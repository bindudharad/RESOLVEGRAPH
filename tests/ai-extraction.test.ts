import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FactNormalizer } from '../src/server/ai/normalization/fact-normalizer';
import { ImageExtractor } from '../src/server/ai/extraction/image-extractor';
import { TextExtractor } from '../src/server/ai/extraction/text-extractor';

describe('ResolveGraph AI Extraction & Normalization Suite', () => {
  test('FactNormalizer normalizes storage capacities accurately to Gigabytes', () => {
    assert.strictEqual(FactNormalizer.normalizeCapacity('1 TB'), '1024 GB');
    assert.strictEqual(FactNormalizer.normalizeCapacity('2TB'), '2048 GB');
    assert.strictEqual(FactNormalizer.normalizeCapacity('512 GB'), '512 GB');
    assert.strictEqual(FactNormalizer.normalizeCapacity('256gb'), '256 GB');
  });

  test('FactNormalizer parses monetary values to minor units (cents) and currency', () => {
    const res1 = FactNormalizer.normalizeMonetary('$1,299.99');
    assert.ok(res1);
    assert.strictEqual(res1.cents, 129999);
    assert.strictEqual(res1.currency, 'USD');

    const res2 = FactNormalizer.normalizeMonetary('€45.50');
    assert.ok(res2);
    assert.strictEqual(res2.cents, 4550);
    assert.strictEqual(res2.currency, 'EUR');
  });

  test('FactNormalizer normalizes dates into ISO YYYY-MM-DD', () => {
    const d1 = FactNormalizer.normalizeDate('2026-11-03');
    assert.strictEqual(d1, '2026-11-03');

    const d2 = FactNormalizer.normalizeDate('Nov 3, 2026');
    assert.strictEqual(d2, '2026-11-03');
  });

  test('FactNormalizer normalizes Serial Numbers and SKUs', () => {
    assert.strictEqual(FactNormalizer.normalizeSkuOrSerial('SN: AB-123 456-XY'), 'AB123456XY');
    assert.strictEqual(FactNormalizer.normalizeSkuOrSerial('SKU: mbp-m3-1tb'), 'MBPM31TB');
  });

  test('FactNormalizer standardizes condition keywords', () => {
    assert.strictEqual(FactNormalizer.normalizeCondition('Brand New, Factory Sealed'), 'BRAND_NEW');
    assert.strictEqual(FactNormalizer.normalizeCondition('Slightly Damaged and Scratched'), 'DAMAGED');
    assert.strictEqual(FactNormalizer.normalizeCondition('Open Box Like New'), 'LIKE_NEW');
  });

  test('ImageExtractor normalizes bounding boxes into 0-1000 scale', () => {
    const rawBox = { ymin: -50, xmin: 250.7, ymax: 1200, xmax: 800 };
    const box = ImageExtractor.normalizeBoundingBox(rawBox);

    assert.strictEqual(box.ymin, 0);
    assert.strictEqual(box.xmin, 251);
    assert.strictEqual(box.ymax, 1000);
    assert.strictEqual(box.xmax, 800);
  });

  test('TextExtractor locates exact and case-insensitive excerpt offsets', () => {
    const text = 'The customer ordered a 1TB SSD MacBook Pro on November 1st.';
    const loc = TextExtractor.locateExcerpt(text, '1TB SSD');
    assert.ok(loc);
    assert.strictEqual(text.slice(loc.charStart, loc.charEnd), '1TB SSD');

    const locCase = TextExtractor.locateExcerpt(text, 'november 1st');
    assert.ok(locCase);
    assert.strictEqual(text.slice(locCase.charStart, locCase.charEnd), 'November 1st');
  });
});
