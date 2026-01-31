"""GitHub API integration using GraphQL."""

import asyncio
import hmac
import hashlib
from datetime import datetime
from typing import Any, Optional

import httpx

from src.domain.value_objects import FeedbackSource


class GitHubIntegration:
    """GitHub GraphQL API integration for issues and discussions."""

    def __init__(self, token: str, owner: str = "ruvnet"):
        """Initialize GitHub integration."""
        self.token = token
        self.owner = owner
        self.base_url = "https://api.github.com/graphql"
        self.headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    async def fetch_issues(
        self,
        repo: str,
        labels: list[str] = ["alpha-feedback", "user-feedback"],
        cursor: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Fetch issues from GitHub repository.

        Args:
            repo: Repository name
            labels: Filter by labels
            cursor: Pagination cursor

        Returns:
            Dictionary with issues and pagination info
        """
        query = """
        query($owner: String!, $repo: String!, $cursor: String, $labels: [String!]) {
            repository(owner: $owner, name: $repo) {
                issues(
                    first: 100,
                    after: $cursor,
                    labels: $labels,
                    orderBy: { field: CREATED_AT, direction: DESC }
                ) {
                    nodes {
                        id
                        number
                        title
                        body
                        createdAt
                        updatedAt
                        state
                        author { login }
                        labels(first: 10) {
                            nodes { name }
                        }
                        comments(first: 5) {
                            totalCount
                            nodes {
                                body
                                author { login }
                                createdAt
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
        """

        variables = {
            "owner": self.owner,
            "repo": repo,
            "cursor": cursor,
            "labels": labels,
        }

        return await self._execute_query(query, variables)

    async def fetch_discussions(
        self, repo: str, cursor: Optional[str] = None
    ) -> dict[str, Any]:
        """Fetch discussions from GitHub repository."""
        query = """
        query($owner: String!, $repo: String!, $cursor: String) {
            repository(owner: $owner, name: $repo) {
                discussions(
                    first: 50,
                    after: $cursor,
                    orderBy: { field: CREATED_AT, direction: DESC }
                ) {
                    nodes {
                        id
                        title
                        body
                        createdAt
                        category { name }
                        author { login }
                        comments(first: 10) {
                            totalCount
                            nodes {
                                body
                                author { login }
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        endCursor
                    }
                }
            }
        }
        """

        variables = {
            "owner": self.owner,
            "repo": repo,
            "cursor": cursor,
        }

        return await self._execute_query(query, variables)

    async def _execute_query(
        self, query: str, variables: dict[str, Any]
    ) -> dict[str, Any]:
        """Execute GraphQL query with retry logic."""
        max_retries = 3

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        self.base_url,
                        json={"query": query, "variables": variables},
                        headers=self.headers,
                        timeout=30.0,
                    )

                    if response.status_code == 429:  # Rate limited
                        retry_after = int(response.headers.get("Retry-After", 60))
                        await asyncio.sleep(retry_after)
                        continue

                    response.raise_for_status()
                    return response.json()

            except httpx.HTTPError as e:
                if attempt == max_retries - 1:
                    raise

                # Exponential backoff
                await asyncio.sleep(2 ** attempt)

        return {}

    def transform_issue(self, issue: dict[str, Any]) -> dict[str, Any]:
        """Transform GitHub issue to feedback format."""
        content = f"{issue['title']}\n\n{issue['body'] or ''}"

        # Include comments
        comments = issue.get("comments", {}).get("nodes", [])
        if comments:
            content += "\n\n--- Comments ---\n"
            for comment in comments:
                content += f"\n{comment['body']}\n"

        return {
            "content": content,
            "source": FeedbackSource.GITHUB.value,
            "user_id": issue["author"]["login"] if issue.get("author") else "anonymous",
            "metadata": {
                "github_id": issue["id"],
                "github_number": issue["number"],
                "github_url": f"https://github.com/{self.owner}/issues/{issue['number']}",
                "created_at": issue["createdAt"],
                "state": issue["state"],
                "labels": [label["name"] for label in issue.get("labels", {}).get("nodes", [])],
            },
        }

    def verify_webhook_signature(
        self, payload: bytes, signature: str, secret: str
    ) -> bool:
        """
        Verify GitHub webhook signature using HMAC.

        Args:
            payload: Request body bytes
            signature: X-Hub-Signature-256 header value
            secret: Webhook secret

        Returns:
            True if signature is valid
        """
        if not signature.startswith("sha256="):
            return False

        expected_signature = (
            "sha256="
            + hmac.new(
                secret.encode(), payload, hashlib.sha256
            ).hexdigest()
        )

        return hmac.compare_digest(signature, expected_signature)
