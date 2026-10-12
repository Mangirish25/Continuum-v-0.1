import re
import httpx
from typing import List, Dict, Any, Optional, Tuple
from app.integrations.base import BaseConnector, NormalizedDocument
from app.core.config import settings
from app.core.logging import logger

class GitHubConnector(BaseConnector):
    def __init__(self, api_token: Optional[str] = None):
        self.api_token = api_token or settings.GITHUB_API_TOKEN
        self.headers = {"Accept": "application/vnd.github.v3+json"}
        if self.api_token:
            self.headers["Authorization"] = f"Bearer {self.api_token}"

    @staticmethod
    def parse_github_url(url: str) -> Tuple[str, str]:
        """Extract (owner, repo) from GitHub URL or owner/repo string."""
        url = url.strip().rstrip("/")
        match = re.search(r"github\.com/([^/]+)/([^/]+)", url)
        if match:
            owner, repo = match.group(1), match.group(2)
            if repo.endswith(".git"):
                repo = repo[:-4]
            return owner, repo
        parts = url.split("/")
        if len(parts) == 2:
            return parts[0], parts[1]
        raise ValueError(f"Invalid GitHub URL or repository format: {url}")

    async def validate_connection(self) -> bool:
        async with httpx.AsyncClient() as client:
            resp = await client.get("https://api.github.com/zen", headers=self.headers, timeout=10.0)
            return resp.status_code == 200

    async def list_resources(self) -> List[Dict[str, Any]]:
        # Public repos are dynamically added via URL
        return []

    async def fetch_repository_info(self, owner: str, repo: str) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            url = f"https://api.github.com/repos/{owner}/{repo}"
            resp = await client.get(url, headers=self.headers, timeout=15.0)
            if resp.status_code == 404:
                raise ValueError(f"Public GitHub repository '{owner}/{repo}' not found")
            if resp.status_code != 200:
                raise ValueError(f"GitHub API error ({resp.status_code}): {resp.text}")
            data = resp.json()
            if data.get("private", False):
                raise ValueError(f"Repository '{owner}/{repo}' is private. Only public repositories are supported in v0.1.")
            return data

    async def fetch_documents(
        self,
        external_resource_id: str, # owner/repo format or URL
        employee_id: Optional[str] = None,
        project_id: Optional[str] = None,
        **kwargs
    ) -> List[NormalizedDocument]:
        owner, repo = self.parse_github_url(external_resource_id)
        repo_info = await self.fetch_repository_info(owner, repo)

        documents: List[NormalizedDocument] = []
        source_base_url = repo_info.get("html_url", f"https://github.com/{owner}/{repo}")

        async with httpx.AsyncClient() as client:
            # 1. Fetch README document
            readme_url = f"https://api.github.com/repos/{owner}/{repo}/readme"
            readme_resp = await client.get(readme_url, headers={"Accept": "application/vnd.github.v3.raw", **(self.headers if self.api_token else {})}, timeout=15.0)
            if readme_resp.status_code == 200 and readme_resp.text.strip():
                documents.append(
                    NormalizedDocument(
                        external_id=f"github:{owner}/{repo}:readme",
                        title=f"{owner}/{repo} - README",
                        content=readme_resp.text,
                        provider="GITHUB",
                        source_url=f"{source_base_url}#readme",
                        employee_id=employee_id,
                        project_id=project_id,
                        doc_metadata={
                            "knowledge_type": "documentation",
                            "owner": owner,
                            "repo": repo,
                            "stars": repo_info.get("stargazers_count", 0),
                            "language": repo_info.get("language")
                        }
                    )
                )

            # 2. Fetch Repository Overview Summary & Tree
            summary_content = f"Repository: {owner}/{repo}\n"
            summary_content += f"Description: {repo_info.get('description', 'No description provided.')}\n"
            summary_content += f"Default Branch: {repo_info.get('default_branch', 'main')}\n"
            summary_content += f"Language: {repo_info.get('language', 'N/A')}\n\n"

            commits_url = f"https://api.github.com/repos/{owner}/{repo}/commits?per_page=15"
            commits_resp = await client.get(commits_url, headers=self.headers, timeout=15.0)
            if commits_resp.status_code == 200:
                summary_content += "Recent Commits & Authors:\n"
                for c in commits_resp.json()[:15]:
                    commit_msg = c.get("commit", {}).get("message", "").split("\n")[0]
                    author_name = c.get("commit", {}).get("author", {}).get("name", "Unknown")
                    author_email = c.get("commit", {}).get("author", {}).get("email", "")
                    summary_content += f"- {commit_msg} (by {author_name} <{author_email}>)\n"

            documents.append(
                NormalizedDocument(
                    external_id=f"github:{owner}/{repo}:overview",
                    title=f"{owner}/{repo} - Overview & Recent Activity",
                    content=summary_content,
                    provider="GITHUB",
                    source_url=source_base_url,
                    employee_id=employee_id,
                    project_id=project_id,
                    doc_metadata={
                        "knowledge_type": "code",
                        "owner": owner,
                        "repo": repo,
                    }
                )
            )

            # 3. Fetch Open Issues / PRs if available
            issues_url = f"https://api.github.com/repos/{owner}/{repo}/issues?state=all&per_page=15"
            issues_resp = await client.get(issues_url, headers=self.headers, timeout=15.0)
            if issues_resp.status_code == 200 and isinstance(issues_resp.json(), list):
                issues_data = issues_resp.json()
                if issues_data:
                    issues_content = f"Issues and Pull Requests for {owner}/{repo}:\n\n"
                    for issue in issues_data:
                        title = issue.get("title", "")
                        body = issue.get("body") or ""
                        user = issue.get("user", {}).get("login", "")
                        state = issue.get("state", "open")
                        html_url = issue.get("html_url", source_base_url)
                        issues_content += f"### #{issue.get('number')} {title} [{state}]\n"
                        issues_content += f"Author: {user}\nURL: {html_url}\n{body[:300]}\n\n"

                    documents.append(
                        NormalizedDocument(
                            external_id=f"github:{owner}/{repo}:issues",
                            title=f"{owner}/{repo} - Issues & PRs",
                            content=issues_content,
                            provider="GITHUB",
                            source_url=f"{source_base_url}/issues",
                            employee_id=employee_id,
                            project_id=project_id,
                            doc_metadata={
                                "knowledge_type": "issues",
                                "owner": owner,
                                "repo": repo
                            }
                        )
                    )

        logger.info(f"Fetched {len(documents)} normalized documents from GitHub repo {owner}/{repo}")
        return documents
