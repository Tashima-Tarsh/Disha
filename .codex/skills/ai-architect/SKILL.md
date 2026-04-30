# AI Architect Skill

Use this skill when adding or modifying DISHA AI workflows.

## Checklist

- Start from a controlled prompt template.
- Use deterministic settings for critical decisions.
- Validate model output with a typed schema or guard function.
- Provide fallback logic for invalid, unsafe, or unavailable model output.
- Log the decision, explanation, fallback status, and request ID.
- Avoid logging raw sensitive prompts or secrets.
- Critical web chat flows must validate input and output before streaming a response.
