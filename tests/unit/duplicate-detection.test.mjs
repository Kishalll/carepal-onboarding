import { describe, it } from 'node:test';
import assert from 'node:assert';

function detectDuplicates(candidates) {
  const pairs = [];
  const duplicateCandidateIds = new Set();
  const seenPairKeys = new Set();

  // 1. Group by email
  const emailMap = new Map();
  for (const c of candidates) {
    const key = c.email.trim().toLowerCase();
    if (!emailMap.has(key)) emailMap.set(key, []);
    emailMap.get(key).push(c);
  }

  for (const [email, group] of emailMap.entries()) {
    if (group.length > 1) {
      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const c1 = group[i];
          const c2 = group[j];
          const pairKey = [c1.id, c2.id].sort().join('_');
          if (!seenPairKeys.has(pairKey)) {
            seenPairKeys.add(pairKey);
            duplicateCandidateIds.add(c1.id);
            duplicateCandidateIds.add(c2.id);
            pairs.push({
              reason: 'MATCHING_EMAIL',
              matchedValue: email,
              primaryCandidate: c1.createdAt <= c2.createdAt ? c1 : c2,
              duplicateCandidate: c1.createdAt <= c2.createdAt ? c2 : c1,
            });
          }
        }
      }
    }
  }

  // 2. Group by name + date of birth
  const nameDobMap = new Map();
  for (const c of candidates) {
    const dobStr = new Date(c.dateOfBirth).toISOString().slice(0, 10);
    const key = `${c.fullName.trim().toLowerCase()}_${dobStr}`;
    if (!nameDobMap.has(key)) nameDobMap.set(key, []);
    nameDobMap.get(key).push(c);
  }

  for (const [key, group] of nameDobMap.entries()) {
    if (group.length > 1) {
      for (let i = 0; i < group.length - 1; i++) {
        for (let j = i + 1; j < group.length; j++) {
          const c1 = group[i];
          const c2 = group[j];
          const pairKey = [c1.id, c2.id].sort().join('_');
          if (!seenPairKeys.has(pairKey)) {
            seenPairKeys.add(pairKey);
            duplicateCandidateIds.add(c1.id);
            duplicateCandidateIds.add(c2.id);
            pairs.push({
              reason: 'MATCHING_NAME_AND_DOB',
              matchedValue: key,
              primaryCandidate: c1.createdAt <= c2.createdAt ? c1 : c2,
              duplicateCandidate: c1.createdAt <= c2.createdAt ? c2 : c1,
            });
          }
        }
      }
    }
  }

  return { pairs, duplicateCandidateIds };
}

describe('Unit: Duplicate Candidate Detection Clustering', () => {
  const candidate1 = {
    id: 'c-1',
    applicationId: 'CP-2026-000001',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com',
    phone: '+919800000001',
    dateOfBirth: '1988-06-12',
    createdAt: new Date('2026-11-10T10:00:00Z'),
  };

  const candidate2 = {
    id: 'c-2',
    applicationId: 'CP-2026-000002',
    fullName: 'Priya Sharma',
    email: 'priya.sharma@example.com', // Matching email!
    phone: '+919800000002', // Distinct phone
    dateOfBirth: '1990-01-01',
    createdAt: new Date('2026-11-15T10:00:00Z'),
  };

  const candidate3 = {
    id: 'c-3',
    applicationId: 'CP-2026-000003',
    fullName: 'Sunita Rao',
    email: 'sunita1@example.com',
    phone: '+919800000003',
    dateOfBirth: '1992-04-20',
    createdAt: new Date('2026-11-12T10:00:00Z'),
  };

  const candidate4 = {
    id: 'c-4',
    applicationId: 'CP-2026-000004',
    fullName: 'Sunita Rao', // Matching name + DOB!
    email: 'sunita2@example.com', // Different email
    phone: '+919800000004',
    dateOfBirth: '1992-04-20', // Matching DOB
    createdAt: new Date('2026-11-18T10:00:00Z'),
  };

  const distinctCandidate = {
    id: 'c-5',
    applicationId: 'CP-2026-000005',
    fullName: 'Rajesh Kumar',
    email: 'rajesh@example.com',
    phone: '+919800000005',
    dateOfBirth: '1985-09-15',
    createdAt: new Date('2026-11-01T10:00:00Z'),
  };

  it('detects duplicate candidate pair via matching email address', () => {
    const result = detectDuplicates([candidate1, candidate2, distinctCandidate]);
    assert.strictEqual(result.pairs.length, 1);
    assert.strictEqual(result.pairs[0].reason, 'MATCHING_EMAIL');
    assert.strictEqual(result.pairs[0].primaryCandidate.id, 'c-1');
    assert.strictEqual(result.pairs[0].duplicateCandidate.id, 'c-2');
    assert.strictEqual(result.duplicateCandidateIds.has('c-1'), true);
    assert.strictEqual(result.duplicateCandidateIds.has('c-2'), true);
    assert.strictEqual(result.duplicateCandidateIds.has('c-5'), false);
  });

  it('detects duplicate candidate pair via matching name and date of birth', () => {
    const result = detectDuplicates([candidate3, candidate4, distinctCandidate]);
    assert.strictEqual(result.pairs.length, 1);
    assert.strictEqual(result.pairs[0].reason, 'MATCHING_NAME_AND_DOB');
    assert.strictEqual(result.pairs[0].primaryCandidate.id, 'c-3');
    assert.strictEqual(result.pairs[0].duplicateCandidate.id, 'c-4');
  });

  it('correctly reports zero duplicates when all candidates are distinct', () => {
    const result = detectDuplicates([candidate1, candidate3, distinctCandidate]);
    assert.strictEqual(result.pairs.length, 0);
    assert.strictEqual(result.duplicateCandidateIds.size, 0);
  });
});
