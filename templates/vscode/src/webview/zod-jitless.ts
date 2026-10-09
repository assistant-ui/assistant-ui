import { config } from "zod";

// zod probes `new Function` when it builds its first object schema, which a
// strict CSP reports as a script-src violation even though zod catches it.
config({ jitless: true });
