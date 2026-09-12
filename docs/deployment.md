# Deployment

Claypot runs its React client on Netlify, its Express API on Render, and its database on MongoDB Atlas. Cloudinary stores uploaded images. Resend handles account emails.

Browser requests use `/api/v1` on the website domain. The Netlify edge function forwards them to Render, keeping refresh cookies first-party, secure, and HTTP-only. A shared proxy secret lets the API trust the visitor address supplied by Netlify for rate limits and session history. Direct API requests are rejected, except for health checks.

## Before deploying

- Review and merge the deployment changes into the branch both hosts will deploy, normally `main`.
- Run `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`, `npm run build`, and `npm run test:e2e`.
- Keep real credentials in provider environment settings, never in Git or variables beginning with `VITE_`.
- Use the free instance option on Render and check each provider's current free usage allowance. Free hosting has availability and usage limits; it is not an uptime guarantee.

## MongoDB Atlas

The existing Atlas cluster can be reused. Use a separate database named `claypot-production` and a database user with `readWrite` access to that database. Do not use local test data as production data.

Copy the Atlas application connection string, replace its credentials locally, and include `/claypot-production` before the query string. URL-encode any reserved characters in the username or password. Store the completed URI only in Render's `MONGODB_URI`.

Under Atlas Network Access, allow the outbound IP ranges shown in the Render service's Connect menu. Avoid leaving an unrestricted `0.0.0.0/0` entry. Choose a Render region close to the Atlas cluster when creating the service.

Startup checks that MongoDB supports transactions and creates the indexes declared by all models. It does not drop indexes or remove data. Duplicate data or conflicting indexes will stop startup: inspect and back up the database before resolving a conflict. Future index removals or definition changes need an explicit migration. Do not run production startup against a standalone local MongoDB server.

## Cloudinary

Create a separate key named `claypot-production` in Cloudinary's API Keys settings. The existing Root key does not need to be deleted or changed. Add the cloud name, new API key, and API secret to Render using the variable names below. This application signs uploads on the server; no unsigned upload preset is needed.

## Render

Create a **Web Service**, connect the repository, and use these settings. The Render login email does not need to match the GitHub account; the connected GitHub credentials need access to the repository.

| Setting           | Value                                                               |
| ----------------- | ------------------------------------------------------------------- |
| Name              | `claypot-api`                                                       |
| Branch            | `main`, after the deployment changes are merged                     |
| Runtime           | Node                                                                |
| Root directory    | Leave empty (repository root)                                       |
| Build command     | `npm ci --include=dev && npm run build --workspace @claypot/server` |
| Start command     | `npm run start --workspace @claypot/server`                         |
| Instance type     | Free                                                                |
| Health check path | `/api/v1/health/ready`                                              |
| Auto-deploy       | Off during initial setup                                            |

The repository also includes `render.yaml` for creating the same service through a Render Blueprint. Use either the manual setup or the Blueprint, not both. A Blueprint is not automatically applied to a manually created service. Blueprint-generated secrets must still be copied to the appropriate Netlify setting.

Add these environment variables:

| Variable                | Value                                                                       |
| ----------------------- | --------------------------------------------------------------------------- |
| `NODE_VERSION`          | `22`                                                                        |
| `NODE_ENV`              | `production`                                                                |
| `CLIENT_ORIGIN`         | `https://claypot.netlify.app`                                               |
| `TRUST_PROXY_HOPS`      | `1`                                                                         |
| `MONGODB_URI`           | Production Atlas connection string                                          |
| `ACCESS_TOKEN_SECRET`   | A new random secret, at least 32 characters                                 |
| `API_PROXY_SECRET`      | A different random secret, at least 32 characters; also required on Netlify |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name                                                       |
| `CLOUDINARY_API_KEY`    | Project API key                                                             |
| `CLOUDINARY_API_SECRET` | Project API secret                                                          |

Generate each secret separately on your own computer:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Do not reuse the access-token secret as the proxy secret. Leave `PORT` unset; Render supplies it. Add `RESEND_API_KEY` and `EMAIL_FROM` together when email delivery is configured. Omitting both allows startup but leaves account email delivery unavailable.

