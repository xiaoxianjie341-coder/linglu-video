# Social Link Fetch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current naive URL fetching path with provider-based extraction that supports plain web pages, X links, and Xiaohongshu links.

**Architecture:** Keep `fetchSourceContent()` as the single entry point, but delegate URL handling to domain-specific providers. Add one provider for generic article extraction with `defuddle`, one for `X` via the local x-to-markdown skill script, and one for Xiaohongshu via the `xhs` CLI. Normalize provider output back to a plain text string for the planner.

**Tech Stack:** TypeScript, Vitest, Node child processes, `defuddle`, `linkedom`

---

### Task 0: Define the shared provider contract

**Files:**
- Create: `lib/source-providers/types.ts`
- Modify: `lib/fetch-source.ts`
- Test: `tests/lib/fetch-source.test.ts`

- [ ] **Step 1: Write failing tests for domain matching, invalid URLs, empty content, and “no fallback on provider failure”**
- [ ] **Step 2: Run `npm test -- tests/lib/fetch-source.test.ts` to verify the contract tests fail**
- [ ] **Step 3: Define the provider result shape, error shape, and dispatcher seam**
- [ ] **Step 4: Re-run `npm test -- tests/lib/fetch-source.test.ts` and keep the provider-specific assertions red**

### Task 1: Add provider-facing regression tests

**Files:**
- Create: `tests/lib/fetch-source.test.ts`
- Modify: `lib/fetch-source.ts`

- [ ] **Step 1: Write the failing tests for generic web extraction and shared normalization**
- [ ] **Step 2: Run `npm test -- tests/lib/fetch-source.test.ts` to verify they fail for the expected reason**
- [ ] **Step 3: Add test seams for dependency injection only as needed**
- [ ] **Step 4: Re-run `npm test -- tests/lib/fetch-source.test.ts` and keep the new assertions red**

### Task 2: Add generic web provider

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `lib/source-providers/types.ts`
- Create: `lib/source-providers/plain-web.ts`
- Modify: `lib/fetch-source.ts`
- Test: `tests/lib/fetch-source.test.ts`

- [ ] **Step 1: Install `defuddle` and `linkedom`**
- [ ] **Step 2: Implement the plain web provider with focused article extraction**
- [ ] **Step 3: Route unsupported domains to the plain web provider**
- [ ] **Step 4: Add empty-result handling and shared text normalization**
- [ ] **Step 5: Run `npm test -- tests/lib/fetch-source.test.ts` and make the generic web cases pass**

### Task 3: Add X provider

**Files:**
- Create: `lib/source-providers/x.ts`
- Modify: `lib/fetch-source.ts`
- Test: `tests/lib/fetch-source.test.ts`

- [ ] **Step 1: Write the failing X-provider test around domain matching, command invocation, and markdown loading**
- [ ] **Step 2: Run `npm test -- tests/lib/fetch-source.test.ts -t x` to verify it fails**
- [ ] **Step 3: Implement the X provider using the local `baoyu-danger-x-to-markdown` script**
- [ ] **Step 4: Map timeouts, missing script, and empty markdown to explicit provider errors**
- [ ] **Step 5: Re-run `npm test -- tests/lib/fetch-source.test.ts -t x` and make it pass**

### Task 4: Add Xiaohongshu provider

**Files:**
- Create: `lib/source-providers/xiaohongshu.ts`
- Modify: `lib/fetch-source.ts`
- Test: `tests/lib/fetch-source.test.ts`

- [ ] **Step 1: Write the failing Xiaohongshu-provider test around host matching, `xhs read <url> --json` parsing, and “no fallback” behavior**
- [ ] **Step 2: Run `npm test -- tests/lib/fetch-source.test.ts -t xiaohongshu` to verify it fails**
- [ ] **Step 3: Implement the Xiaohongshu provider with explicit error mapping**
- [ ] **Step 4: Treat missing CLI, invalid token, login failure, and empty output as first-class provider failures**
- [ ] **Step 5: Re-run `npm test -- tests/lib/fetch-source.test.ts -t xiaohongshu` and make it pass**

### Task 5: Verify the integrated behavior

**Files:**
- Modify: `README.md`
- Modify: `lib/fetch-source.ts`
- Test: `tests/lib/fetch-source.test.ts`

- [ ] **Step 1: Update the URL-fetch caveat wording to reflect provider-based support**
- [ ] **Step 2: Run `npm test -- tests/lib/fetch-source.test.ts`**
- [ ] **Step 3: Run `npm run typecheck`**
- [ ] **Step 4: Run lints/diagnostics on edited files and fix any issues**
