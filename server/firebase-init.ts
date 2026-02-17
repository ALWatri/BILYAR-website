import { createRequire } from "module";
import { getApps } from "firebase-admin/app";
import { readFileSync } from "fs";

declare const __filename: string | undefined;
const admin = (typeof __filename !== "undefined"
  ? createRequire(__filename)
  : createRequire(import.meta.url!)
)("firebase-admin") as typeof import("firebase-admin");

export function initFirebase(): ReturnType<typeof admin.app> {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0] as ReturnType<typeof admin.app>;
  }
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required when using Firestore");
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const parsed = JSON.parse(serviceAccountJson) as {
        type?: string;
        project_id?: string;
        private_key_id?: string;
        private_key?: string;
        client_email?: string;
        client_id?: string;
      };
      if (parsed.private_key && typeof parsed.private_key === "string") {
        parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
      }
      return admin.initializeApp({
        credential: admin.credential.cert(parsed as import("firebase-admin").ServiceAccount),
        projectId: parsed.project_id ?? projectId,
      });
    } catch (e) {
      throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_JSON: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const parsed = JSON.parse(readFileSync(credPath, "utf8"));
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return admin.initializeApp({
      credential: admin.credential.cert(parsed),
      projectId: parsed.project_id ?? projectId,
    });
  }

  throw new Error(
    "Firebase credential required. Set FIREBASE_SERVICE_ACCOUNT_JSON (JSON string) or GOOGLE_APPLICATION_CREDENTIALS (path to key file)."
  );
}

/** Returns the default Storage bucket when Firebase is already initialized (e.g. when using Firestore); null otherwise. */
export function getFirebaseStorageBucket(): import("firebase-admin").storage.Bucket | null {
  if (getApps().length === 0) return null;
  return admin.storage().bucket();
}
