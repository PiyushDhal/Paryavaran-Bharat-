import os
import logging
import google.generativeai as genai
from google.api_core.exceptions import (
    GoogleAPICallError,
    InvalidArgument,
    ResourceExhausted,
    InternalServerError,
)

logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        # Handle default placeholder in .env
        if self.api_key == "your-gemini-api-key-here":
            self.api_key = None
        self.model_name = "gemini-1.5-flash"
        self._initialized = False

    def initialize(self):
        # Fetch it dynamically in case it got set after module import
        self.api_key = os.environ.get("GEMINI_API_KEY")
        if self.api_key == "your-gemini-api-key-here":
            self.api_key = None
            
        if not self.api_key:
            logger.error("[GEMINI SERVICE] GEMINI_API_KEY environment variable is missing or set to placeholder. Gemini AI service initialization failed.")
            raise ValueError("GEMINI_API_KEY environment variable is not configured.")
        
        genai.configure(api_key=self.api_key)
        self._initialized = True
        logger.info(f"[GEMINI SERVICE] Gemini SDK initialized successfully using model: {self.model_name}")

    def validate_key(self) -> bool:
        try:
            if not self._initialized:
                self.initialize()
            # Send a micro-request to validate key auth
            model = genai.GenerativeModel(self.model_name)
            response = model.generate_content("hello", generation_config={"max_output_tokens": 5})
            if response and response.text:
                logger.info("[GEMINI SERVICE] Live API validation succeeded.")
                return True
        except Exception as e:
            logger.error(f"[GEMINI SERVICE] Live API validation failed: {e}")
            return False
        return False

    def generate_content(
        self,
        prompt: str,
        system_instruction: str | None = None,
        response_mime_type: str | None = None,
        temperature: float = 0.7,
        max_output_tokens: int | None = None
    ) -> str:
        if not self._initialized:
            self.initialize()
        
        try:
            model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=system_instruction
            )
            
            generation_config = {
                "temperature": temperature,
            }
            if response_mime_type:
                generation_config["response_mime_type"] = response_mime_type
            if max_output_tokens:
                generation_config["max_output_tokens"] = max_output_tokens
                
            response = model.generate_content(
                prompt,
                generation_config=generation_config
            )
            
            if not response or not response.text:
                raise ValueError("Received an empty response from the Gemini API.")
                
            return response.text
            
        except InvalidArgument as e:
            logger.error(f"[GEMINI SERVICE] Invalid API Key or arguments: {e}")
            raise ValueError("Invalid Gemini API Key or prompt arguments.") from e
        except ResourceExhausted as e:
            logger.error(f"[GEMINI SERVICE] Gemini API rate limit or quota exceeded: {e}")
            raise ValueError("Gemini API rate limit or quota exceeded. Please try again later.") from e
        except InternalServerError as e:
            logger.error(f"[GEMINI SERVICE] Gemini internal server error: {e}")
            raise ValueError("Gemini API internal server error. Please retry in a moment.") from e
        except GoogleAPICallError as e:
            logger.error(f"[GEMINI SERVICE] Gemini API call failed: {e}")
            raise ValueError(f"Gemini API call failed: {e.message}") from e
        except Exception as e:
            logger.error(f"[GEMINI SERVICE] Unexpected error during content generation: {e}")
            raise ValueError(f"Gemini service encountered an unexpected error: {str(e)}") from e

# Global single instance
gemini_service = GeminiService()
