import { supabase } from './supabase';
import { OperationType, DatabaseErrorInfo } from '../types';

export async function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null) {
  const { data: { session } } = await supabase.auth.getSession();
  const errInfo: DatabaseErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: session?.user?.id,
      email: session?.user?.email,
    },
    operationType,
    path
  }
  console.error('Database Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
