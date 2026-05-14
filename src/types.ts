export interface UserProfile {
  uid: string;
  displayName: string;
  roomId?: string;
}

export interface Room {
  id: string;
  code: string;
  partner1: string;
  partner1Name: string;
  partner2?: string;
  partner2Name?: string;
  startDate?: string;
}

export interface Rule {
  id: string;
  title: string;
  description: string;
  authorId: string;
  authorName: string;
  createdAt: any;
  isDone: boolean;
}

export interface Vow {
  id: string;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: any;
}

export interface Memory {
  id: string;
  text: string;
  date: string;
  imageUrl?: string;
  authorId: string;
  createdAt: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}
