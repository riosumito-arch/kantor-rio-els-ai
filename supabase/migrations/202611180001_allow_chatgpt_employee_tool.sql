-- ChatGPT employee selection uses the OpenAI API credentials configured server-side.
alter table public.ai_employees drop constraint if exists ai_employees_ai_provider_check;
alter table public.ai_employees
  add constraint ai_employees_ai_provider_check
  check (ai_provider in ('openai', 'anthropic', 'chatgpt'));
