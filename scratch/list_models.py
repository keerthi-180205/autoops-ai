import os
import urllib.request
import urllib.error
import json

key = os.environ.get('GEMINI_API_KEY')
url = f'https://generativelanguage.googleapis.com/v1beta/models?key={key}'

try:
    response = urllib.request.urlopen(url)
    models = json.loads(response.read().decode())['models']
    print("Available models:")
    for m in models:
        print(f"- {m['name']} (supported methods: {m.get('supportedGenerationMethods', [])})")
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"OTHER ERROR: {e}")
