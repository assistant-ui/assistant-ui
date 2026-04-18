# Context API

AI Instruction: Write this docs page based on the instructions.

## Goal of document

Comprehensive conceptual documentation for users to get familiar with the context API of assistant-ui.

Meta: The context API will be the first article in the docs that is written with the aim of being excellent, as we are reprioritizing the quality of our docs as one of the main differentiators of assistant-ui.

Meta: assistant-ui is a component library for AI chat. We give users shadcn style components and handle the frontend state management as well as provide integrations into agent frameworks like langgraph, AI SDK and mastra.

Meta: This article sits in the concepts directory of our docs. The goal of concepts is to teach assistant-ui from the ground up, like an ordered structured course that users go through to learn assistant-ui. As previously mentioned, while there are a few other concept docs, they are super rough, low quality and will probably be thrown away and re-written. This article about the context API will not be the very first things users learn. They will first learn about the primitive components (which under the hood use the context API). Thye will then learn about the runtime API (which powers the context API). As a last step they will learn about the context API which lets users create their own components.

## Info and content

The Context API lets you:

- access current state
- subscribe to state updates
- perform actions
- register event listeners

The context API is backed by the "runtime" that you pass to < AssistantRuntimeProvider > component.

This runtime acts as a single unified store (with getState, subscribe) helper functions that stores the entire assistant-ui state. It receives action invocations and lets you subscribe to events as well.

All assistant-ui components use the context API under the hood. This API is available to everyone, so you can re-build every primitive yourself as well.

\*There is the exception of the context-provider primitives (like ThreadPrimitive.Messages), which currently is not exposed but soon will be.

The context API is scoped to the current location where a component calling it is located. For example, inside a message, useAuiState((s) => s.message.role) will return the role (assistant or user) of the current message. The "current" message is set by the < ThreadPrimitive.Messages > component which renders all messages inside a thread.

This allows us to make "smart" components that are aware of where they are and they render the appropriate content and have the appropriate behavior, thanks to the scoping feature of the context API.

What are the scopes available to the components?

Thread, Message, Part, Composer, Attachment, ThreadList, ThreadListItem

- include info about what each of these are and how they are provided

there's three new APIs, useAuiState, useAui, useAuiEvent.

## useAui

useAui is the lowest level api, the other two apis can be created based on just useAui, the other two are basically helper APIs.

The convention is to call the fn and assign it to a variable called aui.

const aui = useAui();

gives you the current API instance. this hook does not re-render on updates. it is a static object.

it has the following fields

- 1 function per scope, e.g. aui.thread() to get the current thread
- .on to listen to events
- .subscribe to listen to state changes

### the scope functions

- call them: aui.thread()
  - this "resolves" the thread, ie. it figure out what is the current thread is
  - this matters in advanced cases where you want to keep track of the identity of the thread
  - for example, thread.send() and then if you want to cancel the same thread, you call thread.cancel()
  - calling thread() multiple times could give you different thread instances
  - in case the user switched threads in the meantime
  - the reference to API does not change, even if the user switches threads
  - only scope definition chagnes would cause rerenders
  - the scope definition for thread by default is { source: "threads", query: { type: "main" } }, this doesnt change even if the main thread selected chagnes

- check the scope: aui.thread.source, aui.thread.query
- if a scope is unavailable (e.g. accessing message outside a message component), calling the scope will throw an error (aui.message() throws), the aui.message.source will be null (which you can check for)

- scopes are defined via source/query pairs. source defines what entity the data is selected from (e.g. messages have source thread, threads have source thread-list, ...) and query defines how the source's state is sliced. typically by index or id, and theadlist has a concept of the "main" (currently selected) thread.

the scope functions return an object for that scope, this object has

- .getState() to get a snapshot of the current state
- .x(...) to perform actions, e.g. aui.thread().sendMessage(message) or aui.message().reload(), aui.composer().setText(text)

perhaps insert an overview summary of available actions per scope, as well as the state variables, so the users can explroe
perhaps a diagram showing how context is nested typically and the relationships

scopes let you access nested scopes, e.g. aui.threads().thread("main").message({ id: ... }).part({ index: 2 })

edge case: calling aui.scope() will error if the scope is no longer available (this is only possible if e.g. messages get deleted), and you keep a reference to api object and call it on an event unsubscription or something. not sure if this is worth even mentioning in the docs. its best to not use the api object in event cleanups/if the component has unmounted
TODO(Simon) I may want to keep a reference to the last resolved value to avoid having to throw in these circumstances

### .subscribe

.subscribe subscribes and calls a function after every time the store updates. you need to check the state via aui.x().getState() yourself if yo uare interested in comparing updates. the callback has no parameters that it passes you. the subscribe fn returns an unsubscribe () => void function that you can call to unsubscribe. typical usage in useEffect is to return its value

### .on

.on subscribes to an event. this function is also aware of its scope

typical usage is either .on("source.event", (e) => ...) or .on({ event: "source.event", scope: "\*" }, (e) => ...)

by default passing just a string defaults the scope of the event to the same as its source. so basically the event is bound to the same e.g. "composer" as the current composer (either message edit composer or thread new message composer).

