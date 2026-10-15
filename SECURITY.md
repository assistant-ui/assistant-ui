# Reporting Security Issues

We take security bugs in assistant-ui seriously. We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.

To report a security issue, please use the GitHub Security Advisory ["Report a Vulnerability"](https://github.com/assistant-ui/assistant-ui/security/advisories/new) tab. Do not open a public issue or pull request for a vulnerability, and that includes findings from maintainers, audits, and coding agents.

If you cannot use GitHub, email [security@assistant-ui.com](mailto:security@assistant-ui.com). To encrypt your report, use our [PGP key](#pgp-key) (fingerprint `B86D FB72 8A96 0262 ACE0 26BD 6DB8 1BBC 50A3 337E`).

## Scope

In scope: the packages published from this repository, the shadcn registry components, and the hosted services on assistant-ui.com.

A vulnerability is a way for untrusted input (model output, tool results, MCP servers, remote agents, or another user) to run code, bypass authorization, read or change another user's data, gain privileges it should not have, read or send credentials, cross an origin or sandbox boundary, or exhaust a hosted service. These are examples, not a complete list. Hardening with no exploit path can be a public issue.

## What to include

The affected package, component or service, its version or deployment if you know it, a minimal reproduction or proof of concept, and the impact you expect.

## What happens next

Our team will send a response indicating the next steps in handling your report. After the initial reply to your report, the security team will keep you informed of the progress towards a fix and full announcement, and may ask for additional information or guidance.

## Supported Versions

Security fixes are released for the latest version of each published `@assistant-ui/*` package. Please upgrade to the latest release before reporting.

## PGP Key

```
-----BEGIN PGP PUBLIC KEY BLOCK-----

mDMEasnQ2RYJKwYBBAHaRw8BAQdAtoNliNrHrU45UKXYEgsspeHlqU+D70ecN4S4
Z0JujQS0QWFzc2lzdGFudC11aSBTZWN1cml0eSAoU2ltb24gRmFyc2hpZCkgPHNl
Y3VyaXR5QGFzc2lzdGFudC11aS5jb20+iLUEExYKAF0WIQS4bftyipYCYqzgJr1t
uBu8UKMzfgUCasnQ2RsUgAAAAAAEAA5tYW51MiwyLjUrMS4xMiwwLDMCGwMFCQWj
moAFCwkIBwICIgIGFQoJCAsCBBYCAwECHgcCF4AACgkQbbgbvFCjM34cKQD7B1px
02xPHx+Fe/YUGIWiOGuCQ5Six1RvUEAeQU+uP+4A/2H8kB57Pf26Qw+bxAJ+eCNT
A8kaILOBUomrVgAegKEGuDgEasnQ7xIKKwYBBAGXVQEFAQEHQMt/RcQtEqpYWlSG
gULwQ5+ei+U9hAZ/vmdCLlhkQeBpAwEIB4iaBBgWCgBCFiEEuG37coqWAmKs4Ca9
bbgbvFCjM34FAmrJ0O8bFIAAAAAABAAObWFudTIsMi41KzEuMTIsMCwzAhsMBQkF
o5qAAAoJEG24G7xQozN+3WIA/0o4tir3HlAL9qorzutzqhFQKTyZo7dyb0L4B5dX
h4x4AP9K3HMcyZzOcTUFaJ4w1GS+JzRIhTJPqNya+vA0PRmFBQ==
=Euk7
-----END PGP PUBLIC KEY BLOCK-----
```
