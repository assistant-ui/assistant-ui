// Mock Web APIs that might not be available in jsdom
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Add web streams polyfill
const webStreams = require('web-streams-polyfill');
global.ReadableStream = webStreams.ReadableStream;
global.WritableStream = webStreams.WritableStream;
global.TransformStream = webStreams.TransformStream;

// Add fetch polyfill
require('whatwg-fetch');
global.Response = window.Response;