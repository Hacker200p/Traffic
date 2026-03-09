"""Async HTTP client for pushing results to the Node.js backend."""

from __future__ import annotations

import asyncio
from typing import Any, Optional

import httpx
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.config.settings import get_settings
from app.utils.logger import logger
from app.utils.exceptions import BackendAPIError


class BackendClient:
    """Reusable async client that speaks to the Node.js traffic-control API."""

    def __init__(self) -> None:
        self._client: Optional[httpx.AsyncClient] = None
        self._base_url: str = ""
        self._api_key: str = ""
        self._timeout: int = 30

    # ── lifecycle ───────────────────────────────────────────

    async def init(self) -> None:
        settings = get_settings()
        self._base_url = settings.backend_api_url.rstrip("/")
        self._api_key = settings.backend_api_key
        self._timeout = settings.backend_timeout

        self._client = httpx.AsyncClient(
            base_url=self._base_url,
            timeout=httpx.Timeout(self._timeout),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}" if self._api_key else "",
                "X-Source": "ai-service",
            },
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
        logger.info(f"Backend client initialised → {self._base_url}")

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            logger.info("Backend client closed")

    # ── public helpers ──────────────────────────────────────
    # All paths hit the /integration/* routes which use API-key auth
    # instead of JWT, and accept the AI snake_case payload format.

    async def post_violation(self, payload: dict[str, Any]) -> dict:
        return await self._post("/integration/violations", payload)

    async def post_tracking(self, payload: dict[str, Any]) -> dict:
        return await self._post("/integration/tracking", payload)

    async def post_tracking_batch(self, payload: dict[str, Any]) -> dict:
        return await self._post("/integration/tracking/batch", payload)

    async def post_alert(self, payload: dict[str, Any]) -> dict:
        return await self._post("/integration/alerts", payload)

    async def post_signal_state(self, signal_id: str, payload: dict[str, Any]) -> dict:
        return await self._post(f"/integration/signals/{signal_id}/state", payload)

    async def get_signal(self, signal_id: str) -> dict:
        return await self._get(f"/signals/{signal_id}")

    # ── HTTP primitives with retry ──────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
        retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
        reraise=True,
    )
    async def _post(self, path: str, payload: dict[str, Any]) -> dict:
        if not self._client:
            raise BackendAPIError(path, reason="Client not initialised")

        try:
            resp = await self._client.post(path, json=payload)
            body = resp.json()

            if resp.status_code >= 400:
                error_msg = body.get("error", {}).get("message", resp.text)
                logger.warning(
                    f"Backend POST {path} → {resp.status_code}: {error_msg}",
                )
                raise BackendAPIError(path, resp.status_code, error_msg)

            logger.debug(f"Backend POST {path} → {resp.status_code}")
            return body

        except BackendAPIError:
            raise
        except httpx.HTTPError as exc:
            raise BackendAPIError(path, reason=str(exc)) from exc

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
        retry=retry_if_exception_type((httpx.TransportError, httpx.TimeoutException)),
        reraise=True,
    )
    async def _get(self, path: str) -> dict:
        if not self._client:
            raise BackendAPIError(path, reason="Client not initialised")

        try:
            resp = await self._client.get(path)
            body = resp.json()

            if resp.status_code >= 400:
                error_msg = body.get("error", {}).get("message", resp.text)
                raise BackendAPIError(path, resp.status_code, error_msg)

            return body

        except BackendAPIError:
            raise
        except httpx.HTTPError as exc:
            raise BackendAPIError(path, reason=str(exc)) from exc


# Module-level singleton
backend_client = BackendClient()
