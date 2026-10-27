"""Atomic shared Redis attempt ledger for opted-in paid Foundry inference.

Conservative fixed UTC hour/day windows; never refunds consumed attempts.
Redis EVAL executes a single atomic reservation across replicas. A missing
configuration, connection error or script error fails closed, not open.
"""
import os
from datetime import datetime, timezone

# Both keys use the same hash tag so this script works on Redis Cluster.
LUA_RESERVE = """
local hour = tonumber(redis.call('GET', KEYS[1]) or '0')
local day = tonumber(redis.call('GET', KEYS[2]) or '0')
if hour >= tonumber(ARGV[1]) then return 1 end
if day >= tonumber(ARGV[2]) then return 2 end
redis.call('INCR', KEYS[1])
redis.call('EXPIREAT', KEYS[1], tonumber(ARGV[3]))
redis.call('INCR', KEYS[2])
redis.call('EXPIREAT', KEYS[2], tonumber(ARGV[4]))
return 0
"""


class SharedAttemptLedger:
    def __init__(self, client, *, prefix="matchwork:foundry"):
        self.client = client
        self.prefix = prefix

    def reserve(self, hourly_limit: int, daily_limit: int) -> str | None:
        try:
            # Server time avoids client clock drift among replicas.
            seconds, _microseconds = self.client.time()
            timestamp = int(seconds)
            hour_start = timestamp - timestamp % 3600
            day_start = timestamp - timestamp % 86400
            tag = "{foundry}"
            keys = [
                f"{self.prefix}:{tag}:hour:{hour_start}",
                f"{self.prefix}:{tag}:day:{day_start}",
            ]
            code = int(self.client.eval(
                LUA_RESERVE, 2, *keys,
                hourly_limit, daily_limit, hour_start + 3600,
                day_start + 86400,
            ))
            return {0: None, 1: "ai_hourly_limited", 2: "ai_daily_limited"}.get(
                code, "ai_budget_unavailable"
            )
        except Exception:
            return "ai_budget_unavailable"


def from_environment() -> SharedAttemptLedger | None:
    if os.getenv("MATCHWORK_SHARED_BUDGET_ENABLED", "false").lower() not in ("1", "true"):
        return None
    url = os.getenv("MATCHWORK_REDIS_URL", "")
    # Never accept unencrypted Redis credentials over the network.
    if not url.startswith("rediss://"):
        return SharedAttemptLedgerUnavailable()
    try:
        import redis
        return SharedAttemptLedger(redis.from_url(
            url, socket_connect_timeout=2, socket_timeout=2,
            health_check_interval=30,
        ))
    except Exception:
        return SharedAttemptLedgerUnavailable()


class SharedAttemptLedgerUnavailable:
    def reserve(self, hourly_limit: int, daily_limit: int) -> str:
        return "ai_budget_unavailable"
