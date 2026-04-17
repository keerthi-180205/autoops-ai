"""
LLM Client for Validation Agent — optional LLM-based edge case validation.
"""

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_client: OpenAI | None = None


def get_llm_client() -> OpenAI:
    """Return a singleton OpenAI client initialized from OPENAI_API_KEY."""
    global _client
    if _client is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise EnvironmentError(
                "OPENAI_API_KEY is not set. Add it to your .env file."
            )
        _client = OpenAI(api_key=api_key)
    return _client


def call_llm(system_prompt: str, user_prompt: str, model: str = "gpt-4o") -> str:
    """Send a chat completion request for edge-case validation reasoning."""
    client = get_llm_client()
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
    )
    return response.choices[0].message.content.strip()
