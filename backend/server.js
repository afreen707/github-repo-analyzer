const express = require("express");
const cors = require("cors");
const axios = require("axios");
const Groq = require("groq-sdk");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ─── Clients ───────────────────────────────────────────────────────────────

// Initialize Groq instead of Gemini / Claude
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const AI_MODEL = "llama-3.3-70b-versatile";

const github = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

// ─── Helper: Parse GitHub URL ──────────────────────────────────────────────

function parseGithubUrl(url) {
  try {
    const clean = url.replace("https://github.com/", "").split("/");
    if (clean.length < 2) throw new Error("Invalid URL");
    return { owner: clean[0], repo: clean[1] };
  } catch {
    return null;
  }
}

// ─── Helper: Fetch All Repo Data ───────────────────────────────────────────

async function fetchRepoData(owner, repo) {
  const [repoInfo, commits, branches, contributors, pullRequests] =
    await Promise.all([
      github.get(`/repos/${owner}/${repo}`),
      github.get(`/repos/${owner}/${repo}/commits?per_page=30`),
      github.get(`/repos/${owner}/${repo}/branches`),
      github.get(`/repos/${owner}/${repo}/contributors?per_page=10`),
      github.get(`/repos/${owner}/${repo}/pulls?state=open&per_page=10`),
    ]);

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const recentCommits = commits.data.filter(
    (c) => new Date(c.commit.author.date) > threeDaysAgo
  );

  return {
    repoInfo: repoInfo.data,
    commits: commits.data,
    recentCommits,
    branches: branches.data,
    contributors: contributors.data,
    pullRequests: pullRequests.data,
  };
}

// ─── Helper: Build AI Prompt ───────────────────────────────────────────────

function buildAnalysisPrompt(owner, repo, data) {
  const { repoInfo, commits, recentCommits, branches, contributors, pullRequests } = data;

  return `You are an expert code analyst. Analyze this GitHub repository and provide structured insights.

REPOSITORY: ${owner}/${repo}
Description: ${repoInfo.description || "No description"}
Language: ${repoInfo.language}
Stars: ${repoInfo.stargazers_count} | Forks: ${repoInfo.forks_count}
Open Issues: ${repoInfo.open_issues_count}

RECENT COMMITS (last 3 days):
${recentCommits.length === 0
    ? "No commits in the last 3 days."
    : recentCommits
        .map((c) => `- ${c.commit.author.name} (${c.commit.author.date.slice(0, 10)}): ${c.commit.message.split("\n")[0]}`)
        .join("\n")}

ALL RECENT COMMITS (last 10):
${commits
    .slice(0, 10)
    .map((c) => `- [${c.sha.slice(0, 7)}] ${c.commit.author.name}: ${c.commit.message.split("\n")[0]}`)
    .join("\n")}

BRANCHES (${branches.length} total):
${branches.map((b) => `- ${b.name}`).join("\n")}

TOP CONTRIBUTORS:
${contributors
    .slice(0, 5)
    .map((c) => `- ${c.login}: ${c.contributions} contributions`)
    .join("\n")}

OPEN PULL REQUESTS (${pullRequests.length}):
${pullRequests.length === 0
    ? "No open PRs."
    : pullRequests
        .map((pr) => `- #${pr.number} "${pr.title}" by ${pr.user.login} -> merging into ${pr.base.ref}`)
        .join("\n")}

