---
inclusion: always
---

# Coding Conventions

## TypeScript (admin, mobile)
- `strict: true` in every `tsconfig`.
- No `any` (explicit or implicit). Use `unknown` + narrowing, generics, or precise types.
- Explicit return types required on all exported:
  - functions
  - hooks
  - API client functions
- Enforce via ESLint: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/explicit-module-boundary-types`.

## Python (backend)
- PEP 8 compliant.
- Formatting/linting: Black + Ruff (Ruff for lint and import sorting; keep line length identical in both configs).
- Type checking: Mypy with `disallow_untyped_defs = True`.
- All functions, including private helpers, fully annotated.

## File Naming
| Kind | Convention | Example |
|---|---|---|
| React / React Native components | `PascalCase.tsx` | `TweakCard.tsx` |
| Hooks, utilities | `camelCase.ts` | `useWalletBalance.ts`, `formatPrice.ts` |
| Python modules | `snake_case.py` | `wallet_service.py` |

## Imports
Three groups, in order, separated by a blank line:
1. Standard library / external packages
2. Internal absolute paths (`@/components`, `@/features/...`; `app.` in Python)
3. Local relative imports (`./`, `../`)

```ts
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';

import { tweakColumns } from './columns';
```
- `@/` alias must be configured in `tsconfig` paths and the bundler (Vite alias / Babel module resolver for Expo).
- No deep relative climbs (`../../../`); use the `@/` alias instead.
