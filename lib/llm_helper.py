#!/usr/bin/env python3
"""
LLM helper invoked by Next.js via child_process.
Reads JSON from stdin, returns JSON via stdout.

Input:  { api_key, session_id, system_message, history, text, image_base64?, provider, model }
Output: { ok, reply, input_tokens, output_tokens, total_tokens, model, error? }
"""
import sys, json, asyncio, os, traceback

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent


async def run(payload):
    api_key = payload.get('api_key') or os.environ.get('EMERGENT_LLM_KEY')
    session_id = payload['session_id']
    system_message = payload.get('system_message', 'You are a helpful assistant.')
    history = payload.get('history') or []
    text = payload.get('text', '')
    image_b64 = payload.get('image_base64')
    provider = payload.get('provider', 'anthropic')
    model = payload.get('model', 'claude-sonnet-4-5-20250929')

    # Build initial_messages: system + prior history
    initial_messages = [{"role": "system", "content": system_message}]
    for m in history:
        role = m.get('role')
        content = m.get('content')
        if role in ('user', 'assistant') and content is not None:
            initial_messages.append({"role": role, "content": content})

    chat = LlmChat(
        api_key=api_key,
        session_id=session_id,
        system_message=system_message,
        initial_messages=initial_messages,
    ).with_model(provider, model)

    # Patch _execute_completion to capture usage
    captured = {}
    orig = chat._execute_completion

    async def patched(messages):
        response = await orig(messages)
        try:
            usage = getattr(response, 'usage', None)
            if usage is not None:
                captured['prompt_tokens'] = int(getattr(usage, 'prompt_tokens', 0) or 0)
                captured['completion_tokens'] = int(getattr(usage, 'completion_tokens', 0) or 0)
                captured['total_tokens'] = int(getattr(usage, 'total_tokens', 0) or 0)
        except Exception:
            pass
        return response

    chat._execute_completion = patched

    file_contents = []
    if image_b64:
        # Strip data URL prefix if present
        if ',' in image_b64 and image_b64.startswith('data:'):
            image_b64 = image_b64.split(',', 1)[1]
        file_contents.append(ImageContent(image_base64=image_b64))

    user_msg = UserMessage(text=text, file_contents=file_contents)
    reply = await chat.send_message(user_msg)

    return {
        'ok': True,
        'reply': reply,
        'input_tokens': captured.get('prompt_tokens', 0),
        'output_tokens': captured.get('completion_tokens', 0),
        'total_tokens': captured.get('total_tokens', 0),
        'model': model,
        'provider': provider,
    }


def main():
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        result = asyncio.run(run(payload))
        sys.stdout.write(json.dumps(result))
    except Exception as e:
        sys.stdout.write(json.dumps({
            'ok': False,
            'error': str(e),
            'trace': traceback.format_exc(),
        }))


if __name__ == '__main__':
    main()
