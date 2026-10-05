/**
 * Parse an RSS, Atom, or RDF feed into FeedNimbus' article shape.
 *
 * @param {string} xml
 * @param {DOMParser} [parser]
 * @returns {{title: string, link: string}[]}
 */
export function parseFeed(xml, parser = new DOMParser()) {
  const document = parser.parseFromString(xml, "application/xml");

  if (document.querySelector("parsererror")) {
    throw new Error("The feed contains invalid XML.");
  }

  const entries = [...document.querySelectorAll("item, entry")];
  if (entries.length === 0) {
    throw new Error("The document is not a supported RSS, Atom, or RDF feed.");
  }

  return entries.flatMap(entry => {
    const title = entry.querySelector("title")?.textContent?.trim();
    const link = getEntryLink(entry);

    return title && link ? [{title, link}] : [];
  });
}

function getEntryLink(entry) {
  const links = [...entry.querySelectorAll("link")];
  const alternate = links.find(link => {
    const relation = link.getAttribute("rel");
    return link.hasAttribute("href") && (!relation || relation === "alternate");
  });

  if (alternate) {
    return alternate.getAttribute("href")?.trim() || "";
  }

  const textLink = links.find(link => link.textContent?.trim());
  if (textLink) {
    return textLink.textContent.trim();
  }

  return entry.querySelector("id")?.textContent?.trim() || "";
}

/**
 * Fetch all feeds while retaining results from feeds that succeed.
 *
 * @param {string[]} urls
 * @param {typeof fetch} [fetchFeed]
 * @returns {Promise<{articles: {title: string, link: string}[], errors: Error[]}>}
 */
export async function fetchFeeds(urls, fetchFeed = fetch) {
  const results = await Promise.allSettled(urls.map(async url => {
    const endpoint = `/api/rss?url=${encodeURIComponent(url)}`;
    const response = await fetchFeed(endpoint);
    if (!response.ok) {
      throw new Error(`The feed endpoint returned HTTP ${response.status}.`);
    }
    return parseFeed(await response.text());
  }));

  const articles = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      articles.push(...result.value);
    } else {
      const reason = result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
      errors.push(new Error(`Could not load ${urls[index]}: ${reason}`));
    }
  });

  return {articles, errors};
}

/**
 * Extract the most frequent proper nouns and group matching headlines.
 *
 * @param {{title: string, link: string}[]} articles
 * @param {string[]} stopwords
 * @param {(text: string) => object} tagger
 * @returns {Record<string, {title: string, link: string}[]>}
 */
export function buildTopics(articles, stopwords, tagger) {
  const filteredWords = new Set(stopwords.map(word => word.toLowerCase()));
  const counts = new Map();

  articles.forEach(article => {
    const properNouns = tagger(article.title.replace(/\?\!\.,/g, ""))
      .match("#ProperNoun")
      .terms()
      .out("array");

    properNouns.forEach(token => {
      if (token.length > 2 && !filteredWords.has(token.toLowerCase())) {
        counts.set(token, (counts.get(token) || 0) + 1);
      }
    });
  });

  const topics = {};
  [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 70)
    .forEach(([token]) => {
      topics[token] = articles.filter(article => article.title.includes(token));
    });

  return topics;
}
