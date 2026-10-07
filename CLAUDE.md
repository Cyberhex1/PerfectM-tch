# PerfectM-tch

## Creating sites

"Create a site named X" means: build the site in `sites/X/` and deploy it to
Cloudflare Pages as project `X`, so it lives at `X.pages.dev`. Don't ask for
confirmation first — that request is the go-ahead.

- Account ID: `64ceeb57f5645c1abf60cc81de59ff38`
- Create the project if it doesn't exist:
  `npx wrangler pages project create X --production-branch main`
- Deploy:
  `npx wrangler pages deploy sites/X --project-name X --branch main`
- Wrangler needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the environment.
- Existing projects on the account: candied, coworkingbrew, carahealth, zeroroll,
  zroll, cozydispatch, mentalmedic, cozygnews, gbts, cg2 (cg2-lk9.pages.dev).
  Pick a different name rather than overwriting one of these unless told to update it.
