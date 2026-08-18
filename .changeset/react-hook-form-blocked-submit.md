---
"@assistant-ui/react-hook-form": patch
---

fix: validate assistant-triggered form submissions before reporting success

Assistant-triggered submissions now respect native constraints and report React Hook Form validation results while preserving the form's normal valid and invalid submission lifecycle.
