"""npm Registry API integration for download statistics."""

import asyncio
from datetime import datetime, timedelta
from typing import Any

import httpx

from src.domain.value_objects import FeedbackSource


class NpmIntegration:
    """npm Registry API integration for download stats."""

    def __init__(self):
        self.base_url = "https://api.npmjs.org"
        self.downloads_url = "https://api.npmjs.org/downloads"

    async def fetch_downloads(
        self,
        package: str,
        start: datetime,
        end: datetime,
    ) -> list[dict[str, Any]]:
        """
        Fetch download statistics for a package.

        CRITICAL: Splits date ranges to avoid missing data (TanStack Query lost 27%).

        Args:
            package: Package name
            start: Start date
            end: End date

        Returns:
            List of download statistics by day
        """
        # Split into 18-month chunks to avoid data loss
        ranges = self._split_date_range(start, end, months=18)

        # Fetch all ranges in parallel
        tasks = [
            self._fetch_range(package, range_start, range_end)
            for range_start, range_end in ranges
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Flatten results
        all_downloads = []
        for result in results:
            if isinstance(result, list):
                all_downloads.extend(result)

        return all_downloads

    async def _fetch_range(
        self, package: str, start: datetime, end: datetime
    ) -> list[dict[str, Any]]:
        """Fetch downloads for a specific date range."""
        start_str = start.strftime("%Y-%m-%d")
        end_str = end.strftime("%Y-%m-%d")

        url = f"{self.downloads_url}/range/{start_str}:{end_str}/{package}"

        max_retries = 3

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=30.0)

                    if response.status_code == 429:  # Rate limited
                        await asyncio.sleep(60)  # Wait 1 minute
                        continue

                    response.raise_for_status()
                    data = response.json()

                    downloads = data.get("downloads", [])

                    return [
                        {
                            "package": package,
                            "date": entry["day"],
                            "downloads": entry["downloads"],
                        }
                        for entry in downloads
                    ]

            except httpx.HTTPError:
                if attempt == max_retries - 1:
                    return []

                await asyncio.sleep(2 ** attempt)

        return []

    def _split_date_range(
        self, start: datetime, end: datetime, months: int
    ) -> list[tuple[datetime, datetime]]:
        """Split date range into chunks of specified months."""
        ranges = []
        current = start

        while current < end:
            # Calculate chunk end (months later or end date)
            chunk_end = min(
                current + timedelta(days=months * 30),  # Approximate months
                end,
            )

            ranges.append((current, chunk_end))
            current = chunk_end

        return ranges

    async def fetch_package_metadata(self, package: str) -> dict[str, Any]:
        """Fetch package metadata from npm registry."""
        url = f"https://registry.npmjs.org/{package}"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()
                return response.json()

        except httpx.HTTPError:
            return {}

    def transform_downloads_to_feedback(
        self,
        downloads: list[dict[str, Any]],
        threshold: int = 1000,
    ) -> list[dict[str, Any]]:
        """
        Transform download spikes/drops into feedback items.

        Args:
            downloads: List of download statistics
            threshold: Minimum change to generate feedback

        Returns:
            List of feedback items for significant changes
        """
        if len(downloads) < 2:
            return []

        feedback_items = []

        for i in range(1, len(downloads)):
            prev = downloads[i - 1]
            curr = downloads[i]

            change = curr["downloads"] - prev["downloads"]
            change_pct = (
                (change / prev["downloads"] * 100)
                if prev["downloads"] > 0
                else 0
            )

            # Significant spike or drop
            if abs(change) > threshold:
                if change > 0:
                    content = (
                        f"Download spike detected for {curr['package']}: "
                        f"+{change:,} downloads ({change_pct:.1f}% increase) "
                        f"on {curr['date']}"
                    )
                else:
                    content = (
                        f"Download drop detected for {curr['package']}: "
                        f"{change:,} downloads ({change_pct:.1f}% decrease) "
                        f"on {curr['date']}"
                    )

                feedback_items.append({
                    "content": content,
                    "source": FeedbackSource.NPM.value,
                    "user_id": "npm-analytics",
                    "metadata": {
                        "package": curr["package"],
                        "date": curr["date"],
                        "downloads": curr["downloads"],
                        "change": change,
                        "change_pct": change_pct,
                    },
                })

        return feedback_items
