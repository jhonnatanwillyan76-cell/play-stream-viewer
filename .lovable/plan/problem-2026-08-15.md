---
title: Fix Series Grouping and Player Logic
description: Consolidate multiple episodes into single series entries and implement an episode selector.
---

## Problem
1. In the M3U list, each episode of a series is treated as a separate content item on the home screen.
2. Clicking a series item goes directly to an episode (likely the first one in the list) without allowing the user to choose an episode.

## Solution
1. **Consolidate Series Items**: Modify the M3U parser to group episodes by series name. Use a clean series name (removing episode/season tags) as the unique identifier.
2. **Episode Metadata**: Store the list of episodes (name + URL) within each series object.
3. **Dedicated Title Route**: Re-enable `/title/$type/$slug` to handle detailed views.
4. **Episode Selector**: Implement a UI in the title details page that allows users to pick an episode before playing.

## Technical Details

### `src/lib/m3u.functions.ts`
- Update `M3UItem` to include `episodes?: { name: string, url: string }[]`.
- In `parseM3U`, detect if an item is a series and extract a base title (e.g., "The Boys" instead of "The Boys S01 E01").
- Group series by this base title. If a series already exists in the list, add the current URL as a new episode instead of a new item.

### `src/routes/title.$type.$slug.tsx`
- Replace `notFound()` redirect with a functional component.
- The loader will find the specific item by slug (or base title).
- The component will render the series logo, title, and a list of episodes.
- For movies, it will show a single "Play" button.

### `src/components/PosterCard.tsx`
- Update links to use the internal `/title/$type/$slug` route instead of external `<a>` links.
- The `slug` will be derived from the base title for series.

### UI Improvements
- Use a grid for episode selection.
- Ensure the "Full Screen" button is always available and functional in the player.