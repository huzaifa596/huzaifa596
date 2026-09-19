# Consent-based GitHub redirect

This Cloudflare Worker provides a transparent `/github` redirect for résumé and application links.

After a visitor explicitly clicks **I understand — continue to GitHub**, the Worker sends a small email summary containing:

- source tag (`resume`, `linkedin`, or another campaign label);
- approximate country and city from Cloudflare request metadata;
- device category, browser, and operating system; and
- UTC timestamp.

The Worker does not store a raw IP address or create a browser fingerprint. City and location are approximate and may be unavailable or inaccurate when a visitor uses a VPN, proxy, or mobile network.

## Deploy

Install and authenticate Wrangler, then run these commands from this directory:

```powershell
npm install -g wrangler
wrangler login
wrangler secret put RESEND_API_KEY
wrangler secret put ALERT_TO
wrangler secret put MAIL_FROM
wrangler deploy
```

`MAIL_FROM` must be an address allowed by your Resend account, for example `Profile alerts <alerts@your-domain.com>`.

After deployment, test these URLs:

```text
https://YOUR_WORKER.workers.dev/github?source=resume
https://YOUR_WORKER.workers.dev/github?source=linkedin
```

Use the deployed URL in your résumé and application links. The profile repository can link to it with a source tag, but the redirect should not be enabled in the README until deployment and secrets are complete.
