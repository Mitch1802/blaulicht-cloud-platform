from typing import Any


def _build_message(source: str, event: str, **context: Any) -> str:
    context_parts = [f"{key}={value}" for key, value in context.items()]
    base = f"source={source} event={event}"
    return f"{base} {' '.join(context_parts)}" if context_parts else base


def log_event(logger, source: str, event: str, level: str = "info", **context: Any) -> None:
    message = _build_message(source, event, **context)
    log_func = getattr(logger, level, logger.info)
    log_func(message)


def log_exception(logger, source: str, event: str, **context: Any) -> None:
    message = _build_message(source, event, **context)
    logger.exception(message)
