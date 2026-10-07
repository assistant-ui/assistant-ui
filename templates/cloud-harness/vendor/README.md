# Harness runtime packages

These MIT-licensed packages are built from [harness-sdk revision 3d3a180f0400b84267f62969d42f8b102bed4479](https://github.com/assistant-ui/harness-sdk/tree/3d3a180f0400b84267f62969d42f8b102bed4479). They compose the existing hosted harness runtime and assistant-ui adapter.

Package names, source directories, versions, and archive SHA-256 hashes are recorded in [provenance.json](provenance.json). Each archive includes its license.

From an assistant-ui source checkout, reproduce them with:

```sh
node scripts/package-cloud-harness-template.mjs /path/to/harness-sdk
```

The harness-sdk checkout must have its dependencies installed and the package source directories clean. The script builds the packages with their existing `aui-build` tool and packs them without publishing.
