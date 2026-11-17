# Verification record — 17 November 2026

The Vercel application uses Gemini 3.1 Flash Lite configured server-side. Seven deterministic tests cover request limits, method/origin validation, credential gates, provider quota responses, source quote matching and malformed output. Build and formatting are checked separately.

A live fictional review and a 30-to-60-day/liability-cap comparison returned valid exact source passages. Initial missing-information testing revealed that the model sometimes gave a generic summary; the task prompt was changed and the missing-answer assertion tightened. The opt-in scripts/live.mjs records subsequent results. These few checks do not establish the large accuracy benchmark proposed in BUILD_PLAN.md.

Browser inspection confirmed the deployed workspace renders with labeled inputs and controls. Further browser automation was interrupted by a tab-session error. Complete keyboard, screen-reader, mobile, PDF edge-case and WCAG testing is not established. No professional legal accuracy claim is made.

The prototype uses Vite/JavaScript and a Vercel API rather than the proposed Next.js/TypeScript stack. Shared distributed quotas, deterministic clause alignment, obligation tables and the full synthetic evaluation dataset are not implemented. Access-token protection restricts live API usage. The planning document remains a roadmap, not a completion report.

## Final smoke run

A subsequent live run against the deployed Gemini 3.1 Flash Lite endpoint passed all three smoke checks: review (3,414 ms), comparison (3,398 ms), missing-information response (3,027 ms). The missing-information answer explicitly stated that no refund period was specified. Exact quote checks passed. An earlier run experienced a network connection reset and was retried; these timings are individual observations, not percentiles or a reliability claim. These smoke tests do not certify semantic accuracy or legal quality; role-specific explanations still require broader review.

GitHub verification run 44044764382 passed formatting, seven deterministic tests, production build and the high-severity dependency audit. Public repository has one branch, main. No official challenge submission was performed.