Respond in this EXACT JSON format (do not output any markdown blocks or backticks, just raw JSON):
{
  "summary": "2-3 sentence plain English explanation of what this project does",
  "recentActivity": "Who committed in the last 3 days and what they changed",
  "branchOverview": "Description of the branch structure and what each key branch is for",
  "topContributors": "Who the main contributors are and what areas they likely own",
  "mergeConflictRisk": "Based on open PRs and branch names, assess merge conflict risk",
  "codebaseExplain": "Explain this codebase simply for a new developer joining the team",
  "healthScore": "A score from 1-10 with one line of reasoning"
}`;
}

// ─── ROUTE: Debug (tests env + GitHub + Groq) ─────────────────────────────

app.post("/debug", async (req, res) => {
  const result = {
    githubToken: process.env.GITHUB_TOKEN ? "loaded" : "MISSING",
    groqKey: process.env.GROQ_API_KEY ? "loaded" : "MISSING",
    githubWorking: false,
    groqWorking: false,
    groqError: null,
    githubError: null,
  };

  // Test GitHub
  try {
    const test = await github.get("/repos/expressjs/express");
    result.githubWorking = true;
    result.repoFound = test.data.full_name;
  } catch (err) {
    result.githubError = err.message;
    result.githubStatus = err.response?.status;
    result.githubDetails = err.response?.data;
  }

  // Test Groq Connection
  try {
    const test = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: "say hi" }],
      max_tokens: 10,
    });
    result.groqWorking = true;
    result.groqReply = test.choices[0].message.content.trim();
  } catch (err) {
    result.groqError = err.message;
    result.groqStatus = err.status;
  }

  res.json(result);
});

// ─── ROUTE: Analyze Repository ────────────────────────────────────────────

app.post("/analyze", async (req, res) => {
  const { url } = req.body;

  if (!url) return res.status(400).json({ error: "GitHub URL is required" });

  const parsed = parseGithubUrl(url);
  if (!parsed) return res.status(400).json({ error: "Invalid GitHub URL format" });

  const { owner, repo } = parsed;

  try {
    const data = await fetchRepoData(owner, repo);
    const prompt = buildAnalysisPrompt(owner, repo, data);

    const aiResponse = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" } // Force strict raw JSON object output
    });

    const rawText = aiResponse.choices[0].message.content.trim();

    let insights;
    try {
      insights = JSON.parse(rawText);
    } catch {
      insights = { summary: rawText };
    }

    return res.json({
      owner,
      repo,
      repoInfo: {
        description: data.repoInfo.description,
        language: data.repoInfo.language,
        stars: data.repoInfo.stargazers_count,
        forks: data.repoInfo.forks_count,
        openIssues: data.repoInfo.open_issues_count,
        createdAt: data.repoInfo.created_at,
        updatedAt: data.repoInfo.updated_at,
      },
      recentCommits: data.recentCommits.map((c) => ({
        sha: c.sha.slice(0, 7),
        author: c.commit.author.name,
        message: c.commit.message.split("\n")[0],
        date: c.commit.author.date,
      })),
      branches: data.branches.map((b) => b.name),
      contributors: data.contributors.slice(0, 5).map((c) => ({
        username: c.login,
        contributions: c.contributions,
        avatar: c.avatar_url,
      })),
      openPRs: data.pullRequests.map((pr) => ({
        number: pr.number,
        title: pr.title,
        author: pr.user.login,
        baseBranch: pr.base.ref,
        headBranch: pr.head.ref,
        url: pr.html_url,
      })),
      insights,
    });
  } catch (err) {
    console.error("=== ANALYZE ERROR ===");
    console.error("Message:", err.message);
    console.error("Status:", err.response?.status);
    console.error("Details:", JSON.stringify(err.response?.data));
    console.error("Stack:", err.stack);

    if (err.response?.status === 404)
      return res.status(404).json({ error: "Repository not found. Check the URL." });
    if (err.response?.status === 403)
      return res.status(403).json({ error: "GitHub API rate limit hit. Check your token." });

    return res.status(500).json({ error: "Failed to analyze repository.", detail: err.message });
  }
});

// ─── ROUTE: Q&A ───────────────────────────────────────────────────────────

app.post("/ask", async (req, res) => {
  const { url, question, conversationHistory = [] } = req.body;

  if (!url || !question)
    return res.status(400).json({ error: "URL and question are required" });

  const parsed = parseGithubUrl(url);
  if (!parsed) return res.status(400).json({ error: "Invalid GitHub URL" });

  const { owner, repo } = parsed;

  try {
    const data = await fetchRepoData(owner, repo);

    const systemPrompt = `You are an expert code analyst for the GitHub repository ${owner}/${repo}.

Repository context:
- Description: ${data.repoInfo.description || "None"}
- Language: ${data.repoInfo.language}
- Branches: ${data.branches.map((b) => b.name).join(", ")}
- Top contributors: ${data.contributors.slice(0, 5).map((c) => `${c.login} (${c.contributions} commits)`).join(", ")}
- Recent commits: ${data.commits.slice(0, 10).map((c) => `${c.commit.author.name}: ${c.commit.message.split("\n")[0]}`).join(" | ")}
- Open PRs: ${data.pullRequests.map((pr) => `#${pr.number} ${pr.title}`).join(", ") || "None"}

Answer clearly and concisely. If you cannot determine something from the available data, say so honestly.`;

    const systemMessage = { role: "system", content: systemPrompt };
    const formattedHistory = conversationHistory.map(m => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content
    }));

    const messages = [
      systemMessage,
      ...formattedHistory,
      { role: "user", content: question }
    ];

    const aiResponse = await groq.chat.completions.create({
      model: AI_MODEL,
      messages: messages,
    });
    
    const answer = aiResponse.choices[0].message.content.trim();

    return res.json({
      question,
      answer,
      updatedHistory: [
        ...conversationHistory,
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ],
    });
  } catch (err) {
    console.error("Q&A error:", err.message);
    return res.status(500).json({ error: "Failed to answer question." });
  }
});

// ─── ROUTE: Health Check ──────────────────────────────────────────────────

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "GitHub Analyzer API is running" });
});

// ─── Start Server ─────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.get("/test", (req, res) => {
  res.send("Test route works");
});
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});