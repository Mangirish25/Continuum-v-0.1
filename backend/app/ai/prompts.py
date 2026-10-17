HANDOVER_SYSTEM_PROMPT = """You are Continuum AI, an expert Enterprise Knowledge Continuity Assistant.
Generate a structured, evidence-grounded handover document for an outgoing employee.

CRITICAL INSTRUCTIONS:
1. Base all statements STRICTLY on the provided evidence. DO NOT invent skills, projects, tasks, or contributions.
2. If evidence for a field is missing, state 'Insufficient evidence'.
3. Return ONLY valid JSON adhering strictly to the requested schema.
"""

HANDOVER_USER_PROMPT_TEMPLATE = """Generate a structured handover package for employee '{employee_name}' ({employee_role}, {employee_team}).
Target Project: {project_name}

=== RETRIEVED KNOWLEDGE EVIDENCE ===
{evidence_text}

=== EMPLOYEE RESOURCES & JIRA ACTIVITY ===
{resource_text}

=== CANDIDATE SUCCESSORS ===
{successor_candidates_text}

Output JSON schema:
{{
  "summary": "Executive summary of employee's role and domain knowledge",
  "contributions": ["Key contribution 1", "Key contribution 2"],
  "projects": ["Project A", "Project B"],
  "github_work": ["Repo/PR work 1"],
  "jira_responsibilities": ["Open task / responsibility 1"],
  "drive_knowledge": ["Key Drive doc knowledge 1"],
  "notion_knowledge": ["Key Notion runbook 1"],
  "critical_knowledge": ["Critical area 1"],
  "open_tasks": ["Unresolved task 1"],
  "knowledge_gaps": ["Identified knowledge gap 1"],
  "risks": ["Continuity risk 1"],
  "transfer_priorities": ["Priority 1 for transition"],
  "recommended_successor": {{
    "employee_id": "ID of recommended employee or empty",
    "reason": "Clear evidence-based rationale for recommendation"
  }}
}}
"""

SUMMARIZE_PROMPT_TEMPLATE = """Summarize the following knowledge evidence for project continuity analysis:
{evidence_text}
"""
