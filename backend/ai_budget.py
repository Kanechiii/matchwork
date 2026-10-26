"""Best-effort, per-process safeguards for public Matchwork Foundry demos.

This is not a durable spending cap: cold starts, process restarts, and additional
replicas each receive new counters. Pair it with conservative Azure model quotas
and Azure cost alerts; disable Foundry entirely when credits must be preserved.
"""

from collections import deque
from datetime import datetime, timezone
import os
from threading import Lock
from time import monotonic
from typing import Callable


class FoundryBudget:
    """Atomically bound the number of paid Foundry attempts per Python process."""

    def __init__(
        self,
        *,
        enabled: bool = True,
        hourly_limit: int = 20,
        daily_limit: int = 50,
        concurrent_limit: int = 1,
        clock: Callable[[], float] = monotonic,
        utcnow: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ) -> None:
        self.enabled = enabled
        self.hourly_limit = max(0, hourly_limit)
        self.daily_limit = max(0, daily_limit)
        self.concurrent_limit = max(0, concurrent_limit)
        self._clock = clock
        self._utcnow = utcnow
        self._lock = Lock()
        self._last_hour = deque()
        self._day = None
        self._day_attempts = 0
        self._active = 0

    @classmethod
    def from_environment(cls) -> "FoundryBudget":
        def limit(name: str, default: int) -> int:
            try:
                return max(0, int(os.getenv(name, str(default))))
            except ValueError:
                # A malformed limit disables paid calls rather than opening it up.
                return 0

        return cls(
            enabled=os.getenv("MATCHWORK_AI_ENABLED", "true").strip().lower()
            in {"true", "1", "yes", "on"},
            hourly_limit=limit("MATCHWORK_AI_MAX_CALLS_PER_HOUR", 20),
            daily_limit=limit("MATCHWORK_AI_MAX_CALLS_PER_DAY", 50),
            concurrent_limit=1,
        )

    def acquire(self) -> str | None:
        """Reserve one attempt or return a status describing the fallback reason."""
        with self._lock:
            if not self.enabled:
                return "ai_disabled"

            now = self._clock()
            current_day = self._utcnow().date()
            if self._day != current_day:
                self._day = current_day
                self._day_attempts = 0

            while self._last_hour and now - self._last_hour[0] >= 3600:
                self._last_hour.popleft()

            if self._active >= self.concurrent_limit:
                return "ai_busy"
            if len(self._last_hour) >= self.hourly_limit:
                return "ai_hourly_limited"
            if self._day_attempts >= self.daily_limit:
                return "ai_daily_limited"

            # Count attempts, even if Foundry returns an error, to avoid retries
            # consuming unbounded traffic during an outage.
            self._last_hour.append(now)
            self._day_attempts += 1
            self._active += 1
            return None

    def release(self) -> None:
        with self._lock:
            if self._active:
                self._active -= 1


foundry_budget = FoundryBudget.from_environment()
