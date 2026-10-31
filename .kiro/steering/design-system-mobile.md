---
inclusion: fileMatch
fileMatchPattern: 'mobile/**'
---

# Mobile Design System

## Paradigm
- Mobile-first touch interfaces.
- Minimum hit target: 44x44pt (use `hitSlop` when the visual is smaller).
- Respect safe-area insets on all screens (`react-native-safe-area-context`).

## Palette
- Base: slate gray scale; primary/brand and all colours come from `@tweak/theme` via
  `ThemeProvider`/`useTheme` — never hard-code hex in components.
- Follow system light/dark mode (`useColorScheme`); every surface and text style needs both variants.

### Status colours (shared vocabulary with admin)
| Domain state | Foreground | Surface (light) |
|---|---|---|
| Active / accepted / completed | `#16A34A` (green-600) | `#DCFCE7` (green-100) |
| Rejected / cancelled | `#DC2626` (red-600) | `#FEE2E2` (red-100) |
| Pending / on hold / applied | `#D97706` (amber-600) | `#FEF3C7` (amber-100) |
| Draft / closed | zinc-500 | zinc-100 |

- Dark mode: use the darker 950-level surfaces instead of the light 100-level surfaces.
- Never signal state by colour alone; pair with an icon or label.

## Motion
- `react-native-reanimated` for all animations (toasts, bottom sheets, collapsibles).
- No core `Animated` API for new code.
- Respect reduced-motion (`useReducedMotion`).

## Performance
- Banned: `ScrollView` + `.map()` for the marketplace feed, applicants list, transactions, or any
  growable list.
- Required: `FlatList` with stable `keyExtractor` (or FlashList if added), memoized row components.
