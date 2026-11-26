// The native blocks bring in react-native's types, whose timers return a
// number. The library also type-checks assistant-stream's sources (through
// the tsconfig paths), which call Node's `timer.unref?.()` on them. This lets
// that optional call type-check; it changes nothing at runtime.
interface Number {
  unref?(): void;
}
