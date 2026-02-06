# TODO

## Goals

- Ship a polished, well-aligned chain-of-thought component on `pkp/chain-of-thought-parts-grouped`
- Clean, hierarchical layout where nesting levels are visually clear through alignment
- Subagent UX that communicates progress without clutter

---

## 🎯 Active

*Alignment fixes — foundational visual quality.*

- [ ] Fix top-level step text alignment: step text should left-align with the parent accordion trigger text (currently offset too far right)
- [ ] Ensure substep icons left-align with the parent step's title/text
- [ ] Fix step text alignment inside subagents: text is misaligned with bullet dot icon (ref: `Dropbox/Screenshots/Screenshot 2026-02-05 at 4.15.26 PM.png`)

---

## 📋 Next

*Subagent UX overhaul.*

### Subagent representation
- [ ] Change top-level headline from "0 of 5 agents complete" to "Gathering research from multiple perspectives" — headline should reflect top-level steps only
- [ ] Replace subagent "n of n" headline with a "Subagents" badge showing bot avatars per subagent; swap to checkmark when each completes
- [ ] Reduce the number of steps shown within subagent steps (too verbose currently)

---

## 💡 Backlog

### Visual polish
- [ ] Add a "Done" step with checkmark icon when chain of thought terminates; use muted text style
- [ ] In dark mode, change all shimmers to a lighter color

---

*Completed work archived in `DONE.md`*
