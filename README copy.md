# Handoff: Word Practice (Hacker News styled GRE vocabulary app)

## Overview
A single-page vocabulary tool with two views: a word list (add / edit / delete / search saved words)
and a matching quiz (match a word to one of four candidate definitions). Words persist in the
browser. The visual language is deliberately in the spirit of early-web link aggregators:
Verdana at 10pt, a flat orange top bar, a warm off-white page, dense numbered rows, and small gray
text links instead of buttons. No cards, no shadows, no rounded corners.

## About the Design Files
The file in this bundle (`Word Practice.dc.html`) is a **design reference created in HTML** — a
working prototype that shows intended look and behavior. It is not production code to copy directly.
The task is to **recreate this design in the target codebase's existing environment** (React, Vue,
SwiftUI, native, etc.) using its established patterns, component library, and state conventions. If
no environment exists yet, pick the most appropriate framework and implement the design there.

Note on structure: the prototype is authored as a streaming template plus a logic class. Markup lives
in the template; all derived values, handlers, and state live in the class's `renderVals()`. Read the
class first — it is the closest thing to a spec for behavior.

## Fidelity
**High-fidelity.** Colors, type sizes, spacing, and interaction states are final. Recreate pixel-for-pixel
using the codebase's primitives. The only intentional latitude: if the target app has a house sans-serif,
do **not** substitute it here — Verdana (fallback Geneva, sans-serif) is load-bearing for the aesthetic.

---

## Screens / Views

### 1. Top bar (persistent, both views)
**Purpose:** identity + view switching + saved count.

- Full-width bar, background `#ff6600`, padding `2px 4px`.
- Horizontal flex, `align-items: center`, `gap: 10px`.
- Left: a square-ish glyph — the letter `W`, bold, `12pt`, `line-height: 16px`, color `#000000`,
  wrapped in a `1px solid #ffffff` border with `0 4px` padding.
- Then the title `Word Practice`, bold, 10pt, `#000000`.
- Then two nav links: `my word list` and `practice match`, separated by a literal `|` in `#000000`.
  The **active** view's link is `#ffffff`; the inactive one is `#000000`. Underline on hover.
- Right-aligned (`margin-left: auto`): saved count at `8pt`, text `"N words"` (singular `"1 word"`).

### 2. My word list
**Purpose:** capture and manage saved words.

Content column: `max-width: 860px`, centered, page background `#f6f6ef`. Inner horizontal padding `6px`,
top padding `10px`.

**a. Add / edit form** — one horizontal flex row, `gap: 6px`, `flex-wrap: wrap`,
`align-items: flex-start`, `padding-bottom: 12px`.
- Text input, placeholder `word`, width `150px`, `10pt`, padding `2px 4px`,
  border `1px solid #b0b0a8`, background `#ffffff`.
- Text input, placeholder `definition`, width `330px`, otherwise identical.
- Submit button: `10pt`, padding `2px 10px`, border `1px solid #b0b0a8`, background `#eeeee6`,
  cursor pointer. Label `add word`, or `update` while editing.
- While editing only: a `cancel` text link, `8pt`, `#828282`, `padding-top: 5px`.
- Focus state for all inputs/textareas: `outline: 1px solid #ff6600`.

**b. Search row** — flex, `align-items: baseline`, `gap: 8px`,
`border-bottom: 1px solid #e0e0d8`, `padding-bottom: 6px`.
- Input, placeholder `search`, width `180px`, `9pt`, padding `1px 4px`, same border/background as above.
- To its right, only when the query is non-empty: `"<matches> of <total>"`, `8pt`, `#828282`.

**c. Word rows** — a `<table>`, `border-collapse: collapse`, `width: 100%`, `margin-top: 8px`.
One row per word:
- Rank cell: right-aligned, `width: 28px`, `9pt`, `#828282`, padding `4px 4px 4px 0`,
  top-aligned. Content `"1."`, `"2."`, … numbered over the *filtered* list.
- Content cell: top-aligned, padding `4px 0 10px`.
  - Line 1: flex, `align-items: baseline`, `gap: 6px`, `flex-wrap: wrap` — the word in **bold**
    `#000000` 10pt, then the definition in `#444444` 10pt.
  - Line 2 (meta): flex, `gap: 6px`, `8pt`, `#828282`, `margin-top: 2px` — an added-label,
    then `|`, `edit`, `|`, `delete`. `edit`/`delete` are text links in `#828282`, underline on hover.
- Empty-filter state (words exist but none match): `"No words match."`, `#828282`, padding `12px 0`.

### 3. Practice match
**Purpose:** self-test word → definition recall.

- Score row: flex, `gap: 8px`, `8pt`, `#828282`, `border-bottom: 1px solid #e0e0d8`,
  `padding-bottom: 6px`. Content: `"R right, W wrong"`, `|`, `reset score` link.
- Question block, `padding-top: 14px`: flex baseline row, `gap: 8px` — the label
  `which definition matches` at `9pt` `#828282`, then the prompt word bold `12pt` `#000000`.
- Choices: a `<table>`, `margin-top: 10px`. Rank cell as in the word list but padding `3px 4px 3px 0`;
  content cell padding `3px 0` holding the definition as a text link.
