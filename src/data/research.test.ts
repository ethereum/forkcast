import { describe, expect, it } from 'vitest';
import { eipsData } from './eips';
import {
  northStars,
  researchAreas,
  type NorthStarId,
  type ResearchLink,
} from './research';

const northStarIds = new Set<NorthStarId>(northStars.map((star) => star.id));

describe('research areas', () => {
  it('declares unique ids', () => {
    const ids = researchAreas.map((area) => area.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Alphabetical order is the page's only guarantee that the list isn't read as a
  // ranking, and the page says so in as many words. Keep it true.
  it('is sorted alphabetically by name', () => {
    const names = researchAreas.map((area) => area.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('tags only north stars that exist', () => {
    for (const area of researchAreas) {
      for (const id of area.northStars) {
        expect(northStarIds, `${area.id} -> ${id}`).toContain(id);
      }
    }
  });

  it('gives every area at least one layer and one link', () => {
    for (const area of researchAreas) {
      expect(area.layers.length, area.id).toBeGreaterThan(0);
      expect(area.links.length, area.id).toBeGreaterThan(0);
    }
  });

  // `url` and `eipId` pick which element renders, so a link carrying both or
  // neither is a silently broken anchor rather than a type error.
  it('sets exactly one of url / eipId on every link', () => {
    const links: Array<{ area: string; link: ResearchLink }> = researchAreas.flatMap((area) =>
      area.links.map((link) => ({ area: area.id, link })),
    );
    for (const { area, link } of links) {
      const kinds = [link.url, link.eipId].filter((value) => value !== undefined);
      expect(kinds.length, `${area} -> ${link.label}`).toBe(1);
    }
  });

  // The page renders `eipId` as /eips/{id} without looking the EIP up, so that it
  // doesn't pull the whole EIP chunk into this route. This is what stops that
  // link 404ing.
  it('only links to EIPs Forkcast tracks', () => {
    const known = new Set(eipsData.map((eip) => eip.id));
    for (const area of researchAreas) {
      for (const link of area.links) {
        if (link.eipId === undefined) continue;
        expect(known, `${area.id} -> EIP-${link.eipId}`).toContain(link.eipId);
      }
    }
  });

  // `kind` is what the page prints in the left column of the reading list, so a
  // missing one silently mislabels a spec as a website.
  it('gives every outside link a kind, and no EIP link one', () => {
    const kinds: ResearchLink['kind'][] = ['research', 'spec', 'notes', 'site'];
    for (const area of researchAreas) {
      for (const link of area.links) {
        if (link.eipId !== undefined) {
          expect(link.kind, `${area.id} -> EIP-${link.eipId}`).toBeUndefined();
        } else {
          expect(kinds, `${area.id} -> ${link.label}`).toContain(link.kind);
        }
      }
    }
  });

  // A headliner anchors one fork, and the ACD process has one consensus and one
  // execution slot per fork — so the same proposal can't headline two areas.
  it('names each headliner once, on exactly one area', () => {
    const seen = new Map<string, string>();
    for (const area of researchAreas) {
      if (area.headliners === undefined) continue;
      expect(area.headliners.length, area.id).toBeGreaterThan(0);
      for (const headliner of area.headliners) {
        expect(headliner.name.trim(), area.id).not.toBe('');
        expect(seen.has(headliner.name), `${headliner.name} also on ${seen.get(headliner.name)}`).toBe(
          false,
        );
        seen.set(headliner.name, area.id);
      }
    }
    // Every area still renders, marked or not — the badge highlights, it never filters.
    expect(researchAreas.length).toBeGreaterThan(seen.size);
  });

  // The page marks the one reading-list row that is the headliner. A pointer that
  // matches nothing would silently mark no row, which is the ambiguity this field
  // exists to remove.
  it('points each headliner at a link in its own area', () => {
    for (const area of researchAreas) {
      for (const headliner of area.headliners ?? []) {
        if (headliner.eipId === undefined && headliner.url === undefined) continue;
        const match = area.links.filter(
          (link) =>
            (headliner.eipId !== undefined && link.eipId === headliner.eipId) ||
            (headliner.url !== undefined && link.url === headliner.url),
        );
        expect(match.length, `${area.id} -> ${headliner.name}`).toBe(1);
      }
    }
  });

  // /research offers a filter chip per goal. A goal no area serves would render a
  // chip that narrows the list to nothing.
  it('gives every goal at least one area', () => {
    for (const star of northStars) {
      const serving = researchAreas.filter((area) => area.northStars.includes(star.id));
      expect(serving.length, star.id).toBeGreaterThan(0);
    }
  });

  it('uses absolute https urls for outside resources', () => {
    for (const area of researchAreas) {
      for (const link of area.links) {
        if (link.url === undefined) continue;
        expect(link.url, `${area.id} -> ${link.label}`).toMatch(/^https:\/\//);
      }
    }
  });
});
