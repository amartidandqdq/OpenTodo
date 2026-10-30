---
title: Original mockup A
summary: Presentation of the approved original mockup in the fork.
audience: developer
section: Reference
order: 98
specs: []
screens: []
---
# Original mockup A

The approved reference is direction A of the local `maquettes/directions.html`,
derived from the original `maquette-opentodo/index.html` prototype. The fork's
presentation now transposes that composition into the existing React app.

The desktop application bar sits above navigation and content. The sidebar starts
at 12 rem, with a 10.5–22.5 rem resize range; a previously stored width is retained.
The content is continuous rather than enclosed in an inset card. List titles,
bordered capture and the separate view toolbar establish the same hierarchy as
the reference. Metadata follows task titles at every width instead of moving into
property columns. Thin dividers and two density choices follow the original list
rhythm. Existing task operations, permission checks and op-based sync remain the
source of behavior.

This is an integration of the approved presentation into an application with more
features than the prototype. Workspace switching, shared-project controls, board
and timeline views, notifications, keyboard commands and phone navigation remain
available. Assistant classification is still the existing real-model proposal;
the prototype's simulated list/date proposal does not replace its implementation.

No new dependency, external font, image or network service is introduced. The
existing first-load bundle budget is checked on the production build.

Validation: the full web suite passed (4,936 tests), followed by focused checks
after the final presentation and phone-drawer fixes. Type checking, lint,
Storybook build, built service-worker/workbench checks, UI conventions,
translations and OpenSpec validation passed. The final entry is 299.8 KB gzip
(310 KB budget), with its static imports 671.4 KB (690 KB budget).

Browser checks used an isolated demo sandbox: desktop 1280×800 and phone
390×844, light and dark, no horizontal overflow, a single mobile title, project
Completed/reopen, drawer navigation, density and the optional docked details
panel. Comfortable/Compact measured 77/63 px on the same metadata-bearing row.
The personal demo uses `opentodo-fork:mockup-a` on its existing port 18831.
Task opening still respects Settings → Appearance → Task details; phone tasks
open as pages. There was no test on a physical touch device.
