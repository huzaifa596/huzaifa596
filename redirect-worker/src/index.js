const DEFAULT_SOURCE = "github-profile";
const GITHUB_URL = "https://github.com/huzaifa596";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const source = cleanSource(url.searchParams.get("source"));

    if (url.pathname !== "/" && url.pathname !== "/github") {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "GET") {
      return consentPage(source);
    }

    if (request.method === "POST") {
      return continueToGitHub(request, env, ctx, source);
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, POST" },
    });
  },
};

async function continueToGitHub(request, env, ctx, source) {
  const form = await request.formData();
  if (form.get("consent") !== "yes") {
    return new Response("Consent is required to continue.", { status: 400 });
  }

  const metadata = summarizeVisitor(request, source);
  // Keep the redirect fast; email delivery continues after the response is sent.
  ctx.waitUntil(
    sendAlert(env, metadata).catch((error) => {
      console.error("Visitor alert failed", error);
    }),
  );

  return Response.redirect(GITHUB_URL, 302);
}

function summarizeVisitor(request, source) {
  const cf = request.cf || {};
  const userAgent = request.headers.get("user-agent") || "Unknown";

  return {
    source,
    country: cf.country || "Unknown",
    city: cf.city || "Approximate / unavailable",
    device: deviceType(userAgent),
    browser: browser(userAgent),
    operatingSystem: operatingSystem(userAgent),
    timeUtc: new Date().toISOString(),
  };
}

async function sendAlert(env, visitor) {
  if (!env.RESEND_API_KEY || !env.ALERT_TO || !env.MAIL_FROM) {
    return;
  }

  const text = [
    "Someone continued to your GitHub profile.",
    "",
    `Source: ${visitor.source}`,
    `Country: ${visitor.country}`,
    `City (approx.): ${visitor.city}`,
    `Device: ${visitor.device}`,
    `Browser: ${visitor.browser}`,
    `Operating system: ${visitor.operatingSystem}`,
    `Time (UTC): ${visitor.timeUtc}`,
    "",
    "No raw IP address or browser fingerprint was stored.",
  ].join("\n");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.MAIL_FROM,
      to: [env.ALERT_TO],
      subject: "GitHub profile link visit",
      text,
    }),
  });
}

function cleanSource(value) {
  return (value || DEFAULT_SOURCE).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40) || DEFAULT_SOURCE;
}

function deviceType(userAgent) {
  if (/bot|crawler|spider/i.test(userAgent)) return "Bot / crawler";
  if (/tablet|ipad/i.test(userAgent)) return "Tablet";
  if (/mobile|android|iphone|ipod/i.test(userAgent)) return "Mobile";
  return "Desktop";
}

function browser(userAgent) {
  if (/Edg\//i.test(userAgent)) return "Edge";
  if (/Firefox\//i.test(userAgent)) return "Firefox";
  if (/Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent)) return "Chrome";
  if (/Safari\//i.test(userAgent) && !/Chrome\//i.test(userAgent)) return "Safari";
  return "Other / unavailable";
}

function operatingSystem(userAgent) {
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "Other / unavailable";
}

function consentPage(source) {
  const escapedSource = escapeHtml(source);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Continue to Huzaifa's GitHub</title>
  <style>
    :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
    body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #0d1117; color: #c9d1d9; }
    main { width: min(92vw, 520px); padding: 32px; border: 1px solid #434a78; border-radius: 18px; background: #121626; box-sizing: border-box; }
    h1 { margin: 0 0 12px; color: #a5b4fc; font-size: 1.5rem; }
    p { line-height: 1.6; }
    .meta { color: #8b949e; font-size: .9rem; }
    button { border: 0; border-radius: 10px; padding: 12px 18px; background: #818cf8; color: #0d1117; font-weight: 700; cursor: pointer; }
    button:hover { background: #a5b4fc; }
  </style>
</head>
<body>
  <main>
    <h1>Continue to Huzaifa's GitHub</h1>
    <p>Before continuing, you can choose to share approximate visit details with Huzaifa: country, approximate city, device category, browser, and operating system.</p>
    <p class="meta">No raw IP address or browser fingerprint is stored. Source: ${escapedSource}.</p>
    <form method="post" action="/github?source=${escapedSource}">
      <input type="hidden" name="consent" value="yes" />
      <button type="submit">I understand — continue to GitHub</button>
    </form>
  </main>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}
