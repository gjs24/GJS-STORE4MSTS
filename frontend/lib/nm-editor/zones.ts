import { IrZone, CoachClass } from './types';

export const IR_ZONES: IrZone[] = [
  { code: "SR", name: "Southern Railway", hq: "Chennai Central" },
  { code: "NR", name: "Northern Railway", hq: "New Delhi" },
  { code: "CR", name: "Central Railway", hq: "Mumbai CSMT" },
  { code: "WR", name: "Western Railway", hq: "Mumbai Central" },
  { code: "ER", name: "Eastern Railway", hq: "Kolkata" },
  { code: "SER", name: "South Eastern Railway", hq: "Kolkata" },
  { code: "SCR", name: "South Central Railway", hq: "Secunderabad" },
  { code: "SWR", name: "South Western Railway", hq: "Hubballi" },
  { code: "ECoR", name: "East Coast Railway", hq: "Bhubaneswar" },
  { code: "ECR", name: "East Central Railway", hq: "Hajipur" },
  { code: "NCR", name: "North Central Railway", hq: "Prayagraj" },
  { code: "NWR", name: "North Western Railway", hq: "Jaipur" },
  { code: "NER", name: "North Eastern Railway", hq: "Gorakhpur" },
  { code: "NFR", name: "Northeast Frontier Railway", hq: "Guwahati" },
  { code: "WCR", name: "West Central Railway", hq: "Jabalpur" },
  { code: "SECR", name: "South East Central Railway", hq: "Bilaspur" },
  { code: "KR", name: "Konkan Railway", hq: "Navi Mumbai" }
];

export const COACH_CLASSES: CoachClass[] = [
  { code: "1A", name: "AC First Class (H1)" },
  { code: "2A", name: "AC 2 Tier (A1, A2...)" },
  { code: "3A", name: "AC 3 Tier (B1, B2...)" },
  { code: "3E", name: "AC 3 Tier Economy (M1, M2...)" },
  { code: "CC", name: "AC Chair Car (C1, C2...)" },
  { code: "EC", name: "Executive Chair Car (E1...)" },
  { code: "SL", name: "Sleeper Class (S1, S2...)" },
  { code: "GS", name: "General / Second Class" },
  { code: "EOG", name: "End On Generation / Guard" }
];

