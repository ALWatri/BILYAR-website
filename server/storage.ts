import type { IStorage } from "./storage-pg";

export type { IStorage } from "./storage-pg";

export async function getStorage(): Promise<IStorage> {
  if (process.env.FIREBASE_PROJECT_ID) {
    const { FirestoreStorage } = await import("./storage-firestore");
    return new FirestoreStorage();
  }
  const { DatabaseStorage } = await import("./storage-pg");
  return new DatabaseStorage();
}
