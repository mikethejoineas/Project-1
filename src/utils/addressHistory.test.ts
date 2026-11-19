import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAddressHistoryCoverage } from './addressHistory';

test('current address >= 10 years ago satisfies 10-year requirement', () => {
  const ref = new Date(2026, 10, 19); // Nov 2026
  const res = calculateAddressHistoryCoverage('11', '2016', [], ref);
  assert.equal(res.isComplete, true);
  assert.equal(res.monthsCovered, 120);
  assert.equal(res.yearsCovered, 10);
});

test('current address < 10 years without prior addresses is incomplete', () => {
  const ref = new Date(2026, 10, 19); // Nov 2026
  const res = calculateAddressHistoryCoverage('11', '2020', [], ref);
  assert.equal(res.isComplete, false);
  assert.equal(res.monthsCovered, 72);
  assert.equal(res.yearsCovered, 6);
  assert.equal(res.missingMonths, 48);
});

test('current address + prior addresses seamlessly covering 10 years completes', () => {
  const ref = new Date(2026, 10, 19); // Nov 2026
  const res = calculateAddressHistoryCoverage(
    '11',
    '2021',
    [
      {
        moveInMonth: '11',
        moveInYear: '2016',
        moveOutMonth: '11',
        moveOutYear: '2021',
      },
    ],
    ref
  );
  assert.equal(res.isComplete, true);
  assert.equal(res.monthsCovered, 120);
});

test('overlapping prior addresses do not double count months', () => {
  const ref = new Date(2026, 10, 19); // Nov 2026
  const res = calculateAddressHistoryCoverage(
    '11',
    '2022', // 48 months
    [
      {
        moveInMonth: '11',
        moveInYear: '2020', // overlaps 2022-2022, adds 24 months (total 72)
        moveOutMonth: '11',
        moveOutYear: '2023',
      },
    ],
    ref
  );
  assert.equal(res.isComplete, false);
  assert.equal(res.monthsCovered, 72);
});
