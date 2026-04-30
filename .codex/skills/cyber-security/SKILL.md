# Cyber Security Skill: DISHA Zero Trust

## Capabilities

- Implementing JWT-based stateless authentication.
- Designing RBAC (Role Based Access Control) logic.
- Mitigating OWASP Top 10 vulnerabilities (XSS, Injection, Broken Auth).
- Enforcing AES-256 encryption for sensitive system state.

## Workflow: Security Audit

1. **Request Interception**: Use `SentinelSecurityMiddleware` to validate all headers.
2. **Access Control**: Check user permissions before calling any service.
3. **Data Sanitization**: Validate all inputs using Pydantic strict mode.
4. **Audit Logging**: Record every auth event in the structured JSON logs.
