import { sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  unique,
} from 'drizzle-orm/pg-core';

export const waitingList = pgTable('waiting-list', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  addedAt: timestamp('added_at').defaultNow(),
});

export const mailingList = pgTable('mailing-list', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull(),
  addedAt: timestamp('added_at').defaultNow(),
});

export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey().notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    user_id: text('user_id')
      .notNull()
      .$default(() => sql`requesting_user_id()`),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    uniqueCategoryPerUser: unique().on(table.name, table.user_id),
  })
);

export const intents = pgTable('intents', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  text: text('text').notNull(),
  user_id: text('user_id')
    .notNull()
    .$default(() => sql`requesting_user_id()`),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const links = pgTable('links', {
  id: uuid('id').defaultRandom().primaryKey().notNull(),
  url: text('url').notNull(),
  title: text('title').notNull(),
  user_id: text('user_id')
    .notNull()
    .$default(() => sql`requesting_user_id()`),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});

export const userLinks = pgTable('user_links', {
  id: uuid('id').defaultRandom().primaryKey(),
  user_id: text('user_id')
    .notNull()
    .$default(() => sql`requesting_user_id()`),
  link_id: uuid('link_id').references(() => links.id, {
    onDelete: 'cascade',
  }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
});
