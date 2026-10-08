# Measure recovery without collecting credentials

By Amy Villa

The first successful API request is a journey, not a page view. Documentation, credential setup, error interpretation and recovery each influence whether a developer reaches a useful task.

DeveloperJourney uses reproducible synthetic sessions to demonstrate the measurement pipeline safely. A seed defines the included timing variation. The v2 quickstart and credential fixtures are shorter, so the comparison can show a 31-second median improvement without claiming that real developers improved by that amount.

The event collector uses an allowlist. There are no free-text payloads or token fields. Event identifiers must be demo identifiers; errors come from a finite taxonomy; non-synthetic events and credential-like identifiers are rejected. This is safer than accepting arbitrary analytics objects and hoping a downstream sanitizer notices secrets.

Duplicate event ids retain the original event. A conflicting duplicate is rejected. Monotonic offsets and fixed documentation versions preserve the meaning of a session. Incomplete sessions have unknown first-success time rather than a zero-second success.

The findings point back to synthetic recovery and drop-off evidence. A real product study would require consent, a privacy-reviewed schema, representative recruitment and observed timestamps. The fixture validates the analytics logic; it does not validate production developer behavior.
