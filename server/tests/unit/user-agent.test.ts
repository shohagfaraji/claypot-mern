import { describe, expect, it } from 'vitest';
import { describeUserAgent } from '../../src/lib/user-agent.js';

describe('user agent descriptions', () => {
  it.each([
    [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36',
      'Chrome on Windows',
    ],
    [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1 Version/18.0 Mobile/15E148 Safari/604.1',
      'Safari on iPhone',
    ],
    ['Mozilla/5.0 (X11; Linux x86_64; rv:141.0) Gecko/20100101 Firefox/141.0', 'Firefox on Linux'],
  ])('describes a recognized browser and platform', (userAgent, expected) => {
    expect(describeUserAgent(userAgent)).toBe(expected);
  });

  it('uses a neutral label when details are unavailable', () => {
    expect(describeUserAgent(null)).toBe('Unknown device');
    expect(describeUserAgent('custom-client')).toBe('Unknown device');
  });
});
