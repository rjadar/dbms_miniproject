import pg from "pg";
import neo4j from "neo4j-driver";
import type { Driver, ManagedTransaction } from "neo4j-driver";
import { MongoClient } from "mongodb";

const { Pool } = pg;
export const sql = new Pool({ connectionString: process.env.DATABASE_URL });
let graphDriver: Driver | undefined;
export function getGraph() {
  if (!graphDriver) {
    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) throw new Error("Neo4j connection settings are required");
    graphDriver=neo4j.driver(process.env.NEO4J_URI, neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD));
  }
  return graphDriver;
}
export async function writeGraph(query: string, params: Record<string, any>) {
  const session = getGraph().session();
  try { return await session.executeWrite((tx: ManagedTransaction) => tx.run(query, params)); }
  finally { await session.close(); }
}
type ComponentRow = { id: number; name: string; kind: string };
type EdgeRow = { source: number; target: number };
export async function replaceGraph(components: ComponentRow[], edges: EdgeRow[]) {
  const session = getGraph().session();
  try {
    await session.executeWrite(async (tx: ManagedTransaction) => {
      await tx.run("MATCH (c:Component) DETACH DELETE c");
      const nodes = await tx.run("UNWIND $components AS item CREATE (c:Component {id:item.id,name:item.name,kind:item.kind}) RETURN count(c) AS count", { components });
      if (nodes.records[0].get("count").toNumber() !== components.length) throw new Error("Neo4j did not create every component node");
      const relations = await tx.run("UNWIND $edges AS item MATCH (a:Component {id:item.source}),(b:Component {id:item.target}) CREATE (a)-[:DEPENDS_ON]->(b) RETURN count(*) AS count", { edges });
      if (relations.records[0].get("count").toNumber() !== edges.length) throw new Error("Neo4j did not create every dependency relationship");
    });
  } finally { await session.close(); }
}
export async function replaceGraphFromPostgres() {
  const [components, edges] = await Promise.all([
    sql.query("SELECT id,name,kind FROM components ORDER BY id"),
    sql.query("SELECT source_component_id AS source,target_component_id AS target FROM dependency_edges ORDER BY source_component_id,target_component_id")
  ]);
  await replaceGraph(components.rows, edges.rows);
}
const globalMongo = globalThis as typeof globalThis & { mongoPromise?: Promise<MongoClient> };
export async function getMongoDb() {
  globalMongo.mongoPromise ??= new MongoClient(process.env.MONGODB_URI!).connect();
  return globalMongo.mongoPromise.then(client => client.db(process.env.MONGODB_DATABASE || "impact_demo"));
}
