function getHeadlines(word, news) {
  const title = document.getElementById("headlines-title");
  const loadingHeadlines = document.getElementById("loading-headlines");
  const headlines = document.getElementById("headlines");
  const newslist = document.getElementById("newslist");
  const imgSize = 16;

  loadingHeadlines.style.display = "block";
  headlines.style.display = "none";
  title.innerHTML = word;

  newslist.innerHTML = "";

  news.forEach(headline => {
    const div = document.createElement("div");
    const element = document.createElement("div");
    const span = document.createElement("span");
    const li = document.createElement("li");
    const a = document.createElement("a");
    const img = document.createElement("img");

    div.classList.add("c-headline--horizontal-small");
    element.classList.add("c-headline__title");
    span.classList.add("comhead");
    a.href = headline.link;
    a.textContent = headline.title;
    a.target = "_blank";
    span.textContent = ` (${headline.link.split("/")[2]})`;
    img.src = `http://${headline.link.split("/")[2]}/favicon.ico`;
    img.height = img.width = imgSize;
    element.appendChild(img);
    element.appendChild(a);
    element.appendChild(span);
    div.appendChild(element);
    li.appendChild(div);
    newslist.appendChild(li);
  });

  loadingHeadlines.style.display = "none";
  headlines.style.display = "block";
}
