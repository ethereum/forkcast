# Issues Found in Forkcast Project

## Issue 1: Unsafe Type Casting with `any` in Search Component
**Title**: Remove unsafe `any` type casting in GlobalCallSearch component

**Description**:
In `src/components/GlobalCallSearch.tsx` line 72, the code uses unsafe `any` type casting:
```typescript
contentType: contentType === 'all' ? undefined : contentType as any,
```

This bypasses TypeScript's type safety. The `contentType` should be properly typed as a union type instead of using `any`.

**Impact**: Reduces type safety and makes refactoring harder.

---

## Issue 2: Console Statements in Production Code
**Title**: Remove console.error and console.warn statements from production code

**Description**:
Multiple files contain console logging statements that should not be in production:
- `src/components/GlobalCallSearch.tsx:93` - `console.error('Search error:', error)`
- `src/services/searchIndex.ts:105, 135, 225` - Multiple `console.error` calls
- `src/components/call/CallPage.tsx:354, 445` - `console.error` calls
- `src/utils/github.ts:71, 110` - `console.warn` and `console.error` calls

**Impact**: Pollutes browser console, makes debugging harder, unprofessional appearance.

---

## Issue 3: Hardcoded Fallback Video URL
**Title**: Remove hardcoded fallback video URL in CallPage component

**Description**:
In `src/components/call/CallPage.tsx` line 429, there's a hardcoded fallback video:
```typescript
if (!videoUrl) {
  videoUrl = 'https://www.youtube.com/watch?v=wF0gWBHZdu8';
}
```

This causes users to see the wrong video when config/video.txt is missing.

**Impact**: Users see incorrect video content, confusing experience.

---

## Issue 4: Missing Error Boundary Component
**Title**: Add Error Boundary for graceful error handling

**Description**:
The app lacks an Error Boundary component. If any component throws an error, the entire app crashes instead of showing a fallback UI.

**Impact**: Poor user experience on errors, app becomes unusable.

---

## Issue 5: Unhandled Dynamic Import in CallPage
**Title**: Add error handling for dynamic import in CallPage

**Description**:
In `src/components/call/CallPage.tsx` line 348, dynamic import lacks error handling:
```typescript
const callsModule = await import('../../data/calls');
```

If the import fails, it causes an unhandled promise rejection.

**Impact**: Potential runtime crash with no error message.

---

## Issue 6: Unused State Variable
**Title**: Remove unused `initialSearchQuery` state

**Description**:
In `src/components/call/CallPage.tsx` line 62, `initialSearchQuery` is declared but never used:
```typescript
const [initialSearchQuery, setInitialSearchQuery] = useState('');
```

**Impact**: Dead code, unnecessary memory usage.

---

## Issue 7: Missing Accessibility Labels
**Title**: Add ARIA labels to search icon in GlobalCallSearch

**Description**:
In `src/components/GlobalCallSearch.tsx` line 231, the search icon SVG lacks an aria-label, making it inaccessible to screen readers.

**Impact**: Accessibility violation, poor experience for users with disabilities.

---

## Issue 8: Overly Broad Prettier Ignore Rules
**Title**: Fix .prettierignore to allow formatting of source files

**Description**:
The `.prettierignore` file ignores all `*.ts`, `*.tsx`, and `*.js` files, preventing Prettier from formatting source code.

**Impact**: Code style inconsistency, harder to maintain.

---

## Issue 9: Missing Null Checks
**Title**: Add proper null checks for matchingCall in CallPage

**Description**:
In `src/components/call/CallPage.tsx` line 350, `matchingCall` could be undefined but is used without proper null coalescing.

**Impact**: Potential runtime errors.

---

## Issue 10: Large Bundle Size Warning
**Title**: Implement code splitting to reduce bundle size

**Description**:
Build produces a 613.99 kB bundle (170.20 kB gzipped) with warning about chunks larger than 500 kB. This should be optimized with code splitting.

**Impact**: Slow initial page load, poor performance on slow connections.

