import { EIP } from '../types/eip';
import eipsDataRaw from './eips.json';

export const eipsData = eipsDataRaw as EIP[];

export const eipById: Map<number, EIP> = new Map(
  eipsData.map((eip) => [eip.id, eip])
);
