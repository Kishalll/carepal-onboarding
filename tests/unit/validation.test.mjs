import { describe, it } from 'node:test';
import assert from 'node:assert';
import { applicationSchema, normalizeIndianPhone, isAtLeast18YearsOld } from '@carepal/shared';

describe('Unit: Application Validation and Normalization', () => {
  it('normalizes various Indian phone number formats correctly', () => {
    assert.strictEqual(normalizeIndianPhone('9876543210'), '+919876543210');
    assert.strictEqual(normalizeIndianPhone('+919876543210'), '+919876543210');
    assert.strictEqual(normalizeIndianPhone('919876543210'), '+919876543210');
    assert.strictEqual(normalizeIndianPhone('09876543210'), '+919876543210');
    assert.strictEqual(normalizeIndianPhone('98765 43210'), '+919876543210');
    assert.strictEqual(normalizeIndianPhone('+91 (987) 654-3210'), '+919876543210');
  });

  it('rejects invalid or international phone numbers', () => {
    assert.strictEqual(normalizeIndianPhone('1234567890'), null); // Does not start with 6-9
    assert.strictEqual(normalizeIndianPhone('987654321'), null); // Too short
    assert.strictEqual(normalizeIndianPhone('987654321012'), null); // Too long
    assert.strictEqual(normalizeIndianPhone('abcdefghij'), null);
    assert.strictEqual(normalizeIndianPhone(''), null);
  });

  it('enforces minimum 18 years age requirement on date of birth', () => {
    const today = new Date();
    const adultDob = new Date(today.getFullYear() - 22, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
    const minorDob = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate()).toISOString().slice(0, 10);
    const futureDob = new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toISOString().slice(0, 10);

    assert.strictEqual(isAtLeast18YearsOld(adultDob), true);
    assert.strictEqual(isAtLeast18YearsOld(minorDob), false);
    assert.strictEqual(isAtLeast18YearsOld(futureDob), false);
    assert.strictEqual(isAtLeast18YearsOld('invalid-date'), false);
  });

  it('validates a complete, valid application payload', () => {
    const validData = {
      fullName: 'Sunita Sharma',
      phone: '9876543210',
      email: 'sunita.sharma@example.com',
      dateOfBirth: '1995-05-15',
      city: 'Delhi NCR',
      preferredLanguage: 'hi',
      qualification: 'GNM',
      councilRegistrationNumber: 'DNC-2020-123456',
      experienceYears: 4,
      previousWorkNote: 'Worked in cardiac ICU and elder home health.',
      skills: ['Elderly Care', 'Palliative Care'],
      languages: ['English', 'Hindi'],
      preferredCities: ['Delhi NCR', 'Mumbai'],
      availabilityType: 'FULL_TIME',
      earliestStartDate: '2026-12-01',
      consentGiven: true,
      website: '', // Honeypot must be empty
    };

    const result = applicationSchema.safeParse(validData);
    assert.strictEqual(result.success, true);
  });

  it('detects filled honeypot for bot protection', () => {
    const isBot = (body) => Boolean(body?.website_hp && String(body.website_hp).trim().length > 0);

    assert.strictEqual(isBot({ website_hp: 'https://spam-bot.example.com' }), true);
    assert.strictEqual(isBot({ website_hp: '   some_bot_text   ' }), true);
    assert.strictEqual(isBot({ website_hp: '' }), false);
    assert.strictEqual(isBot({}), false);
  });

  it('rejects applications with invalid qualifications or cities', () => {
    const invalidData = {
      fullName: 'Aarav Kumar',
      phone: '9876543210',
      email: 'aarav@example.com',
      dateOfBirth: '1992-04-10',
      city: 'Atlantis', // Invalid city
      preferredLanguage: 'en',
      qualification: 'PHD_MEDICINE', // Invalid qualification
      experienceYears: 3,
      skills: ['Elderly Care'],
      languages: ['English'],
      preferredCities: ['Mumbai'],
      availabilityType: 'FULL_TIME',
      earliestStartDate: '2026-12-01',
      consentGiven: true,
      website: '',
    };

    const result = applicationSchema.safeParse(invalidData);
    assert.strictEqual(result.success, false);
  });
});
