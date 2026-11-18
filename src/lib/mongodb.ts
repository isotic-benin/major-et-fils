import "server-only";

import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const dbName = process.env.MONGODB_DB || "shopify";

declare global {
  var __koraMongoClientPromise: Promise<MongoClient> | undefined;
}

function createClient() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 8_000,
    maxPoolSize: 10,
  });
  return client.connect();
}

const clientPromise =
  process.env.NODE_ENV === "development"
    ? (global.__koraMongoClientPromise ??=
        createClient())
    : createClient();

export const mongoClientPromise = clientPromise;

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  return client.db(dbName);
}

export async function pingDatabase() {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
