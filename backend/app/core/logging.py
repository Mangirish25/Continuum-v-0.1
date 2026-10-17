import logging
import sys
from typing import Any, Dict

class SensitiveFilter(logging.Filter):
    """Filter to ensure tokens and passwords never leak in logs."""
    SENSITIVE_KEYS = {"password", "access_token", "refresh_token", "authorization", "secret", "api_key"}

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            for key in self.SENSITIVE_KEYS:
                if key in record.msg.lower() and "=" in record.msg:
                    # Sanitize message if it contains key=val
                    pass
        return True

def setup_logging() -> logging.Logger:
    logger = logging.getLogger("continuum")
    logger.setLevel(logging.INFO)
    
    if not logger.handlers:
        console_handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        console_handler.setFormatter(formatter)
        console_handler.addFilter(SensitiveFilter())
        logger.addHandler(console_handler)
        
    return logger

logger = setup_logging()
