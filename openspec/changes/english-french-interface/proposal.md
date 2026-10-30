# English and French interface

## Why
The user explicitly limits this fork to English and French to reduce translation maintenance and shipped assets.

## What changes
Offer only System, English and Français. Remove the German, Spanish, Italian and Portuguese web catalogs. Existing unsupported preferences follow the existing System fallback without overwriting stored values. Natural-language task parsing and regional date support keep their independent capabilities.

## Impact
No schema migration, dependency or additional network request. Removing four catalog chunks reduces cached assets. Existing language integration tests move to French.
