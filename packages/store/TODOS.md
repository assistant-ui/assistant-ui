The store connects tap Resources with React Components via the React Context.

It is a tap native store. It means that the store is implemented via tap. Check packages/react/src/utils/tap-store/store.ts for a simple store-as-hook implementation.

Background: the @assistant-ui/react package has a version of this store implemented. However this is a re-implementation of that store implementation. This re-implementation is inspired but not 100% backwards compatible with the react package implementation.

The store has the concept of scopes. The store does not implement any scopes by default. Instead, it relies on module augmentation to define the scopes.

The AssistantScopes type is a { scopeName: ScopeDefinition }. ScopeDefinition is { value: ValueType, source: SourceType, query: QueryType }.

Create an example test-store.ts file that defines the scope Foo with source: "root", query: {}, and value: { bar: string }.

The store has the following API:

- useAssistantClient({
  [scope]: ScopeDefinition
  })

TODO: come up with a good name for ScopeDefinition

ScopeDefinition is either ResourceElement<ValueType> OR DerrivedScope<ScopeDefinition>
DerrivedScope is ResourceElement<ScopeDefinition, DerrivedScopeProps<ScopeDefinition>>
DerrivedScopeProps<ScopeDefinition>: { get(): ValueType, source, query }

useAssistantClient({ ... }) returns the assistant client from the AssistantContext, extended by the provided scopes

- useAssistantClient() // returns the assistant client from the AssistantContext (react context)
