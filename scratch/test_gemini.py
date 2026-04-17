import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
print(f"Using API Key starting with: {api_key[:10]}...")

client = genai.Client(api_key=api_key)

try:
    print("Attempting to call Gemini...")
    # Use gemini-1.5-flash as it is most likely to be available
    response = client.models.generate_content(
        model='gemini-1.5-flash',
        contents='Hello, are you there?'
    )
    print("Response received:")
    print(response.text)
except Exception as e:
    print(f"Error occurred: {type(e).__name__}: {e}")
