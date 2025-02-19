function controlElementsVisibility(elements) {
  for (const element of elements) {
    document.getElementById(element.id).style.display = element.show ? "block" : "none";
  }
}

function createWordCloud(words) {
  const cloudLayout = d3.layout.cloud()
    .size([700, 450])
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
    .attr("width", 600)
    .attr("height", 450)
    .append("g")
    .attr("transform", "translate(300,200)")
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
    .on("click", d => {
      console.log("Clicked on word:", d.target.textContent, window.location);
      getHeadlines(d.target.textContent, headlineData[d.target.textContent]);
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

  feedlist.innerHTML = "";
  
  fetch("http://127.0.0.1:5000/feeds", {
    method: 'get',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=utf-8',
    },
  })
    .then(response => response.json())
    .then(response => {
      const urls = response.feeds;
      feedlist.value = urls.join("\n");
    });

    fetch("http://127.0.0.1:5000/stopwords", {
    method: 'get',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=utf-8',
    },
  })
    .then(response => response.json())
    .then(response => {
      const sw = response.stopwords;
      stopwords.value = sw.join("\n");
    });
}

function sendStopwords() {
  const stopwords = document.getElementById("stopwords").value;
  const info = document.getElementById("info");

  info.innerHTML = "<h2>Word filters updated successfully!</h2>";
  info.style.display = "block";

  const stopwordsList = stopwords.split("\n");
  fetch("http://127.0.0.1:5000/stopwords", {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify({
      words: stopwordsList,
    })
  })
    .then(response => response.json())
    .then(response => {});
}

function sendFeeds() {
  const feedsElement = document.getElementById("feedlist");
  const info = document.getElementById("info");

  info.innerHTML = "<h2>Feed list updated successfully!</h2>";
  info.style.display = "block";

  const feeds = feedsElement.value;
  const feedsList = feeds.split("\n");
  fetch("http://127.0.0.1:5000/feeds", {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=utf-8',
    },
    body: JSON.stringify({
      feeds: feedsList,
    })
  })
    .then(response => response.json())
    .then(response => {});
}

function getWords() {
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

  const loadingWords = document.getElementById("loading-words");
  const wordCloud = document.getElementById("wordcloud");
  const newslist = document.getElementById("newslist");
  const title = document.getElementById("headlines-title");
  
  title.innerHTML = "";
  newslist.innerHTML = "";

  fetch("http://127.0.0.1:5000/wordcloud", {
    method: 'post',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json;charset=utf-8',
    },
  })
    .then(response => response.json())
    .then(response => {
      const result = response.words;
      const words = Object.keys(result).map(word => ({ text: word, size: 20 }));
      createWordCloud(words);
      Object.assign(headlineData, result);
      controlElementsVisibility([
        {id: "loading-words", show: false},
        {id: "wordcloud", show: true},
      ]);
      title.innerHTML = "Click on a word to see related news!";
    });
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