a few examples:
.on("composer.send", (e) => ...) // current composer send
.on({ event: "composer.send", scope: "\*" }, (e) => ...) // any composer send
.on({ event: "composer.send", scope: "thread" }, (e) => ...) // any composer send inside the current thread (both edit and thread)
.on({ event: "composer.send", scope: "thread" }, (e) => {
if (e.messageId === undefined) return; // ignore thread composer sends

    ...

}) // any message edit composer send inside the current thread

setting scope to "message" when no message exists causes an error during subscription, the scope must be available.

heres an overview of all events: ...

## useAuiState

This subscribes to the state and binds the component to receive the current value for the selector. this is like zustand.

The convention is to call it and deconstruct the scope you need in an inline arrow fn:

```
const role = useAuiState((s) => s.message.role)
```

Warning: do not create new objects inside the selector. the return value from the selector MUST be a stable value, otherwise you see infinite rerender errors

Accessing a scope that does not exist will cause errors here as well.

You can access multiple scopes and do calculations inside the selector to minimal rerenders

```
const canSendMessage = useAuiState((s) => !s.thread.isRunning && s.composer.text.length > 0)
```

## useAuiEvent

same as aui.on() but as a hook that automatically unsubscribes when component unmounts

---

## Pedagogical cosiderations:

- most common use cases of context API are:
  - (frequent) subscribe to state value with useAuiState
  - (frequent) take action via aui.scope().action()
  - (frequent) read state value imperatively inside event handlers via aui.scope().getState().value
  - (rare) subscribe to events via useAuiEvent
  - (very rare) access sub-scopes to take action, e.g. aui.thread().message({ id: "..." }).action()
  - (very rare) checking source/query values
  - (extremely rare) being aware of the resolution dynamics (the resolution happening when you call aui.scope())

- useAuiState
  - intuitive if users have used zustand in the past
  - the concept of "scoping" does not exist in other state management libs and devs are not used to it, needs good explaination for devs to get it
  - gotcha: cannot create new objects and return them, the return value must be stable
  - insight: you want to select a thin slice of the store, to minimize re-renders to your component
  - typical tiny pitfall (with little performance downside) is using useAuiState for data that you only need inside an event handler (better: use aui.scope().getState())
  - rarely useful knowledge about performance: the selector functions get called on every small store update, so your selector should be fast, no expensive compute
- useAuiEvent
  - intuitive in its regular useAuiEvent(string, (e) => ...) syntax
  - it also typically matches expectations around scoping
  - unintuitive/new with the { event, scope } format
- useAui
  - unintuitive, foreign, weird, quirky
  - concept of global store is known thanks to zustand
  - the concept of "scoping" does not exist in other state management libs and devs are not used to it
  - the resolution dynamics are usuallly unimportant yet in edge cases useful to know
  - having to call .getState() is percieved as annoying but this is done to ensure you know you're getting a snapshot of the state

---

## Human provided ToDos

- [ ] review the above spec and make any edits to make it legible.
- [ ] if you have any follow up questions, ask them (as often as needed)
- [ ] come up with a bullet point content memo about the structure and format of the doc, ask for approval
- [ ] write the doc, ask for feedback, iterate

## Human Feedback

Ask the question anything you need feedback from, and give the human author a place to answer.

## AI Scratch Pad

### High-Quality Documentation Recommendations:

1. **Progressive Disclosure**: Start with the most common use cases (useAuiState, basic actions) before diving into advanced concepts
2. **Interactive Examples**: Include live CodeSandbox examples for each major concept // not yet
3. **Visual Learning**: Add diagrams for scope hierarchy and state flow
4. **Quick Reference**: Include a cheat sheet at the end with common patterns
5. **Type Safety**: Show TypeScript examples prominently as assistant-ui is TypeScript-first
6. **Error Handling**: Include a troubleshooting section for common errors (accessing unavailable scopes, selector pitfalls) // not yet
7. **Performance Tips**: Brief section on optimizing selectors and avoiding unnecessary re-renders
// 8. **Real-world Patterns**: Show actual component examples from assistant-ui's own primitives

### Proposed Document Structure:

#### 1. **Introduction** (200 words)

- What is the Context API
- When to use it vs primitives
- Relationship to runtime

#### 2. **Core Concepts** (400 words)

- Scopes and hierarchy (with diagram)
- State management model
- Event system basics

#### 3. **Essential Hooks** (600 words)

- **useAuiState** - Reading state reactively
  - Basic usage
  - Selector patterns
  - Common pitfalls
- **useAui** - Actions and imperative access
  - Getting the API instance
  - Performing actions
  - Reading state imperatively
- **useAuiEvent** - Event subscriptions
  - Basic event listening
  - Scope filtering

#### 4. **Working with Scopes** (400 words)

- Available scopes overview
- Scope resolution
- Accessing nested scopes
- Checking scope availability

#### 5. **Common Patterns** (300 words)

- Conditional rendering based on state
- Custom action buttons
- State-aware components
- Event-driven updates

#### 6. **Advanced Topics** (200 words)

- Resolution dynamics
- Performance optimization
- Custom scope providers

#### 7. **API Reference** (Tables/Lists)

- Quick reference for all hooks
- Available scopes and their states
- Event catalog
- Action catalog

#### 8. **Troubleshooting** (200 words)

- Common errors and solutions
- Debugging tips

### Writing Style Guidelines:

- **Concise**: Short paragraphs, bullet points for lists
- **Example-first**: Show code before explaining theory
- **Progressive**: Build complexity gradually
- **Practical**: Focus on real use cases over abstract concepts
