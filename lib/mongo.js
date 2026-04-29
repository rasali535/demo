import { MongoClient } from 'mongodb';

let clientPromise = null;

function getClient() {
  if (clientPromise) return clientPromise;
  const uri = process.env.MONGO_URL;
  if (!uri) {
    throw new Error('MONGO_URL is not set. Define it in your .env / hosting environment variables.');
  }
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
  return clientPromise;
}

export async function getDb() {
  const client = await getClient();
  const dbName = process.env.DB_NAME || 'magri';
  return client.db(dbName);
}
