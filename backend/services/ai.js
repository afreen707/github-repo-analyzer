const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function analyzeRepo(commits, branches) {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Analyze this GitHub repository data and give a beginner-friendly summary.
      
      Recent commits: ${JSON.stringify(commits.slice(0, 20))}
      Branches: ${JSON.stringify(branches)}
      
      Please tell me:
      1. What this project seems to be doing
      2. Who contributed recently and what they changed
      3. Any patterns you notice in the commit history`
    }]
  });

  return message.content[0].text;
}

module.exports = { analyzeRepo };