import {
  expect,
  test as base,
  type APIRequestContext,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from '@playwright/test';
import { members, testPassword, type Member } from './data.js';
import { apiUrl, clientOrigin, serverOrigin } from './settings.js';

interface TestEmail {
  id: string;
  to: string[];
  subject: string;
  text: string;
}

export class TestData {
  private request: APIRequestContext;

  constructor(request: APIRequestContext) {
    this.request = request;
  }

  async reset() {
    const response = await this.request.post(`${serverOrigin}/__test__/reset`);
    expect(response.status()).toBe(204);
  }

  async emails(recipient: string) {
    const response = await this.request.get(`${serverOrigin}/__test__/emails`);
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { emails: TestEmail[] };
    return body.emails.filter((email) => email.to.includes(recipient));
  }

  async emailLink(recipient: string, path: string) {
    await expect
      .poll(async () => (await this.emails(recipient)).some((email) => email.text.includes(path)))
      .toBe(true);
    const email = (await this.emails(recipient)).findLast((item) => item.text.includes(path));
    const link = email?.text
      .split(/\s+/)
      .find((word) => word.startsWith(`${clientOrigin}${path}?`));
    expect(link).toBeTruthy();
    return link as string;
  }

  async agePasswordToken(member: Member, expire = false) {
    const response = await this.request.post(`${serverOrigin}/__test__/password-token/age`, {
      data: { userId: members[member].id, expire },
    });
    expect(response.status()).toBe(204);
  }
}

interface TestFixtures {
  data: TestData;
  cleanDatabase: void;
  observeContext: (context: BrowserContext) => Promise<void>;
  createContext: (options?: BrowserContextOptions) => Promise<BrowserContext>;
}

export const test = base.extend<TestFixtures>({
  data: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({
      extraHTTPHeaders: { 'x-test-key': process.env.CLAYPOT_E2E_KEY ?? '' },
    });
    try {
      await use(new TestData(request));
    } finally {
      await request.dispose();
    }
  },
  observeContext: [
    async ({ context }, use, testInfo) => {
      const errors: string[] = [];
      const observe = async (testContext: BrowserContext) => {
        await testContext.route('**/*', (route) => {
          const origin = new URL(route.request().url()).origin;
          return origin === clientOrigin || origin === serverOrigin
            ? route.continue()
            : route.abort();
        });
        const observePage = (page: Page) => {
          page.on('pageerror', (error) => errors.push(`${page.url()}: ${error.message}`));
        };
        testContext.pages().forEach(observePage);
        testContext.on('page', observePage);
      };
      await observe(context);
      await use(observe);
      if (testInfo.status === testInfo.expectedStatus) expect(errors).toEqual([]);
    },
    { auto: true },
  ],
  createContext: async ({ browser, observeContext }, use) => {
    const contexts = new Set<BrowserContext>();
    try {
      await use(async (options = {}) => {
        const context = await browser.newContext({
          ...options,
          baseURL: clientOrigin,
          serviceWorkers: 'block',
        });
        contexts.add(context);
        context.on('close', () => contexts.delete(context));
        await observeContext(context);
        return context;
      });
    } finally {
      await Promise.all([...contexts].map((context) => context.close()));
    }
  },
  cleanDatabase: [
    async ({ data }, use, testInfo) => {
      if (testInfo.config.workers !== 1)
        throw new Error('The shared fixture database requires --workers=1.');
      await data.reset();
      await use();
    },
    { auto: true },
  ],
});

export { expect };

export async function login(page: Page, member: Member = 'reader') {
  if (page.url() !== `${clientOrigin}/login`) await page.goto('/login');
  await page.getByLabel('Email or username').fill(members[member].username);
  await page.getByLabel('Password', { exact: true }).fill(testPassword);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

export async function selectOption(page: Page, label: string, option: string | RegExp) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.getByRole('option', { name: option, exact: typeof option === 'string' }).click();
}

export async function loginApi(request: APIRequestContext, member: Member = 'reader') {
  const response = await request.post(`${apiUrl}/auth/login`, {
    data: { identifier: members[member].username, password: testPassword },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { data: { accessToken: string } };
  return { Authorization: `Bearer ${body.data.accessToken}` };
}
