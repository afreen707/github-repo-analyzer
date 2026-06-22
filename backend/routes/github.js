const axios = require("axios");

const githubClient = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
  },
});

// Fetch commits from a repository
async function getCommits(owner, repo) {
  const response = await githubClient.get(
    `/repos/${owner}/${repo}/commits`
  );

  return response.data;
}

// Extract owner and repo from GitHub URL
function parseGithubUrl(url) {
  const parts = url
    .replace("https://github.com/", "")
    .split("/");

  return {
    owner: parts[0],
    repo: parts[1],
  };
}

module.exports = {
  getCommits,
  parseGithubUrl,
};