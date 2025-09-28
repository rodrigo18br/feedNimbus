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
parser_feeds.add_argument('words', action='append')

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
@app.route('/cookies.js')
def cookies_js():
    return current_app.send_static_file('js/cookies.js')

def sort_dict(dict):
    return sorted(dict.items(), key = lambda item: item[1], reverse = True)

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


def get_nouns(urls, stopwords):
    headlines = get_articles(urls)
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
        args = parser_feeds.parse_args()
        feeds = args['feeds']
        stopwords = args['words']
        return {'words': get_nouns(feeds, stopwords)}, 200, { 'Access-Control-Allow-Origin' : '*', 'Access-Control-Allow-Headers': '*', 'Vary': 'Accept-Encoding, Origin' }

class headlines(Resource):
    def post(self):
        args = parser_headlines.parse_args()
        urls = args['urls']
        word = args['word']
        return {'headlines': get_articles(urls, word)}, 200, { 'Access-Control-Allow-Origin' : '*' }

api.add_resource(wordcloud, '/wordcloud')
api.add_resource(headlines, '/headlines')

if __name__ == '__main__':
    nltk_download('punkt_tab')
    nltk_download('averaged_perceptron_tagger_eng')
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
