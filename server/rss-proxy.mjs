const DEFAULT_TIMEOUT_MS = 10_000;

async function decodeXmlResponse(response) {
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "";
  const headerCharset = contentType.match(/charset\s*=\s*["']?([^\s;"']+)/i)?.[1];
  const xmlDeclaration = new TextDecoder("windows-1252")
    .decode(bytes.subarray(0, 1024));
  const declaredCharset = xmlDeclaration
    .match(/<\?xml[^>]*\bencoding\s*=\s*["']([^"']+)["']/i)?.[1];

  let charset = headerCharset || declaredCharset || "utf-8";
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    charset = "utf-8";
  } else if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    charset = "utf-16le";
  } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    charset = "utf-16be";
  }

  return new TextDecoder(charset).decode(bytes);
}

/**
 * Platform-neutral Fetch API handler for the RSS proxy endpoint.
 *
 * @param {Request} request
 * @param {{fetchImpl?: typeof fetch, timeoutMs?: number}} [options]
 * @returns {Promise<Response>}
 */
export async function handleRssRequest(request, options = {}) {
  const {fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS} = options;

  if (request.method !== "GET") {
    return new Response("Method not allowed.", {status: 405, headers: {Allow: "GET"}});
  }

  const feedUrl = new URL(request.url).searchParams.get("url");
  let target;
  try {
    target = new URL(feedUrl);
    if (!/^https?:$/.test(target.protocol)) throw new Error();
  } catch {
    return new Response("A valid HTTP(S) feed URL is required.", {status: 400});
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstream = await fetchImpl(target, {
      headers: {Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*"},
      signal: controller.signal,
    });

    if (!upstream.ok) {
      return new Response(`Feed returned HTTP ${upstream.status}.`, {status: 502});
    }

    return new Response(await decodeXmlResponse(upstream), {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("The feed could not be fetched.", {status: 502});
  } finally {
    clearTimeout(timeout);
  }
}
