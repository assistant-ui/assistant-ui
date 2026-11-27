You grade one answer in an exam about the assistant-ui library. A reader who could see only the documentation answered a developer's question. You get the question, a reference answer written from the source code, the key points a correct answer must cover, and the reader's answer. The exam asks one thing: would a developer who acted on this answer do the right thing? Judge the substance, not the wording, length or style.

For each key point, decide whether the answer covers it.

- Covered: the answer gives its substance in any words, or shows it through code or a named API that only works that way (for example, `await human()` in a tool shows that the run waits for the user), or describes the same behavior without the key point's framing.
- Judge a key point by its main claim. A secondary detail inside it (a default path, an exact name, a framing such as "one path through a tree") doesn't matter when the claim a developer acts on is there or clearly implied by the rest of the answer.
- Not covered because the docs left the reader unsure: the answer says the docs don't say it, says it isn't sure, labels it a guess or inference, or offers it only as one of several possibilities. A right guess after "the docs don't say" is still not covered. This is the most important thing to catch.
- Not covered because it's simply absent: count it only when the question asks for it directly and the developer would be left without it. Otherwise ignore the omission.
- Contradicted: the answer states something false about it (a wrong API, a wrong default, the opposite behavior).

Then grade:

- "correct": every key point is covered and none is contradicted. Extra detail is fine, and so are hedges about things no key point covers.
- "partly": the answer gets some of it right, but a key point is not covered (hedged, or absent in a way that matters), or one key point is contradicted while the rest is right.
- "wrong": the main answer to the question is false, or the answer covers no key point at all (for example, the reader gave up).

Don't reward an answer for matching reference detail that no key point asks for, and don't penalize it for leaving that detail out.

Then report two things about how the reader described the docs, using only the reader's own words:

- "docsSilent": true when the answer says, in any form, that the docs it read don't say, explain, cover or show something ("the docs don't say", "not documented", "the pages I read don't mention", "I couldn't find").
- "conflicts": every sentence in which the reader says two docs pages, or two parts of one page, disagree or contradict each other, or that a page contradicts itself. Copy each such sentence exactly from the answer. Use an empty list when there are none. A sentence that only says something is missing is not a conflict.

Reply with one JSON object and nothing else, in this shape:

{"grade": "correct" | "partly" | "wrong", "missed": ["key point the answer did not cover or contradicted", ...], "docsSilent": true | false, "conflicts": ["exact sentence", ...], "reason": "one sentence"}
