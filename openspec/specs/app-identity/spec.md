# app-identity Specification

## Purpose

How LessonLoop presents itself where the browser shows it rather than the page: the tab,
the bookmark, the home-screen shortcut. The lesson is a second window open beside a video
call, so being findable in one glance is part of it working at all.

## Requirements

### Requirement: The app is recognisable wherever a browser shows a page

The app SHALL present an icon of its own everywhere a browser shows one for a page — the
tab, the bookmark, the history entry — and that icon SHALL stay legible at the smallest
size a tab uses. No screen SHALL fall back to the browser's blank-page placeholder.

#### Scenario: Picking the lesson out of a row of tabs
- **WHEN** the app is open in a tab beside several others
- **THEN** its tab carries the app's own mark rather than a blank sheet

#### Scenario: The mark at tab size
- **WHEN** the icon is rendered at 16 pixels square
- **THEN** the loop and its opening are still distinguishable, with no detail too fine to
  survive at that size

#### Scenario: A bookmark keeps the mark
- **WHEN** the app is bookmarked
- **THEN** the bookmark carries the same mark as the tab

### Requirement: The app can be kept on a home screen

The app SHALL offer a device everything it needs to make a home-screen shortcut of its
own: a name short enough to sit under a tile without being cut off, the mark at the sizes
tiles are drawn from, and the colours the surrounding chrome should take. Opening the
shortcut SHALL land on the app's home screen.

#### Scenario: Added to a tablet home screen
- **WHEN** the teacher adds the app to her tablet's home screen
- **THEN** the tile shows the app's mark, not a screenshot of the page, and the label
  under it reads as the app's name rather than a truncated URL

#### Scenario: Opening from the tile
- **WHEN** the shortcut is tapped
- **THEN** the app opens on its home screen, ready to choose a lesson

#### Scenario: The chrome matches the page
- **WHEN** the app is shown on a device that tints its browser or status bar per page
- **THEN** the tint matches the app's own background rather than a default white or black

### Requirement: Every platform gets a form of the icon it accepts

The app SHALL provide the mark in the forms the target platforms actually use, including a
raster form at the sizes required by platforms that ignore vector icons. No platform SHALL
be left to invent an icon by screenshotting the page or by showing nothing.

#### Scenario: A platform that ignores vector icons
- **WHEN** the app is added to the home screen on a device whose icon slot takes only a
  raster image
- **THEN** it is given a raster of the mark at the size that slot expects

#### Scenario: A browser that prefers a vector icon
- **WHEN** a browser that supports vector icons shows the tab
- **THEN** it is offered the vector form, which stays sharp at any scale the browser picks

#### Scenario: One mark, not several drawings
- **WHEN** the tab icon and the home-screen tile are compared
- **THEN** they are the same mark, differing only in the size they are drawn at

### Requirement: Every icon the app declares exists and is what it claims

Every icon reference the app publishes — from the page and from the shortcut description
alike — SHALL resolve to a file that exists, and each raster SHALL have the pixel size it
is declared with. A declared icon that is missing or the wrong size SHALL be caught before
release, not by the teacher finding a blank tab.

#### Scenario: A declared icon that is missing
- **WHEN** an icon is referenced but its file is absent from the built output
- **THEN** the project's checks fail

#### Scenario: A raster that is not the size it claims
- **WHEN** an icon is declared at one size but the file is another
- **THEN** the project's checks fail

### Requirement: The identity costs the lesson nothing

The icons SHALL be same-origin static files and SHALL NOT put the lesson on the network:
no exercise, no room and no screen SHALL wait on an icon, and no icon SHALL be fetched from
a third party. A lesson played with the network gone SHALL behave exactly as it did before
the app had an icon.

#### Scenario: Playing with the network gone
- **WHEN** the network is unavailable after the page has loaded
- **THEN** the lesson behaves exactly as specified for offline play, unaffected by whether
  any icon was ever fetched

#### Scenario: No third party is asked
- **WHEN** the page is loaded
- **THEN** every icon it requests is served from the app's own origin
