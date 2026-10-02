UPDATE agents SET ai_provider='anthropic', ai_model='claude-sonnet-5-5'
WHERE lower(role) IN ('coding agent','coding','developer','development');

UPDATE agents SET ai_provider='openai', ai_model='gpt-6-luna'
WHERE lower(role) IN ('testing agent','testing','tester','qa');

UPDATE agents SET ai_provider='gemini', ai_model='gemini-3.8-flash'
WHERE lower(role) IN ('documentation agent','documentation','document','writer');
