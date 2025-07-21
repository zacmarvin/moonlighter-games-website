export interface NewsPost {
  id: string
  title: string
  type: 'devlog' | 'patch' | 'announcement'
  date: string
  author: string
  excerpt: string
  content: string
  image?: string
}

export const newsPosts: NewsPost[] = [
  {
    id: "build-0.2.0",
    title: "Build 0.2.0 — Patch Notes",
    type: "patch",
    date: "2025-01-15",
    author: "Moonlighter Games",
    excerpt: "Shop opens for business! New Nebula 9 Mini-Golf course, tutorial overhaul, and full controller support.",
    content: `## New Gameplay & Content

- **Shop Opens for Business** – Spend your hard-earned cash on tools and cosmetics in the brand-new Shop. (Equipped items will affect gameplay in a later update.)
- **Nebula 9 Mini-Golf Course** – Blast off to a neon space course with gravity-defying fairways and glowing hazards.
- **Tutorial Overhaul** – Level 1 now features a guided, step-by-step tutorial that explains every tool, core lore, and the new Shop.

## UI & Accessibility

- **Full Controller Navigation** – Every menu, pop-up, and the Shop can now be traversed entirely with a gamepad.
- **Paused Timer Fix** – Level timer properly halts when the game is paused and resumes on return.
- **Mission Highlight Refresh** – Clearer color coding improves objective readability.
- **Sensitivity Safe-Guard** – Ultra-low look-sensitivity settings no longer break camera control.
- **Save-File Migration** – Existing saves auto-upgrade to the new version without losing progress.

## Visual & Audio Polish

- **Grass Revamp** – Rendering is now deterministic but less uniform, giving lawns richer variation.
- **Particle Pass** – Leaf-blower VFX restored and overall particle effects amped up for extra punch.
- **Clipping Cleanup** – Stray grass clippings no longer hover above the turf.
- **Trash-Grabber Animation** – New pinch-and-pull motion makes litter collection feel snappier.

## Bug Fixes

- **Trash Grabber Cleanup** – Collected trash now properly despawns and updates stats.
- **Time UI Restoration** – Timer no longer disappears after entering and exiting the menu.
- **Leaf-Blower Particles** – Fixed missing blower particle effects.
- **Shadow-Distance Presets** – Very-Low and Low quality settings now apply the intended reduced shadow range.
- Miscellaneous stability and logic fixes.

## Performance & Stability

- **Optimization Pass** – Shadow-distance tweaks and grass-update refinements deliver smoother frame rates, especially on low-end GPUs.
- **Backend Versioning** – New save-migration system future-proofs player data.

### Play the Demo!

You can find the link to the demo in our discord server. The link to the discord is: "https://discord.gg/N4nGqR8swj"`
  },
  {
    id: "build-0.1.5",
    title: "Build 0.1.5 — Patch Notes",
    type: "patch",
    date: "2025-01-12",
    author: "Moonlighter Games",
    excerpt: "Trash collection, toggleable tools, new game over screen, and tons of quality of life improvements!",
    content: `## New Gameplay

- **Trash Collection** – Use the Trash Grabber to pick up litter and earn cash, now tracked in level stats.
- **Toggleable Tools** – Weed Eater & Leaf Blower now toggle on/off with a single press for accessibility.

## UI & Accessibility

- **Game Over Scene** – New end-level screen displays time, earnings, trash collected, and more.
- **No Longer Forced to Exit** – Players can now stay in a level after completing it.
- **Settings Menu Fix** – Always reopens to the Career tab.
- **Global Button Tips** – Optional always-on keybinding hints, toggleable in settings.
- **Tool/UI Toggles** – Added accessibility options for persistent tools and HUD elements.
- **Live Time & Money Display** – Real-time updates for in-level timer and earnings.

## Visual & Audio Polish

- **Mini-Golf Level 4** – Updated visuals and smoother gameplay.
- **Grass Shader Fix** – Grass no longer clips through mower sides.
- **Tool Audio Updates** – Improved sound effects for various tools.

### Play the Demo!

You can find the link to the demo in our discord server. The link to the discord is: "https://discord.gg/N4nGqR8swj"`
  }
]