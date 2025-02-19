import os
import re
from nltk import pos_tag, word_tokenize, download as nltk_download
from flask import Flask, current_app

app = Flask(__name__)

from flask_restful import Resource, Api, reqparse
from flask_cors import CORS

cors = CORS(app, resources={r"/*": {"origins": "*"}})

parser = reqparse.RequestParser()
parser.add_argument('urls', action='append')

parser_headlines = parser.copy()
parser_headlines.add_argument('word')

parser_feeds = reqparse.RequestParser()
parser_feeds.add_argument('feeds', action='append')

parser_stopwords = reqparse.RequestParser()
parser_stopwords.add_argument('words', action='append')

api = Api(app)

@app.route('/')
def index():
    return current_app.send_static_file('wordcloud.html')
@app.route('/headlines.css')
def headlines_css():
    return current_app.send_static_file('css/headlines.css')
@app.route('/loading.css')
def loading_css():
    return current_app.send_static_file('css/loading.css')
@app.route('/settings.css')
def settings_css():
    return current_app.send_static_file('css/settings.css')
@app.route('/headlines.js')
def headlines_js():
    return current_app.send_static_file('js/headlines.js')
@app.route('/wordcloud.js')
def wordcloud_js():
    return current_app.send_static_file('js/wordcloud.js')

def sort_dict(dict):
    return sorted(dict.items(), key = lambda item: item[1], reverse = True)

def get_feeds():
    with open("feeds", "r") as f:
        feeds=f.read()
        return feeds.splitlines()

def get_stopwords():
    with open("stopwords", "r") as f:
        stopwords=f.read()
        return stopwords.splitlines()

def get_articles(urls, word=None):
    import feedparser
    headlines = []
    for url in urls:
        feed = feedparser.parse(url)
        articles = feed.entries
        headlines = headlines + [{'title': article['title'], 'link': article['link']} for article in articles]
    if word:
        headlines = [headline for headline in headlines if word in headline['title']]
    return headlines

def get_words(urls):
    headlines = get_articles(urls)
    stopwords = get_stopwords()
    titles = [headline['title'] for headline in headlines]

    tokens = []
    for title in titles:
        list_tokens = re.sub("[^a-zA-Zàâáôõóçóúíãéê'\s-]", '', title).split(' ')
        for ind_token in range(len(list_tokens) - 1):
          token = list_tokens[ind_token]
          next_token = list_tokens[ind_token + 1]
          if len(token) > 2 and token[0].isupper() == True and token.lower() not in stopwords:
            if len(next_token) > 2 and next_token[0].isupper() == True and next_token.lower() not in stopwords:
                tokens.append(token + " " + next_token)
                continue
            tokens.append(token)
    count_tokens = {}
    for token in tokens:
        if token in count_tokens:
            count_tokens[token] += 1
            continue
        count_tokens[token] = 1
    count_tokens = {k: v for k, v in sort_dict(count_tokens)}
    list_tokens = list(count_tokens.keys())[:70]
    dict_tokens = {token: [headline for headline in headlines if token in headline['title']] for token in list_tokens}
    
    return dict_tokens

def get_nouns(urls):
    print(urls)
    headlines = get_articles(urls)
    stopwords = get_stopwords()
    titles = [headline['title'] for headline in headlines]

    tokens = []
    for title in titles:
        list_tokens = word_tokenize(title)
        tagged_tokens = pos_tag(list_tokens)
        for token in tagged_tokens:
          if len(token[0]) > 2 and token[1] == 'NNP' and token[0].lower() not in stopwords:
              tokens.append(token[0])
    count_tokens = {}
    for token in tokens:
        if token in count_tokens:
            count_tokens[token] += 1
            continue
        count_tokens[token] = 1
    count_tokens = {k: v for k, v in sort_dict(count_tokens)}
    list_tokens = list(count_tokens.keys())[:70]
    dict_tokens = {token: [headline for headline in headlines if token in headline['title']] for token in list_tokens}
    
    return dict_tokens

# Routes
class wordcloud(Resource):
    def post(self):
        urls = get_feeds()
        print(urls)
        return {'words': get_nouns(urls)}, 200, { 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers': '*', 'Vary': 'Accept-Encoding, Origin' }

class headlines(Resource):
    def post(self):
        args = parser_headlines.parse_args()
        urls = args['urls']
        word = args['word']
        return {'headlines': get_articles(urls, word)}, 200, { 'Access-Control-Allow-Origin' : '*' }

class feeds(Resource):
    def post(self):
      args = parser_feeds.parse_args()
      feeds = args['feeds']
      with open("feeds", "w") as f:
          f.write("\n".join(feeds))
      return 200, { 'Access-Control-Allow-Origin' : '*' }
      
    def get(self):
      urls = get_feeds()
      return {'feeds': urls}, 200, { 'Access-Control-Allow-Origin' : '*' }

class stopwords(Resource):
    def post(self):
      args = parser_stopwords.parse_args()
      words = args['words']
      with open("stopwords", "w") as f:
          f.write("\n".join(words))
      return 200, { 'Access-Control-Allow-Origin' : '*' }
      
    def get(self):
      stopwords = get_stopwords()
      return {'stopwords': stopwords}, 200, { 'Access-Control-Allow-Origin' : '*' }


api.add_resource(wordcloud, '/wordcloud')
api.add_resource(headlines, '/headlines')
api.add_resource(feeds, '/feeds')
api.add_resource(stopwords, '/stopwords')

if __name__ == '__main__':
    nltk_download('punkt_tab')
    nltk_download('averaged_perceptron_tagger_eng')
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
