import os
import urllib.request
import urllib.error
import json

key = os.environ.get('GEMINI_API_KEY')

models_to_test = [
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview',
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]

for m in models_to_test:
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}'
    data = json.dumps({'contents': [{'parts': [{'text': 'hi'}]}]}).encode()
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req)
        print(f"{m} -> SUCCESS")
    except urllib.error.HTTPError as e:
        print(f"{m} -> HTTP {e.code}")
    except Exception as e:
        print(f"{m} -> ERROR {e}")
