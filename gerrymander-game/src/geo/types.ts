import type { Feature, MultiPolygon, Polygon } from 'geojson';

export type Pt = [number, number];
export type Ring = Pt[];

export interface MunicipalityProps {
  code: string;
  name: string;
  pref: string;
  prefName: string;
}
export type MunicipalityFeature = Feature<Polygon | MultiPolygon, MunicipalityProps>;

export interface PrefectureProps {
  pref: string;
  name: string;
}
export type PrefectureFeature = Feature<Polygon | MultiPolygon, PrefectureProps>;

export type Adjacency = Record<string, string[]>;
