<!-- sdlc:auto:start adr -->
# ADR-0001: Use React 19 for Frontend

Status: Accepted  
Date: 2026-11-13

## Context and Problem Statement

Which Frontend technology does the project use? Decided in architecture v1.

## Considered Options

- React 19
- Vue 3
- Angular 18
- Svelte

## Decision Outcome

Chosen option: React 19, because One responsive codebase carries all three roles: the patient booking on a phone, the doctor writing a consultation on a tablet and the administrator working a filterable list, with a component tree per role behind one bearer-token auth guard. The slot page uses interval polling against the availability endpoint for freshness, and the printable consultation view is a print-stylesheet route with no navigation chrome.

## Consequences

Plain client-rendered SPA means no server rendering and no SEO, which costs nothing here because every screen sits behind sign-in. Routing, data fetching and form state come from libraries rather than the framework, so the package list below carries them. The SPA lives on its own origin, which rules out cookie sessions and makes the bearer token the only workable design.
<!-- sdlc:auto:end adr -->