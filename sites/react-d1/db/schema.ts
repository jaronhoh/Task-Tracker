import { sqliteTable, text, integer, index, check } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
export const sequence = sqliteTable('app_sequence', { sequence_name: text().primaryKey(), next_value: integer().notNull() }, t => [check('positive_sequence', sql`${t.next_value} >= 1`)]);
export const revision = sqliteTable('app_revision', { id: integer().primaryKey(), revision: integer().notNull().default(0), token: text().notNull().default('') });
export const customers = sqliteTable('customers', { name: text().primaryKey(), normalized_name: text().notNull().unique(), color: text().notNull().unique() });
export const tasks = sqliteTable('tasks', { task_id: text().primaryKey(), customer_name: text().notNull(), task_title: text().notNull(), task_description: text(), note: text(), created: text().notNull(), end: text(), status: text().notNull() }, t => [index('idx_tasks_customer_id').on(t.customer_name,t.task_id), index('idx_tasks_created').on(t.created), check('title_length',sql`length(${t.task_title}) BETWEEN 1 AND 100`),check('valid_status',sql`${t.status} IN ('Work in Progress','Pending with Customer','KIV','Closed','Deleted')`)]);
