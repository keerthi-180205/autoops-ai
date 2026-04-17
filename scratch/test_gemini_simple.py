import os
from google import genai

api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    print("GEMINI_API_KEY is NOT set in environment!")
else:
    print(f"Using API Key starting with: {api_key[:5]}...")

client = genai.Client(api_key=api_key)

try:
    print("Attempting to call Gemini...")
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='Hello, respond with ONLY the word SUCCESS'
    )
    print("Response received:")
    print(response.text)
except Exception as e:
    print(f"Error occurred: {type(e).__name__}: {e}")