Deploy after the code is reviewed and available on the selected branch. Copy the resulting HTTPS `onrender.com` origin for the Netlify setup. Check `/api/v1/health/ready` returns HTTP 200 with `status: ready`. A disconnected database returns HTTP 503. Application endpoints returning HTTP 403 when accessed directly on Render is expected.

## Netlify

Connect the repository to the existing `claypot.netlify.app` site. Use the repository root as the base directory and `main` as the production branch. `netlify.toml` supplies the client build command and the `client/dist` publish directory. Remove conflicting dashboard overrides, especially a base directory set to `client` or a `VITE_API_URL` pointing to localhost or directly to Render.

Set these variables in the Netlify dashboard for the production deploy context:

| Variable            | Value                                           | Scope             |
| ------------------- | ----------------------------------------------- | ----------------- |
| `VITE_API_URL`      | `/api/v1` (also set in `netlify.toml`)          | Builds            |
| `RENDER_API_ORIGIN` | Actual HTTPS Render origin, with no `/api` path | Functions/runtime |
| `API_PROXY_SECRET`  | Exactly the same proxy secret as Render         | Functions/runtime |

If the plan does not offer individual scope selection, use the available all-scopes setting. Runtime values must be added through Netlify's UI, CLI, or API: values in `netlify.toml` are not available to edge functions at runtime. Redeploy after changing them.

Keep Atlas, Cloudinary, Resend, and access-token secrets on Render only. Do not grant production proxy secrets to untrusted deploy previews or branch deploys. Use separate services and secrets if preview environments are needed.

The edge function runs before the existing SPA fallback, returns API responses directly, and disables caching. It replaces incoming proxy headers with its own verified visitor address. Requests are not automatically retried: after a timeout, check whether an action completed before submitting it again.

## Email delivery

Configure `RESEND_API_KEY` and `EMAIL_FROM` on Render together. With Resend's default testing domain, real delivery is restricted to the account owner's allowed recipient. It is not ready for public signup email delivery. A sender on a verified domain you control is needed to email other users; a Netlify subdomain does not provide the necessary DNS control.

Once a domain is verified, set `EMAIL_FROM` to a sender on that domain and test verification, password reset, and email change. `CLIENT_ORIGIN` determines the website links in those emails. Check Resend's current free quota before opening registration to the public.

## Live checks

Local tests do not verify provider credentials, DNS, the edge runtime, or the deployed service. Complete these checks after deploying:

1. Open the website, browse recipes, and refresh a recipe URL directly. The page should load, not return a hosting 404.
2. Open `/api/v1/health/ready` on the website. Confirm a JSON response, not the React HTML page.
3. Register a test account, log in, reload, and open the site in another tab. Confirm the account stays signed in and logout clears it. Check the refresh cookie is secure, HTTP-only, and belongs to the website domain.
4. Upload an image, create a recipe, edit it, and remove the test content afterward. Confirm the image is stored in the intended Cloudinary environment.
5. Test email verification and password recovery with an allowed recipient. A successful password reset must invalidate existing sessions. Public email delivery remains blocked until a sender domain is verified.
6. Confirm direct application requests to Render are rejected while both health endpoints remain accessible. Check Render logs for startup/index failures without copying credentials into issues or screenshots.
7. Let the free Render service idle, then revisit. A cold start can produce a temporary unavailable message. Wait and try again; do not repeatedly resubmit a form.

Rate-limit counters are held in one API process and reset on restart. This configuration is intended for a single Render instance. Shared rate-limit storage is required before scaling across instances.

For a failed release, redeploy the last working application version and restore its matching environment settings. Application rollback does not reverse database writes; back up production data before any future data migration.

## References

- [Render Blueprint settings](https://render.com/docs/blueprint-spec)
- [Render outbound IP addresses](https://render.com/docs/outbound-ip-addresses)
- [Netlify edge environment variables](https://docs.netlify.com/build/edge-functions/environment-variables/)
- [Netlify edge request handling](https://docs.netlify.com/build/edge-functions/api/)
- [Resend domain verification](https://resend.com/docs/dashboard/domains/introduction)
- [Resend quotas and limits](https://resend.com/docs/knowledge-base/account-quotas-and-limits)
