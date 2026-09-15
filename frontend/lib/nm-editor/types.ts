export interface PartRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RsaSegment {
  station: string;
  upNo?: string;
  downNo?: string;
}

export interface SlrLuggageState {
  hindiText: string;
  englishText: string;
  smallBoardName: string;
  smallBoardHi: string;
  smallBoardReg: string;
  smallBoardEndpoints: string;
  liveryType: string;
}

export interface AtlasPartsVisibility {
  showLongBoard: boolean;
  showSlrLuggage: boolean;
  showDoorPlates: boolean;
  showDepotStencils: boolean;
}

export interface LayerVisibility {
  showBackgroundCoach: boolean;
  showBoardBase: boolean;
  showTrainNoBox: boolean;
  showStationHindi: boolean;
  showStationEnglish: boolean;
  showStationRegional: boolean;
  showViaStrip: boolean;
  showZoneEmblem: boolean;
  showScrewsAndRivets: boolean;
  showDepotMarking: boolean;
}

export interface BoardPartsCoordinates {
  longBoard: PartRect;
  slrLuggage: PartRect;
  doorPlates: PartRect;
  depotStencils: PartRect;
  [key: string]: PartRect;
}

export interface BoardState {
  boardMode: 'standard_2point' | 'multi_rsa';
  trainNo: string;
  trainName: string;
  sourceEn: string;
  sourceHi: string;
  sourceReg: string;
  destEn: string;
  destHi: string;
  destReg: string;
  viaEn?: string;
  viaHi?: string;
  zone: string;
  baseDepot: string;
  coachClass: string;
  customBoardColor: string | null;
  customTextColor: string | null;
  rsaSegments: RsaSegment[];
  slrLuggage: SlrLuggageState;
  atlasParts: AtlasPartsVisibility;
  parts: BoardPartsCoordinates;
  layers: LayerVisibility;
}

export interface WeatheringState {
  grime: number;
  rust: number;
  sunFade: number;
  ledBloom: number;
}

export interface AtlasTemplate {
  id: string;
  name: string;
  category: string;
  coachType: string;
  description: string;
  bgTheme: string;
  boardColor: string;
  boardBorderColor: string;
  textColor: string;
  accentColor: string;
  width: number;
  height: number;
  isStandardMaster?: boolean;
  hasScrews?: boolean;
  hasZoneBadge?: boolean;
  hasCoachClass?: boolean;
  hasViaStrip?: boolean;
  fontFamily: string;
  layout: 'full_atlas' | 'three_tier' | 'digital_matrix';
  atlasType?: 'icf' | 'lhb' | 'digital';
  defaultParts?: BoardPartsCoordinates;
  boardRect?: PartRect;
  author?: string;
  lockedByDefault?: boolean;
  defaultBoardState?: Partial<BoardState>;
}

export interface TrainData {
  trainNo: string;
  trainName: string;
  sourceEn: string;
  sourceHi: string;
  sourceReg: string;
  destEn: string;
  destHi: string;
  destReg: string;
  viaEn: string;
  viaHi: string;
  regLang: string;
  zone: string;
  baseDepot: string;
  coachClass: string;
}

export interface RegionalLanguage {
  id: string;
  name: string;
}

export interface IrZone {
  code: string;
  name: string;
  hq: string;
}

export interface CoachClass {
  code: string;
  name: string;
}

