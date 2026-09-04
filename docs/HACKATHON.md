# WebMCP Challenge Mission

Last verified against the official challenge website and rules: 2026-09-04.

## Why this repository exists

This repository exists solely as an entry for [OpenAI's WebMCP Challenge](https://openai.com/webmcp-challenge/). Host Whisperer is a hackathon demonstration, not a startup, production service, or product roadmap. It is not intended to serve real customers after the challenge.

The goal is to place among the ten winning submissions by presenting the strongest possible answer to the challenge prompt:

> Build a WebMCP-powered web app that explores a future where people and agents interact, collaborate, and create together.

The organizers specifically want an app that becomes meaningfully better when a person and their agent use it together. Every product, engineering, design, documentation, and demo decision should improve the submission against that goal. Work that adds production readiness without improving the judged submission is out of scope.

The published prize package names ten winners. Each winning submission is listed to receive $3,000 from OpenAI and $500 from Netlify, plus sponsor credits and products: a Codex Micro, up to three one-year ChatGPT Pro accounts, OpenAI swag, $10,000 in Cloudflare credits, twelve months of Vercel and Gateway credits, $300 in Render credits, Shopify gear, and Google AI Ultra subscriptions for team members. Prize details remain subject to the official rules.

## Our competition thesis

Host Whisperer demonstrates a website changing from a dead end into an agent-native support experience.

Without WebMCP, a customer sees a generic checkout error and a chatbot can only guess from the customer's prose. With the installed Host Whisperer runtime, the website exposes a structured, purpose-built support handoff tied to its live state. ChatGPT delegates the issue, the customer reviews the bounded resolution, and Host Whisperer obtains visible approval, applies it, verifies it, and returns a minimal outcome.

This is a strong WebMCP demonstration because neither participant can complete the experience as well alone:

- The website and Host Whisperer know the live application state and the actions its developer considers safe, but need a trusted way to receive customer intent.
- The browser agent can carry that intent and communicate the outcome without scraping the UI, inventing state, or becoming an infrastructure operator.
- The customer supplies intent and approval, supervises the work, and sees proof of the outcome.
- WebMCP provides the structured contract joining those three capabilities.

The demo's product fiction should be credible enough to establish potential impact, but it must remain deterministic and optimized for judging. We do not need to build real hosting integrations, a production backend, generalized playbooks, billing, accounts, or long-term operations.

## How submissions are judged

There is a Stage One pass/fail screen for baseline viability: the project must fit the theme and reasonably use the required technology. Projects that pass are scored on four **equally weighted** criteria:

| Criterion | Official question | What Host Whisperer must prove |
| --- | --- | --- |
| WebMCP Leverage | How thoroughly and skillfully does the project use WebMCP? Is it working and non-trivial? | The single customer-facing handoff must be real, discoverable, stateful, approval-gated, and essential to the journey—not a decorative wrapper around a UI action. |
| Execution | Is it a working, complete, coherent product experience rather than a technical proof of concept? | The live before/after journey must work reliably from failure through installation, diagnosis, approval, repair, and verification. The three roles must be immediately understandable. |
| Potential Impact | Does it make a credible, specific case for solving a real problem for a real audience, and does the demo address it? | Lead with the generic-error/support-reconstruction problem and show the exact improvement for a stranded customer and the website developer. |
| Creativity & Ambition | Is the concept novel and different from existing concepts? | Emphasize the generated support contract, supervised recovery, verification, and transformation of existing sites—not a generic chatbot, shopping assistant, or agent clicking UI. |

WebMCP Leverage is also the first tie-breaker, followed by the remaining criteria in listed order. When tradeoffs are necessary, protect genuine WebMCP depth and a reliable end-to-end demo first.

## Submission requirements

The final Devpost entry must include all of the following:

- A working live URL accessible in ChatGPT's in-app browser or Google Chrome with WebMCP enabled.
- A text description explaining:
  - why this use case strongly fits WebMCP;
  - how it creates a better user experience;
  - what people and agents can do together that was previously difficult or impossible; and
  - how WebMCP was implemented.
- A public YouTube demo video shorter than three minutes. It must clearly show the project working, contain audio, and explain both what was built and how WebMCP is used. Judges are not required to watch beyond three minutes.
- A public GitHub, GitLab, or Bitbucket repository containing all source, assets, and instructions needed to run the project.
- An open-source license that is visible and detectable at the top of the repository page.
- A repository implementation using `document.modelContext.registerTool(...)`.
- English submission materials, or English translations of all submitted materials.
- Authorized use of every third-party SDK, API, dataset, trademark, copyrighted asset, and other protected material.

The live project must be free to access for judging. If authentication is used, working credentials must be included in the private testing instructions. Judges may choose not to open the app and may judge solely from the description, images, and video, so those artifacts must communicate the complete case independently.

## Dates and freeze policy

All official times below are Pacific Time:

- Registration and submission opened: August 25, 2026 at 11:00 AM PT.
- Submission deadline: **September 4, 2026 at 1:00 AM PT** (extended by Devpost because of an ongoing outage).
- Judging: September 4, 2026 at 10:00 AM PT through September 21, 2026 at 5:00 PM PT.
- Winners announced: on or around September 23, 2026 at 2:00 PM PT.

For this repository's Asia/Jerusalem timezone, the submission deadline is **September 4, 2026 at 11:00 AM IDT**. Judging begins at **September 4, 2026 at 8:00 PM IDT**.

After the submission deadline, do not change the submitted Devpost entry, public repository, or live deployment until winners are announced. The official FAQ warns that changes during judging can jeopardize eligibility. If continued development is necessary, make it in a separate fork while leaving the submitted version untouched.

The project must remain live, free, and unrestricted through the end of judging.

## Eligibility and provenance

- Entrants must be adults under the law where they live and reside in an eligible territory supported by OpenAI's API services.
- Individuals, teams, and organizations may enter. A team or organization must appoint an eligible representative. There is no team-size cap.
- New projects are encouraged. A project that existed before August 25, 2026 must be meaningfully extended with WebMCP during the submission period, and the new work must be clearly distinguished with dated evidence.
- The submission must be the entrant's original, owned work and must not violate third-party rights.
- Multiple entries are allowed only when they are unique and substantially different.

This repository's recorded commit history begins on September 3, 2026, within the submission period, and serves as dated provenance for the work.

## Definition of done

The project is ready to submit only when all of these are true:

- The complete live journey has been tested in ChatGPT's in-app browser, not only in unit tests or ordinary Chrome.
- A fresh judge can understand the problem, roles, installation transition, and WebMCP value without coaching.
- Every advertised WebMCP tool works in the deployed build and contributes visibly to the story.
- Reset, failure reproduction, generation, installation, diagnosis, approval, recovery, and verification are deterministic.
- The video is public on YouTube, has clear narration, shows the working WebMCP interaction, and is under three minutes.
- The description explicitly answers all four required prompts and is written to the four judging criteria.
- The public repository contains the final code, instructions, and a visible open-source license.
- The live URL and repository remain available and unchanged through judging.
- The Devpost submission has been completed before the deadline and independently checked against the official rules.

## Work-prioritization rule

For every proposed change, ask:

1. Which judging criterion does this improve?
2. Will a judge notice the improvement in the live demo, video, description, or code review?
3. Does it make the core WebMCP collaboration clearer or more reliable?
4. Is it more valuable than fixing an incomplete submission requirement?

If a change cannot answer those questions, defer it. Production hardening, speculative provider support, generalized architecture, and post-hackathon maintainability are not goals unless they directly improve judged evidence.

## Official sources

The official rules control if any summary in this repository conflicts with them:

- [OpenAI WebMCP Challenge](https://openai.com/webmcp-challenge/)
- [Devpost challenge overview, requirements, prizes, and judging criteria](https://webmcp.devpost.com/)
- [Official rules](https://webmcp.devpost.com/rules)
- [Official resources and FAQ](https://webmcp.devpost.com/resources)
