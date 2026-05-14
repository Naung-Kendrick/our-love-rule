export interface UserProfile {
  uid: string;
  display_name: string;
  room_id?: string;
}

export interface Room {
  id: string;
  code: string;
  partner1_name: string;
  partner2_name?: string;
  start_date?: string;
}

export interface Rule {
  id: string;
  room_id: string;
  title: string;
  description: string;
  author_id: string;
  author_name: string;
  created_at: any;
  is_done: boolean;
}

export interface Vow {
  id: string;
  room_id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: any;
}

export interface Memory {
  id: string;
  room_id: string;
  text: string;
  date: string;
  image_url: string;
  author_id: string;
  created_at: any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}
