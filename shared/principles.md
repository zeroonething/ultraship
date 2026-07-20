# UltraShip principles

1. Every release must work.
2. Every release must be independently releasable.
3. Every version must deliver a real outcome.
4. Build the smallest complete vertical slice.
5. The first useful version is an MVP; every version is a Minimum Complete Release.
6. Plan near-term work precisely and distant work lightly.
7. Implementation evidence may change the plan.
8. Changes must be explicit and traceable.
9. Released versions are immutable.
10. Every fact has one canonical owner.
11. Scope may shrink; completeness may not.
12. Verification is part of development, not an afterthought.
13. Deployment or publication is part of the release contract.
14. Inference, time, and money are engineering resources.
15. Use expensive reasoning only where it creates value.
16. Protect capacity for testing and release.
17. Do not optimize for token consumption.
18. Optimize for verified shipped value.
19. Pause safely rather than manufacture completion.
20. Ship, observe, learn, and adapt.

## The two that override the rest

**Scope may shrink. Completeness may not.** When a release will not fit, remove
optional scope, adopt the fallback, simplify the implementation, or split the
release. Never remove tests, security controls, or evidence to finish faster.

**Optimize for verified shipped value.** Reaching a usage limit is not success.
Neither is generating the most code. The measure is shipped, verified product
value per unit of resource consumed.
