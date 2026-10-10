-- Current-state views. Derived fields are never stored as writable columns.
-- Re-runnable so migrate.ts can apply this after drizzle migrations.

CREATE INDEX IF NOT EXISTS forecast_lines_status_idx
  ON forecast_lines (forecast_id, status);
CREATE INDEX IF NOT EXISTS forecast_commits_parent_status_idx
  ON forecast_commits (parent_forecast_line_id, status);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx
  ON audit_events (entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS domain_events_aggregate_idx
  ON domain_events (aggregate_type, aggregate_id, created_at);

CREATE OR REPLACE VIEW v_forecast_lines_current AS
SELECT *
FROM forecast_lines
WHERE status = 'published';

CREATE OR REPLACE VIEW v_forecast_commits_current AS
SELECT *
FROM forecast_commits
WHERE status IN ('offered', 'accepted', 'rejected');

CREATE OR REPLACE VIEW forecast_line_metrics AS
SELECT
  fl.id AS forecast_line_id,
  fl.forecast_id,
  fl.version,
  fl.status,
  fl.requested_qty,
  COALESCE(SUM(fc.committed_qty) FILTER (
    WHERE fc.status IN ('offered', 'accepted') AND fc.committed_qty::numeric > 0
  ), 0) AS committed_qty,
  fl.requested_qty - COALESCE(SUM(fc.committed_qty) FILTER (
    WHERE fc.status IN ('offered', 'accepted') AND fc.committed_qty::numeric > 0
  ), 0) AS gap_qty,
  COALESCE(BOOL_OR(
    fc.status IN ('offered', 'accepted')
    AND fc.committed_qty::numeric > 0
    AND fc.committed_date IS NOT NULL
    AND fc.committed_date > fl.requested_date
  ), false) AS late_flag,
  COALESCE(SUM(fc.committed_qty) FILTER (
    WHERE fc.status IN ('offered', 'accepted')
      AND fc.committed_qty::numeric > 0
      AND fc.committed_date IS NOT NULL
      AND fc.committed_date > fl.requested_date
  ), 0) AS late_qty,
  now() - MAX(fc.committed_at) FILTER (
    WHERE fc.status IN ('offered', 'accepted')
  ) AS commit_age,
  fl.requested_qty - prev.requested_qty AS version_delta_qty,
  (fl.requested_date - prev.requested_date) AS version_delta_date_days,
  MAX(fc.reason_code::text) FILTER (
    WHERE fc.status IN ('offered', 'accepted') AND fc.committed_qty::numeric = 0
  ) AS gap_reason_code
FROM forecast_lines fl
LEFT JOIN forecast_commits fc ON fc.parent_forecast_line_id = fl.id
LEFT JOIN forecast_lines prev
  ON prev.forecast_id = fl.forecast_id
 AND prev.version = fl.version - 1
GROUP BY
  fl.id,
  fl.forecast_id,
  fl.version,
  fl.status,
  fl.requested_qty,
  fl.requested_date,
  prev.requested_qty,
  prev.requested_date;

-- OTIF is measured against the supplier's promise_date, never the original request date.
CREATE OR REPLACE VIEW otif_metrics AS
SELECT
  po.id AS purchase_order_id,
  po.po_number,
  po.line,
  po.schedule_line,
  ack.promise_date,
  ack.promise_qty,
  rec.occurred_at::date AS receipt_date,
  rec.qty AS received_qty,
  CASE
    WHEN rec.id IS NULL THEN NULL
    WHEN rec.occurred_at::date <= ack.promise_date THEN true
    ELSE false
  END AS otif
FROM purchase_orders po
LEFT JOIN LATERAL (
  SELECT *
  FROM po_acknowledgements a
  WHERE a.purchase_order_id = po.id
  ORDER BY a.acknowledged_at DESC
  LIMIT 1
) ack ON true
LEFT JOIN LATERAL (
  SELECT *
  FROM execution_events e
  WHERE e.purchase_order_id = po.id AND e.event_type = 'receipt'
  ORDER BY e.occurred_at DESC
  LIMIT 1
) rec ON true;

CREATE OR REPLACE FUNCTION scp_prevent_collaboration_mutation()
RETURNS trigger AS $$
BEGIN
  IF TG_TABLE_NAME = 'forecast_lines' THEN
    IF NEW.forecast_id IS DISTINCT FROM OLD.forecast_id
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.requested_qty IS DISTINCT FROM OLD.requested_qty
       OR NEW.requested_date IS DISTINCT FROM OLD.requested_date
       OR NEW.demand_type IS DISTINCT FROM OLD.demand_type
       OR NEW.uom IS DISTINCT FROM OLD.uom
       OR NEW.need_by_convention IS DISTINCT FROM OLD.need_by_convention
       OR NEW.part_id IS DISTINCT FROM OLD.part_id
       OR NEW.horizon_bucket IS DISTINCT FROM OLD.horizon_bucket THEN
      RAISE EXCEPTION 'forecast_lines quantities and identity are append-only; insert a new version';
    END IF;
  ELSIF TG_TABLE_NAME = 'forecast_commits' THEN
    IF NEW.commit_id IS DISTINCT FROM OLD.commit_id
       OR NEW.version IS DISTINCT FROM OLD.version
       OR NEW.committed_qty IS DISTINCT FROM OLD.committed_qty
       OR NEW.committed_date IS DISTINCT FROM OLD.committed_date
       OR NEW.commit_grade IS DISTINCT FROM OLD.commit_grade
       OR NEW.parent_forecast_line_id IS DISTINCT FROM OLD.parent_forecast_line_id THEN
      RAISE EXCEPTION 'forecast_commits quantities and identity are append-only; insert a new version';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forecast_lines_append_only ON forecast_lines;
CREATE TRIGGER forecast_lines_append_only
  BEFORE UPDATE ON forecast_lines
  FOR EACH ROW
  EXECUTE FUNCTION scp_prevent_collaboration_mutation();

DROP TRIGGER IF EXISTS forecast_commits_append_only ON forecast_commits;
CREATE TRIGGER forecast_commits_append_only
  BEFORE UPDATE ON forecast_commits
  FOR EACH ROW
  EXECUTE FUNCTION scp_prevent_collaboration_mutation();

CREATE OR REPLACE FUNCTION scp_deny_delete()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% rows cannot be deleted; supersede or retain for audit', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forecast_lines_no_delete ON forecast_lines;
CREATE TRIGGER forecast_lines_no_delete
  BEFORE DELETE ON forecast_lines
  FOR EACH ROW
  EXECUTE FUNCTION scp_deny_delete();

DROP TRIGGER IF EXISTS forecast_commits_no_delete ON forecast_commits;
CREATE TRIGGER forecast_commits_no_delete
  BEFORE DELETE ON forecast_commits
  FOR EACH ROW
  EXECUTE FUNCTION scp_deny_delete();

DROP TRIGGER IF EXISTS domain_events_no_delete ON domain_events;
CREATE TRIGGER domain_events_no_delete
  BEFORE DELETE ON domain_events
  FOR EACH ROW
  EXECUTE FUNCTION scp_deny_delete();

DROP TRIGGER IF EXISTS audit_events_no_delete ON audit_events;
CREATE TRIGGER audit_events_no_delete
  BEFORE DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION scp_deny_delete();
