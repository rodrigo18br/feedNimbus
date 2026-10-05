import {buildTopics, fetchFeeds} from "./feed-reader.js";
import {getHeadlines} from "./headlines.js";

function controlElementsVisibility(elements) {
  for (const element of elements) {
    document.getElementById(element.id).style.display = element.show ? "block" : "none";
  }
}

function createWordCloud(words) {
  const cloudLayout = d3.layout.cloud()
    .size([550, 450])
    .padding(1.2)
    .rotate(() => 0)
    .font("Impact")
    .fontSize(d => d.size)
    .on("end", draw);

  cloudLayout.words(words).start();
}

function draw(words) {
  d3.select("#wordcloud")
    .html('')
    .append("svg")
    .attr("width", 550)
    .attr("height", 450)
    .append("g")
    .attr("transform", "translate(250,220)")
    .selectAll("text")
    .data(words)
    .enter()
    .append("text")
    .style("font-size", d => d.size + "px")
    .style("font-family", "Helvetica")
    .style("cursor", "zoom-in")
    .attr("text-anchor", "middle")
    .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
    .text(d => d.text)
    .on("mouseenter", function() {
      d3.select(this).style("text-decoration", "underline");
    })
    .on("mouseleave", function() {
      d3.select(this).style("text-decoration", "none");
    })
    .on("click", event => {
      const word = event.target.textContent;
      getHeadlines(word, headlineData[word]);
    });
}

const headlineData = {};

function showSettings() {
  controlElementsVisibility([
    {id: "loading-words", show: false},
    {id: "wordcloud", show: false},
    {id: "headlines", show: false},
    {id: "feeds", show: true},
    {id: "words", show: true}
  ]);

  const feedlist = document.getElementById("feedlist");
  const stopwords = document.getElementById("stopwords");

  const feeds = cookieManager.get("feeds") || [];
  const words = cookieManager.get("stopwords") || [];

  feedlist.value = feeds.join("\n");
  stopwords.value = words.join("\n");
}

function sendStopwords() {
  const stopwords = document.getElementById("stopwords").value;
  const info = document.getElementById("info");

  info.innerHTML = "<h2>Word filters updated successfully!</h2>";
  info.style.display = "block";

  const stopwordsList = splitSettings(stopwords);
  cookieManager.set("stopwords", stopwordsList);
}

function sendFeeds() {
  const feedsElement = document.getElementById("feedlist");
  const info = document.getElementById("info");

  info.innerHTML = "<h2>Feed list updated successfully!</h2>";
  info.style.display = "block";

  const feeds = feedsElement.value;
  const feedsList = splitSettings(feeds);
  cookieManager.set("feeds", feedsList);
}

function splitSettings(value) {
  return value.split("\n").map(item => item.trim()).filter(Boolean);
}

function showFeedErrors(errors, hasArticles) {
  const info = document.getElementById("info");
  const message = hasArticles
    ? `Some feeds could not be loaded (${errors.length}).`
    : "No feeds could be loaded. Check the feed URLs and their CORS settings.";
  info.replaceChildren(Object.assign(document.createElement("h2"), {textContent: message}));
  info.style.display = "block";
}

async function getWords() {
  controlElementsVisibility([
    {id: "loading-headlines", show: false},
    {id: "loading-words", show: true},
    {id: "wordcloud", show: false},
    {id: "loading-words", show: true},
    {id: "headlines", show: true},
    {id: "feeds", show: false},
    {id: "words", show: false},
    {id: "info", show: false},
  ]);

  const newslist = document.getElementById("newslist");
  const title = document.getElementById("headlines-title");
  
  title.textContent = "";
  newslist.innerHTML = "";
  const feeds = (cookieManager.get("feeds") || []).filter(Boolean);
  if (feeds.length === 0) {
    showSettings();
    return;
  }
  const stopwords = (cookieManager.get("stopwords") || []).filter(Boolean);

  const {articles, errors} = await fetchFeeds(feeds);
  const result = buildTopics(articles, stopwords, window.nlp);
  const cloudWords = Object.keys(result).map(word => ({text: word, size: 20}));

  Object.keys(headlineData).forEach(word => delete headlineData[word]);
  Object.assign(headlineData, result);
  createWordCloud(cloudWords);
  controlElementsVisibility([
    {id: "loading-words", show: false},
    {id: "wordcloud", show: true},
  ]);
  title.textContent = "Click on a word to see related news!";

  if (errors.length > 0) {
    showFeedErrors(errors, articles.length > 0);
  }
}

addEventListener("load", () => {
  const menu = document.getElementById("settings-icon");
  const reload = document.getElementById("reload-icon");
  const buttonStopwords = document.getElementById("confirmStopwords");
  const buttonFeeds = document.getElementById("confirmFeeds");

  menu.addEventListener("click", showSettings);
  reload.addEventListener("click", getWords);
  buttonStopwords.addEventListener("click", sendStopwords);
  buttonFeeds.addEventListener("click", sendFeeds);

  getWords();
});
