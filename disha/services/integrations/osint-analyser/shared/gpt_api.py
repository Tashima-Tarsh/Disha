#!/usr/bin/env python3

import logging
logger = logging.getLogger(__name__)

try:
    from openai import OpenAI
    import openai
    import tiktoken
except ImportError:
    logger.error("'openai' or 'tiktoken' Python libraries not installed!")
    raise

# =========================================================================== #


class GPTModel:
    def __init__(self, name, cost_input, cost_output, token_limit):
        self.name = name
        self.cost_input = cost_input
        self.cost_output = cost_output
        self.token_limit = token_limit


class GPT3Turbo_4K(GPTModel):
    def __init__(self):
        # gpt-3.5-turbo is deprecated; use gpt-4o-mini (faster, cheaper, more capable)
        super().__init__('gpt-4o-mini', 0.00015, 0.0006, 128000)


class GPT3Turbo_16K(GPTModel):
    def __init__(self):
        # gpt-3.5-turbo-1106 is deprecated; use gpt-4o-mini
        super().__init__('gpt-4o-mini', 0.00015, 0.0006, 128000)


class GPT4_8K(GPTModel):
    def __init__(self):
        # gpt-4 (8K) is deprecated; use gpt-4o
        super().__init__('gpt-4o', 0.0025, 0.01, 128000)


class GPT4_32K(GPTModel):
    def __init__(self):
        # gpt-4-32k is deprecated; use gpt-4o (128K context window)
        super().__init__('gpt-4o', 0.0025, 0.01, 128000)

# =========================================================================== #


class GPT:
    COST_ROUNDING = 4
    TOKENS_DIV_BY = 1024

    def __init__(self, api_key, model):
        self.api_key = api_key
        self.model = model
        self.api_response = None
        self.messages = []
        self.total_cost = 0

    def reset(self):
        self.messages = []
        self.total_cost = 0

    def single_prompt(self, prompt):
        self.messages = [{'role': 'system', 'content': prompt}]
        response = self.execute()
        self.reset()
        return response

    def add_prompt(self, prompt):
        role = 'system' if not self.messages else 'user'
        self.messages.append({'role': role, 'content': prompt})

    def load_template(self, template_path, params=None):
        if params is None:
            params = {}

        with open(template_path, 'r') as file_handle:
            template = file_handle.read()
            # Perform substitutions
            for key, value in params.items():
                template = template.replace(f"{{{{%{key}%}}}}", value)
            return template

    def execute(self):
        try:
            client = OpenAI(api_key=self.api_key)
            self.api_response = client.chat.completions.create(
                model=self.model.name,
                messages=self.messages)
        except openai.APIConnectionError as err:
            logging.error(f"The connection to the OpenAI API failed: {err}")
            raise
        except openai.RateLimitError as err:
            logging.error(f"The OpenAI API returned a rate limiting error: {err}")
            raise
        except openai.APIStatusError as err:
            logging.error(f"The OpenAI API returned a non-200 status code: {err}")
            raise

        cost = self._get_cost(self.api_response)
        self.total_cost += cost

        first_choice = self.api_response.choices[0]
        content = first_choice.message.content

        self.messages.append({
            'role': first_choice.message.role,
            'content': content
        })

        response = {'api_response': self.api_response,
                    'response': content,
                    'cost': cost}

        return response

    def _get_cost(self, api_response):
        input_cost = round((api_response.usage.prompt_tokens / self.TOKENS_DIV_BY)
                           * self.model.cost_input, self.COST_ROUNDING)
        output_cost = round((api_response.usage.completion_tokens / self.TOKENS_DIV_BY)
                            * self.model.cost_output, self.COST_ROUNDING)
        return input_cost + output_cost

    def _get_token_count(self, input_str):
        encoding = tiktoken.encoding_for_model(self.model.name)
        return len(encoding.encode(input_str))

    def token_truncate(self, input_str, max_tokens):
        encoding = tiktoken.encoding_for_model(self.model.name)
        encoded = encoding.encode(input_str)[:max_tokens]
        return encoding.decode(encoded)

# =========================================================================== #
