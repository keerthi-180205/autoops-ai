import os
from google import genai
from dotenv import load_dotenv

load_dotenv()

_client: genai.Client | None = None


def get_llm_client() -> genai.Client:
    """Return a singleton Gemini client, initialized from GEMINI_API_KEY env var."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "GEMINI_API_KEY is not set. "
                "Add it to your .env file or environment variables."
            )
        _client = genai.Client(api_key=api_key)
    return _client


def call_llm(system_prompt: str, user_prompt: str, model: str = "gemini-3.1-flash-lite-preview") -> str:
    """
    Send a chat completion request to the LLM.

    Args:
        system_prompt: The strict system instruction string.
        user_prompt: The natural-language user input.
        model: Which Gemini model to use.

    Returns:
        Raw string content from the LLM response.
    """
    client = get_llm_client()
    response = client.models.generate_content(
        model=model,
        contents=user_prompt,
        config={
            "system_instruction": system_prompt,
            "temperature": 0.0,
        }
    )
    return response.text.strip()
