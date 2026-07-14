import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { EIP } from '../types';
import { networkUpgrades } from './upgrades';
import { HEADLINER_SELECTION_LAYERS, getSelectedHeadlinerIds } from '../domain/eips/headlinerSelection';

const sourceEips = readdirSync('src/data/eips')
  .filter((fileName) => fileName.endsWith('.json'))
  .map((fileName) => JSON.parse(readFileSync(`src/data/eips/${fileName}`, 'utf8')) as EIP);

const eipById = new Map(sourceEips.map((eip) => [eip.id, eip]));

describe('networkUpgrades headliner selections', () => {
  it('keeps selected headliners unique and aligned to layer slots when layer is known', () => {
    for (const upgrade of networkUpgrades) {
      const selectedIds = getSelectedHeadlinerIds(upgrade.headlinerSelection);
      expect(new Set(selectedIds).size, upgrade.id).toBe(selectedIds.length);

      for (const layer of HEADLINER_SELECTION_LAYERS) {
        const selectedEipId = upgrade.headlinerSelection?.selected[layer];
        if (selectedEipId === undefined) continue;

        const eip = eipById.get(selectedEipId);
        expect(eip, `${upgrade.id} ${layer} headliner ${selectedEipId}`).toBeDefined();
        if (eip?.layer) {
          expect(eip.layer, `${upgrade.id} ${layer} headliner ${selectedEipId}`).toBe(layer);
        }
      }
    }
  });
});
