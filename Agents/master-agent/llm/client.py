"""
LLM Client — initializes the LLM using keys from the environment.
Supports OpenAI (GPT-4o) and falls back gracefully.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_client: OpenAI | None = None


def get_llm_client() -> OpenAI:
    """Return a singleton OpenAI client, initialized from OPENAI_API_KEY env var."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENAI_API_KEY is not set. "
                "Add it to your .env file or environment variables."
            )
        _client = OpenAI(api_key=api_key)
    return _client


def call_llm(system_prompt: str, user_prompt: str, model: str = "gpt-4o") -> str:
    """
    Send a chat completion request to the LLM.

    Args:
        system_prompt: The strict system instruction string.
        user_prompt: The natural-language user input.
        model: Which OpenAI model to use.

    Returns:
        Raw string content from the LLM response.
    """
    client = get_llm_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,  # Deterministic — we need strict JSON, no creativity
    )
    return response.choices[0].message.content.strip()
