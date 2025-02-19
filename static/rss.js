const RSS = require('vanilla-rss');

function getData(links) {
  const entries;
  const rss = new RSS(
    document.querySelector("#rss-feeds"),
    "https://partnernetwork.ebay.de/epn-blog?format=rss",
    {}
  ).on("data", (data) => {
    entries = data.entries;
  });
  return entries;
}
