import os
from google import genai
from google.genai import errors

client = genai.Client(api_key=os.getenv('GEMINI_API_KEY'))

models_to_test = [
    'gemini-2.0-flash-lite',
    'gemini-flash-lite-latest',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview'
]

results = {}

for model in models_to_test:
    try:
        response = client.models.generate_content(
            model=model,
            contents="hi"
        )
        results[model] = "SUCCESS"
    except errors.ClientError as e:
        results[model] = f"ERROR: {e}"
    except Exception as e:
        results[model] = f"OTHER ERROR: {e}"

for model, status in results.items():
    print(f"{model}: {status}")
