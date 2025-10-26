# Manual Test Log

The Gemini API is not accessible in this environment, so the moodboard flows were exercised against a stubbed backend that retur
ns deterministic image payloads. The following scenarios verify that the UI responds correctly across prompts, aspect ratios, te
mperatures, and refinement flows.

| # | Scenario | Prompt | Aspect Ratio | Temperature | Backend Stub | Expected Result | Observed UI State |
|---|----------|--------|--------------|-------------|--------------|-----------------|-------------------|
| 1 | Initial generation | "Bosque nebuloso al amanecer" | Auto | 0.6 | Returns two base64 PNGs | Spinner cycles through loading messages and gallery shows two cards | Spinner advanced, two "Generated moodboard" cards rendered with new images |
| 2 | Initial generation | "Arquitectura brutalista futurista" | 21:9 | 0.9 | Returns two base64 PNGs | Aspect ratio choice is passed to request and cards render at widescreen crop | Request payload logged with `aspectRatio: "21:9"`; cards visible and selectable |
| 3 | Refinement | "Luces de neón en lluvia nocturna" | 3:2 | 0.3 | Refinement returns two base64 PNGs | Selecting one card, entering refine prompt "Más contraste cálido" yields refreshed images | Selection badge displayed, refine button enabled, grid replaced with new stub images |
| 4 | Refinement error handling | Uses selection from scenario 3 | n/a | n/a | Stub throws 500 | Error banner appears and previously generated images remain selectable | Alert banner shown with error copy, prior cards remain |

## Notes
- The stubbed backend mimics the REST contract in [`docs/backend_design.md`](./backend_design.md) and logs the outgoing payloads
  for manual verification of aspect ratio and temperature values.
- Download and gallery actions were also smoke-tested to ensure no uncaught exceptions were thrown when stubs returned data URI
  payloads.
- When running against the real backend, replace the stub with the production base URL and confirm similar behaviours with real
  outputs.
