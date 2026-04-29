"""
Macro Snapshot Worker — background refresh thread.

Periodically calls ``generate_macro_snapshot()`` and writes the result to the
cache so that frontend-facing APIs can serve instantly from a precomputed
snapshot instead of blocking on live external fetches.

Pattern mirrors the existing PolymarketWorker for consistency.

Configuration (environment variables):
    MACRO_SNAPSHOT_INTERVAL_SEC  Refresh interval in seconds (default: 900 = 15 min)
    MACRO_SNAPSHOT_ENABLED       Set to "false" to disable the worker (default: true)
"""
from __future__ import annotations

import os
import threading
import time
from typing import Optional

from app.utils.logger import get_logger

logger = get_logger(__name__)


class MacroSnapshotWorker:
    """Background thread that periodically precomputes the Macro snapshot."""

    def __init__(self, interval_seconds: int = 900):
        """
        Args:
            interval_seconds: How often to refresh the snapshot.  Defaults to
                900 s (15 min).  Override via ``MACRO_SNAPSHOT_INTERVAL_SEC``.
        """
        self.interval_seconds = interval_seconds
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._last_refresh_ts: float = 0.0
        self._refresh_count: int = 0

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> bool:
        """Start the background worker thread.  Idempotent — safe to call twice."""
        with self._lock:
            if self._thread and self._thread.is_alive():
                logger.debug("[MacroSnapshotWorker] Already running, skipping start")
                return True

            self._stop_event.clear()
            self._thread = threading.Thread(
                target=self._run_loop,
                name="MacroSnapshotWorker",
                daemon=True,
            )
            self._thread.start()
            logger.info(
                "[MacroSnapshotWorker] Started (interval=%ds)",
                self.interval_seconds,
            )
            return True

    def stop(self, timeout_sec: float = 5.0) -> None:
        """Signal the worker to stop and wait for it to exit."""
        with self._lock:
            if not self._thread or not self._thread.is_alive():
                return
            self._stop_event.set()

        self._thread.join(timeout=timeout_sec)
        if self._thread.is_alive():
            logger.warning("[MacroSnapshotWorker] Thread did not stop within timeout")
        else:
            logger.info("[MacroSnapshotWorker] Stopped cleanly")

    # ------------------------------------------------------------------
    # Internal loop
    # ------------------------------------------------------------------

    def _run_loop(self) -> None:
        """Main worker loop: run immediately on start, then on each interval."""
        logger.info("[MacroSnapshotWorker] Loop started")

        # First run immediately so the cache is populated before any user request.
        self._refresh_snapshot()

        while not self._stop_event.is_set():
            try:
                # Wait for the configured interval (or until stop is signalled).
                stopped = self._stop_event.wait(self.interval_seconds)
                if stopped:
                    break
                self._refresh_snapshot()
            except Exception as exc:
                logger.error(
                    "[MacroSnapshotWorker] Loop error: %s", exc, exc_info=True
                )
                # Back off for 1 minute before retrying to avoid hammering
                # external APIs on repeated failures.
                self._stop_event.wait(60)

        logger.info("[MacroSnapshotWorker] Loop stopped")

    # ------------------------------------------------------------------
    # Snapshot refresh
    # ------------------------------------------------------------------

    def _refresh_snapshot(self) -> None:
        """Generate a fresh macro snapshot and persist it to cache."""
        t_start = time.monotonic()
        logger.info("[MacroSnapshotWorker] Snapshot refresh #%d starting...", self._refresh_count + 1)

        try:
            from app.services.macro_snapshot import (
                generate_macro_snapshot,
                write_macro_snapshot,
            )

            snapshot = generate_macro_snapshot()
            ok = write_macro_snapshot(snapshot)

            elapsed = round(time.monotonic() - t_start, 2)
            self._last_refresh_ts = time.time()
            self._refresh_count += 1

            if ok:
                logger.info(
                    "[MacroSnapshotWorker] Refresh #%d complete in %.1fs "
                    "(status=%s, ok=%s, failed=%s)",
                    self._refresh_count,
                    elapsed,
                    snapshot.get("status"),
                    snapshot.get("meta", {}).get("sources_ok", []),
                    snapshot.get("meta", {}).get("sources_failed", []),
                )
            else:
                logger.error(
                    "[MacroSnapshotWorker] Refresh #%d: snapshot generated but "
                    "cache write FAILED (elapsed=%.1fs)",
                    self._refresh_count,
                    elapsed,
                )

        except Exception as exc:
            elapsed = round(time.monotonic() - t_start, 2)
            logger.error(
                "[MacroSnapshotWorker] Refresh #%d FAILED after %.1fs: %s",
                self._refresh_count + 1,
                elapsed,
                exc,
                exc_info=True,
            )

    # ------------------------------------------------------------------
    # Manual trigger (for /refresh endpoint)
    # ------------------------------------------------------------------

    def force_refresh(self) -> None:
        """Trigger an immediate snapshot refresh outside the normal schedule."""
        logger.info("[MacroSnapshotWorker] Force refresh requested")
        self._refresh_snapshot()

    # ------------------------------------------------------------------
    # Status (for observability)
    # ------------------------------------------------------------------

    @property
    def last_refresh_ts(self) -> float:
        return self._last_refresh_ts

    @property
    def refresh_count(self) -> int:
        return self._refresh_count

    @property
    def is_running(self) -> bool:
        return bool(self._thread and self._thread.is_alive())


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------

_worker: Optional[MacroSnapshotWorker] = None
_worker_lock = threading.Lock()


def get_macro_snapshot_worker() -> MacroSnapshotWorker:
    """Return the process-wide MacroSnapshotWorker singleton."""
    global _worker
    with _worker_lock:
        if _worker is None:
            interval = int(os.getenv("MACRO_SNAPSHOT_INTERVAL_SEC", "900"))
            _worker = MacroSnapshotWorker(interval_seconds=interval)
        return _worker
