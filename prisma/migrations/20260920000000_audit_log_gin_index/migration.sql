-- GIN index on AuditLog.metadata (JSONB) for fast path-based lookups.
-- Every non-super-admin audit-log query filters by metadata->'farmId',
-- which without this index triggers a sequential scan on every request.
-- jsonb_path_ops is smaller and faster than the default GIN opclass
-- because we only need containment (@>) queries, not key-exists (?).

CREATE INDEX CONCURRENTLY "AuditLog_metadata_gin" ON "AuditLog" USING gin ("metadata" jsonb_path_ops);
