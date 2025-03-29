export interface PadRecord {
  id: string;
  title: string;
  content?: string;
  created?: string;
  updated?: string;
  created_by: string;
  space: string;
}

export interface PadUpdateRecord {
  id: string;
  pad: string;
  updateData: string;
  clientId: string;
  created?: string;
}

export type PadResponse = PadRecord & {
  collectionId: string;
  collectionName: string;
  expand?: Record<string, any>;
};

export type PadUpdateResponse = PadUpdateRecord & {
  collectionId: string;
  collectionName: string;
  expand?: Record<string, any>;
};