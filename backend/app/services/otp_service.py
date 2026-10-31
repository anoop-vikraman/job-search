import secrets
import time

# In-memory OTP + attempt store. For production, back this with Redis so it
# survives restarts and works across multiple workers. The interface stays the same.

_OTP_TTL_SECONDS = 300
# key -> (code, expires_at)
_codes: dict[str, tuple[str, float]] = {}
# key -> list[timestamp] of recent attempts (sliding window)
_attempts: dict[str, list[float]] = {}


def _key(country_code: str, phone: str, request_type: str) -> str:
    return f"{country_code}:{phone}:{request_type}"


def generate(country_code: str, phone: str, request_type: str) -> str:
    """Create and store a 6-digit OTP, returning it (to be sent via SMS)."""
    code = f"{secrets.randbelow(1_000_000):06d}"
    _codes[_key(country_code, phone, request_type)] = (code, time.time() + _OTP_TTL_SECONDS)
    return code


def verify(country_code: str, phone: str, request_type: str, code: str) -> bool:
    key = _key(country_code, phone, request_type)
    entry = _codes.get(key)
    if entry is None:
        return False
    stored, expires_at = entry
    if time.time() > expires_at:
        _codes.pop(key, None)
        return False
    if secrets.compare_digest(stored, code):
        _codes.pop(key, None)
        return True
    return False


def rate_limited(key: str, max_attempts: int, window_seconds: int) -> bool:
    """Record an attempt for `key`; return True if the window limit is exceeded."""
    now = time.time()
    window = [t for t in _attempts.get(key, []) if now - t < window_seconds]
    window.append(now)
    _attempts[key] = window
    return len(window) > max_attempts