- Result row, `margin-top: 12px`: flex, `gap: 10px`, `align-items: baseline` — verdict text
  (`9pt`, `#828282`) then a `next word` link styled as a button
  (border `1px solid #b0b0a8`, background `#eeeee6`, padding `1px 8px`, `9pt`).
- Too-few-words state (fewer than 4 saved words): `"Add at least four words to practice matching."`,
  `#828282`, padding `14px 0`.

### 4. Footer (persistent)
`border-top: 2px solid #ff6600`, `margin: 26px 6px 0`, `padding-top: 8px`, `8pt`, `#828282`,
flex with `gap: 8px`: `saved in this browser`, `|`, `export json` link.

---

## Interactions & Behavior

**View switching.** Nav links swap the active view; nothing else resets. No routing in the prototype —
in a real app, `/list` and `/practice` routes are reasonable.

**Add a word.** Submit (button or Enter in either field). Trim both fields; if the word is empty, do
nothing. New entries are **prepended** to the list. Both draft fields clear, edit mode exits, and the
current quiz question is invalidated (regenerated from the new list). No duplicate detection.

**Edit.** `edit` loads that entry into the same form (no separate modal) and switches the submit label
to `update`. Submitting replaces the entry in place, preserving its added-label. `cancel` discards
and clears the form.

**Delete.** Immediate, no confirmation. Invalidates the current quiz question.

**Search.** Live filter as the user types, case-insensitive substring match against **both** word and
definition. Ranks renumber over the filtered set.

**Quiz question generation.** Requires ≥ 4 words. Pick a random word as the answer, pick 3 distinct
random others as distractors, shuffle the four definitions. Definitions are the options; the word is
the prompt.

**Answering.** First click locks the question. Then recolor every option: the correct one `#1a7f37`,
the user's wrong pick `#b02a1a`, all others `#828282`. Further clicks are ignored. Verdict text reads
`correct` or `not quite`. `next word` generates a fresh question and unlocks.

**Score.** Increments right/wrong on the first (only) pick. `reset score` zeroes both. Score is
session-only — not persisted.

**Export json.** Serializes the word array with 2-space indent, downloads as `words.json` via a Blob URL.

**Hover.** Every link underlines on hover; nothing else moves. No transitions or animations anywhere —
that flatness is intentional.

**Responsive.** The content column is `max-width: 860px` centered; below that it fills the viewport.
The form row wraps. In a real app, give the two form inputs percentage widths under ~640px and let the
top bar's nav wrap rather than compress.

---

## State Management

Single component-local state object in the prototype:

| Key | Type | Notes |
|---|---|---|
| `words` | `{word, definition, added}[]` | source of truth; persisted |
| `tab` | `"list" \| "quiz"` | active view |
| `query` | `string` | search box, live |
| `draftWord` | `string` | add/edit form |
| `draftDef` | `string` | add/edit form |
| `editIndex` | `number` | `-1` = adding, else index being edited |
| `question` | `{word, correct, options[]} \| null` | `null` triggers regeneration |
| `picked` | `string \| null` | the chosen definition; non-null = locked |
| `right` / `wrong` | `number` | session score |

**Persistence.** `localStorage` key `word-practice:words`, JSON array, written on every mutation
(add / update / delete). Read once on mount; falls back to a seed list of six GRE words if absent or
unparseable. In a real app this is the data-layer seam: swap for the app's store / API, keep the
same shape.

**Data fetching.** None. Fully local.

---

## Design Tokens

**Colors**
| Token | Value | Use |
|---|---|---|
| accent | `#ff6600` | top bar fill, footer rule, input focus outline |
| page | `#f6f6ef` | page and content background |
| control | `#eeeee6` | button fill |
| field | `#ffffff` | input fill, top-bar glyph border |
| ink | `#000000` | body text, bold words, active-view link is `#ffffff` |
| ink-soft | `#444444` | definitions in the word list |
| muted | `#828282` | meta text, ranks, all small links, disabled choices |
| border | `#b0b0a8` | input and button borders |
| rule | `#e0e0d8` | section divider under search / score row |
| correct | `#1a7f37` | right answer after picking |
| incorrect | `#b02a1a` | user's wrong pick |

**Typography** — `Verdana, Geneva, sans-serif` throughout.
| Size | Use |
|---|---|
| 12pt bold | quiz prompt word, top-bar glyph |
| 10pt bold | app title, saved words in the list, submit button label context |
| 10pt regular | body, definitions, inputs |
| 9pt | ranks, search input, verdict, choice-adjacent labels, `next word` |
| 8pt | saved count, all meta lines, footer |

Line-height is the browser default everywhere except the top-bar glyph (`16px`). No letter-spacing
adjustments. No text-transform.

**Spacing** — a coarse scale: `2px` (bar padding), `4px`, `6px` (row gaps, gutters), `8px`, `10px`,
`12px`, `14px`, `26px` (footer offset). Content column `max-width: 860px`.

**Border radius** — `0` everywhere. Do not round anything.

**Shadows** — none.

---

## Assets
None. No images, no icon set, no webfonts — the top-bar mark is the letter `W` in a bordered box, and
all separators are literal `|` characters. Nothing needs to be sourced.

## Files
- `Word Practice.dc.html` — the full prototype: template markup (both views, top bar, footer) plus
  the logic class holding state, persistence, quiz generation, and all handlers.
