# Security Report — users-api

## Overview

This report describes the security controls implemented in the users-api project for Assignment 2.5. The API uses request validation, security headers, an origin allow-list, CSRF protection and rate limiting, alongside authentication and authorization controls.

## OWASP Top 10 (2021)

| Category | Defence in users-api |
|---|---|
| A01: Broken Access Control | Authentication middleware protects private routes, while role-based and attribute-based authorization policies restrict access to protected operations. |
| A02: Cryptographic Failures | Passwords are hashed using scrypt with salt, JWTs are signed, and Helmet enables HTTP Strict Transport Security (HSTS) when served over HTTPS. |
| A03: Injection | Strict Zod schemas validate request bodies, reject unexpected fields and constrain input values such as names. |
| A04: Insecure Design | Login and API rate limits reduce automated abuse. Refresh-token reuse detection provides an additional safeguard. |
| A05: Security Misconfiguration | Helmet sets security headers, CORS uses an origin allow-list, and origin verification protects cookie-based refresh and logout requests. |
| A06: Vulnerable and Outdated Components | Dependencies are recorded in the lock file, npm audit checks known vulnerabilities, and GitHub Dependabot alerts and security updates are enabled. |
| A07: Identification and Authentication Failures | Password validation, JWT authentication, generic login failure responses and authentication rate limiting help protect user accounts. |
| A08: Software and Data Integrity Failures | JWT signature verification and algorithm restrictions help prevent token tampering. npm ci installs dependency versions recorded in the lock file. |
| A09: Security Logging and Monitoring Failures | Request IDs and application response-time logging help trace requests. Centralized security monitoring and alerting are not yet implemented. |
| A10: Server-Side Request Forgery (SSRF) | The API does not fetch arbitrary user-supplied URLs. GitHub OAuth endpoints are configured by the application, and upload storage keys are managed by the application. |

## Remaining Weakness and Proposed Fix

A remaining weakness is that rate-limit counters are stored in the API process. If the application runs as multiple instances, each instance may maintain a separate counter. This could allow an attacker to distribute requests across instances.

**Proposed fix:** Use a shared Redis-backed rate-limit store, such as rate-limit-redis, so all API instances use the same counters. This would make rate limiting more consistent when the API is scaled horizontally.

## Conclusion

The project applies several layers of security, including strict input validation, authentication and authorization, secure HTTP headers, origin checks, rate limiting and dependency auditing. Regular testing, dependency updates and security reviews should continue to improve the API's protection.
