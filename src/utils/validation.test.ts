import assert from 'node:assert/strict';
import test from 'node:test';
import {
  evaluatePassword,
  formatDateMask,
  formatDriversLicenseMask,
  formatPhoneMask,
  isValidDateMMDDYYYY,
} from './validation';

test('evaluatePassword enforces 8-12 chars, complexity, and NO @ symbol', () => {
  assert.equal(evaluatePassword('Digital2!').isValid, true);
  assert.equal(evaluatePassword('Digital2@').isValid, false);
  assert.equal(evaluatePassword('Digital2@').noAtSymbol, false);
  assert.equal(evaluatePassword('Short1!').isValid, false);
  assert.equal(evaluatePassword('TooLongPass123!').isValid, false);
  assert.equal(evaluatePassword('nouppercase1!').isValid, false);
  assert.equal(evaluatePassword('NOLOWERCASE1!').isValid, false);
  assert.equal(evaluatePassword('NoNumbers!!').isValid, false);
  assert.equal(evaluatePassword('NoSpecial12').isValid, false);
});

test('input masks format phone, date, and DL segments cleanly', () => {
  assert.equal(formatPhoneMask('2177668408'), '(217) 766-8408');
  assert.equal(formatDateMask('04141984'), '04/14/1984');
  assert.equal(formatDriversLicenseMask('s12345678901'), 'S123-4567-8901');
});

test('isValidDateMMDDYYYY rejects impossible calendar dates', () => {
  assert.equal(isValidDateMMDDYYYY('02/29/2024'), true);
  assert.equal(isValidDateMMDDYYYY('02/29/2025'), false);
  assert.equal(isValidDateMMDDYYYY('13/01/2024'), false);
});
