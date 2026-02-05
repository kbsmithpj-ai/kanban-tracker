import { useState, useEffect, useCallback } from 'react';
import { Modal } from '../../common';
import { supabase } from '../../../lib/supabase';
import type { DbErrorLog, ErrorSeverity } from '../../../types/database';
import styles from './ErrorLogModal.module.css';

interface ErrorLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SeverityFilter = 'all' | ErrorSeverity;

interface DateRange {
  start: string;
  end: string;
}

/**
 * Get the default date range (last 7 days).
 */
function getDefaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 7);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Format a timestamp for display.
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format JSON context for display.
 */
function formatContext(context: Record<string, unknown>): string {
  return JSON.stringify(context, null, 2);
}

export function ErrorLogModal({ isOpen, onClose }: ErrorLogModalProps) {
  const [logs, setLogs] = useState<DbErrorLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('error_logs')
        .select('*')
        .gte('created_at', `${dateRange.start}T00:00:00`)
        .lte('created_at', `${dateRange.end}T23:59:59`)
        .order('created_at', { ascending: false });

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setLogs(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch error logs');
    } finally {
      setLoading(false);
    }
  }, [severityFilter, dateRange]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  const handleToggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, logId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggleExpand(logId);
    }
  };

  const severityOptions: { value: SeverityFilter; label: string }[] = [
    { value: 'all', label: 'All Severities' },
    { value: 'info', label: 'Info' },
    { value: 'warning', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Error Logs"
      footer={
        <button
          type="button"
          className={styles.closeButton}
          onClick={onClose}
        >
          Close
        </button>
      }
    >
      <div className={styles.container}>
        {/* Filters */}
        <div className={styles.filters}>
          <div className={styles.filterGroup}>
            <label htmlFor="severity-filter" className={styles.filterLabel}>
              Severity
            </label>
            <select
              id="severity-filter"
              className={styles.select}
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
            >
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="date-start" className={styles.filterLabel}>
              From
            </label>
            <input
              type="date"
              id="date-start"
              className={styles.dateInput}
              value={dateRange.start}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, start: e.target.value }))
              }
            />
          </div>

          <div className={styles.filterGroup}>
            <label htmlFor="date-end" className={styles.filterLabel}>
              To
            </label>
            <input
              type="date"
              id="date-end"
              className={styles.dateInput}
              value={dateRange.end}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, end: e.target.value }))
              }
            />
          </div>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={fetchLogs}
            disabled={loading}
            aria-label="Refresh logs"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        {/* Log List */}
        <div className={styles.logList} role="log" aria-live="polite">
          {loading && logs.length === 0 ? (
            <div className={styles.loadingState}>Loading error logs...</div>
          ) : logs.length === 0 ? (
            <div className={styles.emptyState}>
              No error logs found for the selected filters.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className={styles.logItem}>
                <div
                  className={styles.logHeader}
                  onClick={() => handleToggleExpand(log.id)}
                  onKeyDown={(e) => handleKeyDown(e, log.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expandedLogId === log.id}
                  aria-controls={`log-details-${log.id}`}
                >
                  <span className={styles.timestamp}>
                    {formatTimestamp(log.created_at)}
                  </span>
                  <span
                    className={`${styles.severityBadge} ${styles[`severity${log.severity.charAt(0).toUpperCase()}${log.severity.slice(1)}`]}`}
                  >
                    {log.severity.toUpperCase()}
                  </span>
                  <span className={styles.message}>{log.message}</span>
                  <span
                    className={`${styles.expandIcon} ${expandedLogId === log.id ? styles.expanded : ''}`}
                    aria-hidden="true"
                  >
                    &#9662;
                  </span>
                </div>

                {expandedLogId === log.id && (
                  <div
                    id={`log-details-${log.id}`}
                    className={styles.logDetails}
                  >
                    {log.url && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>URL:</span>
                        <span className={styles.detailValue}>{log.url}</span>
                      </div>
                    )}
                    {log.user_agent && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>User Agent:</span>
                        <span className={styles.detailValue}>
                          {log.user_agent}
                        </span>
                      </div>
                    )}
                    {log.user_id && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>User ID:</span>
                        <span className={styles.detailValue}>{log.user_id}</span>
                      </div>
                    )}
                    {Object.keys(log.context).length > 0 && (
                      <div className={styles.detailSection}>
                        <span className={styles.detailLabel}>Context:</span>
                        <pre className={styles.codeBlock}>
                          {formatContext(log.context)}
                        </pre>
                      </div>
                    )}
                    {log.stack_trace && (
                      <div className={styles.detailSection}>
                        <span className={styles.detailLabel}>Stack Trace:</span>
                        <pre className={styles.codeBlock}>{log.stack_trace}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Log Count */}
        {logs.length > 0 && (
          <div className={styles.logCount}>
            Showing {logs.length} log{logs.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Modal>
  );
}
