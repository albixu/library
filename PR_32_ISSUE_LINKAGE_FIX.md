# PR #32 Issue Linkage Correction

## Problem
PR #32 claims to close issue #6 with "Closes #6" in its description, but this is incorrect.

## Analysis
- **Issue #6** requires implementing the `OllamaEmbeddingService` infrastructure adapter
- **PR #32** only implements:
  - `CreateBookUseCase` (application layer)
  - Unit tests for the use case
  
The PR does NOT include:
- Infrastructure adapter for Ollama
- HTTP client integration
- Configuration for Ollama endpoint
- Infrastructure-level tests

## Recommendation
The PR #32 description should be updated to **REMOVE** the "Closes #6" statement.

### Suggested PR #32 Description Update

**Current:**
```markdown
## Closes
Closes #6
```

**Should be:**
```markdown
## Related Issues
Part of #6 (implements application layer use case, infrastructure adapter still needed)
```

Or simply remove the "Closes" section entirely and add:
```markdown
## Notes
This PR implements the application layer orchestration for book creation. The infrastructure adapter for Ollama embeddings (issue #6) will be implemented separately.
```

## Impact
- Issue #6 will remain open after PR #32 is merged (correct behavior)
- A separate PR/task will be needed to implement the OllamaEmbeddingService adapter
- The CreateBookUseCase is still valuable and can be merged as it defines the contract via the EmbeddingService port

## Action Required
The owner (@albixu) needs to manually update PR #32's description to remove or adjust the issue closure claim, as automated tools cannot modify PR descriptions.
