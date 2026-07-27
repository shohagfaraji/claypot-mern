import { describe, expect, it } from 'vitest';
import { getDatabaseStatus } from '../../src/config/database.js';

describe('database status', () => {
  it.each([
    [0, 'disconnected'],
    [1, 'connected'],
    [2, 'connecting'],
    [3, 'disconnecting'],
    [4, 'unknown'],
  ] as const)('maps Mongoose state %i to %s', (readyState, status) => {
    expect(getDatabaseStatus(readyState)).toBe(status);
  });
});
