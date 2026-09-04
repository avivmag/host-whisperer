# Art prompts for the flow diagram

The diagram on `/` is drawn in inline SVG, so the demo needs no generated art. This file exists only if you want illustrated characters in the final video cut.

Each node in `FlowDiagram` (`src/App.tsx`) is its own small component, so a node can be swapped for artwork by replacing its shapes with:

```tsx
<image href="/art/customer.svg" x={0} y={0} width={180} height={180} />
```

Drop files in `public/art/`. Keep them square, transparent, and readable at 180 px.

## House style

Use the same closing sentence in every prompt so the five characters look like one set:

> Flat vector illustration, thick rounded strokes, limited palette of deep navy, warm off-white, coral red and mint green on a transparent background, soft geometric shapes, no gradients, no text, no drop shadows, centred in a square frame.

The two accent colours carry meaning in the diagram: coral marks the failing path, mint marks the recovered one. Ask for the neutral form of each character first, then re-run for the variants.

## 1. Customer

> A single person seen from the chest up, holding a phone, drawn as a simple friendly character with no facial detail beyond eyes and mouth. Neutral, patient expression. <house style>

Variants to generate with the same seed:

- **Frustrated** — brows down, mouth flat, small stress marks beside the head, coral accent.
- **Relieved** — eyes curved, small smile, mint accent.

## 2. Agent

> A small floating assistant robot, rounded capsule body, one soft glowing eye, no arms, a four-pointed sparkle hovering just above it. Attentive, helpful posture. <house style>

## 3. Website

> A browser window drawn as a rounded rectangle with a title bar and three dots, its body divided into two stacked horizontal lanes, the upper lane plain and the lower lane marked with a small plug or socket icon. No text inside the window. <house style>

The lower lane is the WebMCP surface; keep it visually distinct so the diagram can highlight it on its own.

## 4. Host

> A cloud platform drawn as a rounded cloud shape containing three small stacked server bars, one of the bars visibly dimmed or broken. Industrial but friendly. <house style>

Variants:

- **Failing** — the broken bar lit coral, a small warning triangle at the corner.
- **Healthy** — all three bars even, a small check mark at the corner, mint accent.

## 5. Host Whisperer

> A small hexagonal badge or shield with a soft inner glow and a stylised tuning-fork or signal mark at its centre, flanked by two short connector lines reaching left and right. Calm, technical, trustworthy. <house style>

The two connectors matter: in the diagram this node sits below the website and wires to both the website's WebMCP lane and the host, forming the triangle.

## Checks before using generated art

- No text, logos, or third-party brand marks anywhere in the image.
- Transparent background, so the node keeps its tone when a step turns the card coral or mint.
- Legible at 180 px and at 1x on a projector.
- Keep the SVG diagram working with art absent; the illustrated version should be an upgrade, never a dependency.
