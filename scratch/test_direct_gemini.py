import os
import urllib.request
import urllib.error
import json

key = os.environ.get('GEMINI_API_KEY')
url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={key}'
data = json.dumps({'contents': [{'parts': [{'text': 'hi'}]}]}).encode()
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})

try:
    response = urllib.request.urlopen(req)
    print("SUCCESS")
    print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR: {e.code}")
    print(e.read().decode())
except Exception as e:
    print(f"OTHER ERROR: {e}")
