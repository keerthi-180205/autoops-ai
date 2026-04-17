import os
import urllib.request
import json

key = os.environ.get('GEMINI_API_KEY')
url = f'https://generativelanguage.googleapis.com/v1beta/models?key={key}'
response = urllib.request.urlopen(url)
models = json.loads(response.read().decode())['models']
for m in models:
    if 'generateContent' in m.get('supportedGenerationMethods', []) and 'gemini' in m['name']:
        print(m['name'])
