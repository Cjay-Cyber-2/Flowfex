import { pgTable, text, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('emailVerified').notNull(),
  image: text('image'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull()
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(()=> user.id)
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(()=> user.id),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: timestamp('accessTokenExpiresAt'),
  refreshTokenExpiresAt: timestamp('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt')
});

// Legacy/Flowfex custom tables (migrated to Drizzle)
export const flowfexSessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  auth_id: text("auth_id"),
  anonymous_token: text("anonymous_token"),
  connected_agents: jsonb("connected_agents").default([]),
  created_at: timestamp("created_at").defaultNow(),
  last_active_at: timestamp("last_active_at").defaultNow()
});

export const usageTracking = pgTable("usage_tracking", {
  id: text("id").primaryKey(),
  session_id: text("session_id"),
  auth_id: text("auth_id"),
  executions_count: integer("executions_count").default(0),
  nodes_processed: integer("nodes_processed").default(0),
  session_duration_seconds: integer("session_duration_seconds").default(0),
  period_start: timestamp("period_start").defaultNow(),
  created_at: timestamp("created_at").defaultNow()
});

export const apiKeys = pgTable("api_keys", {
  id: text("id").primaryKey(),
  auth_id: text("auth_id").notNull(),
  key_hash: text("key_hash").notNull(),
  key_prefix: text("key_prefix").notNull(),
  label: text("label").notNull(),
  is_active: boolean("is_active").default(true),
  created_at: timestamp("created_at").defaultNow(),
  last_used_at: timestamp("last_used_at")
});
