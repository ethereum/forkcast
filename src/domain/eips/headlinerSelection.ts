import type { HeadlinerSelection, HeadlinerSelectionLayer } from '../../types/eip';

export const HEADLINER_SELECTION_LAYERS: HeadlinerSelectionLayer[] = ['EL', 'CL'];

export const getSelectedHeadlinerIds = (selection?: HeadlinerSelection): number[] =>
  HEADLINER_SELECTION_LAYERS
    .map((layer) => selection?.selected[layer])
    .filter((eipId): eipId is number => eipId !== undefined);

export const isSelectedHeadlinerId = (selection: HeadlinerSelection | undefined, eipId: number): boolean =>
  getSelectedHeadlinerIds(selection).includes(eipId);

export const isHeadlinerSelectionFinalized = (selection?: HeadlinerSelection): boolean =>
  selection?.status === 'finalized';
