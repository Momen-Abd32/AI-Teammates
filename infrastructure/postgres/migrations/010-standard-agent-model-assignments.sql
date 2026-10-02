-- Default model assignments for the standard AI teammates.
-- Existing custom agents are untouched.
UPDATE agents SET ai_provider='anthropic', ai_model=COALESCE(NULLIF(ai_model,''),'claude-3-5-haiku-latest')
WHERE lower(role) IN ('coding agent','coding','developer','development');

UPDATE agents SET ai_provider='openai', ai_model=COALESCE(NULLIF(ai_model,''),'gpt-4o-mini')
WHERE lower(role) IN ('testing agent','testing','tester','qa');

UPDATE agents SET ai_provider='gemini', ai_model=COALESCE(NULLIF(ai_model,''),'gemini-2.5-flash')
WHERE lower(role) IN ('documentation agent','documentation','document','writer');
