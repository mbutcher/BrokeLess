# BudgetApp MCP Server

Exposes BudgetApp as a set of [Model Context Protocol](https://modelcontextprotocol.io/) tools so
an AI agent (Claude, etc.) can query and update your financial data through natural language.

## Available Tools

| Tool | Description | Required scope |
|------|-------------|----------------|
| `list_accounts` | List all accounts with balances | `accounts:read` |
| `get_net_worth` | Calculate net worth (assets − liabilities) | `accounts:read` |
| `list_transactions` | Search/filter transactions | `transactions:read` |
| `add_transaction` | Record a new transaction | `transactions:write` |
| `get_spending_by_category` | Category spending breakdown | `reports:read` |
| `get_budget_view` | Budget vs actual for a date range | `budget:read` |
| `get_pay_period` | Current pay period and days remaining | `budget:read` |
| `get_upcoming_expenses` | Upcoming scheduled bills | `budget:read` |
| `get_monthly_summary` | Monthly income/expense history | `reports:read` |
| `get_forecast` | Projected future income/expenses | `reports:read` |
| `trigger_simplefin_sync` | Trigger bank data import | `simplefin:write` |

## Prerequisites

- BudgetApp v0.2+ running and accessible
- An API key created in **Security Settings → API Keys** with appropriate scopes

## Create an API Key

1. Log in to BudgetApp
2. Go to **Settings → Security → API Keys**
3. Click **Create API Key**
4. Enter a label (e.g., "Claude MCP") and select the scopes you need
5. Copy the key — it is shown only once

For read-only access (queries, no sync): `accounts:read`, `transactions:read`, `budget:read`,
`reports:read`.

For full access including sync: add `simplefin:write` and/or `transactions:write`.

## Local stdio Setup

### Environment Variables

```bash
export BUDGET_APP_URL="http://localhost:3001/api/v1"   # or your production URL
export BUDGET_APP_API_KEY="your-api-key-here"
```

### Build

```bash
cd mcp
npm install
npm run build
```

### Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "budget-app": {
      "command": "node",
      "args": ["/path/to/BudgetApp/mcp/dist/index.js"],
      "env": {
        "BUDGET_APP_URL": "https://budget.yourdomain.com/api/v1",
        "BUDGET_APP_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### Claude Code (CLI)

```bash
claude mcp add budget-app \
  -e BUDGET_APP_URL=https://budget.yourdomain.com/api/v1 \
  -e BUDGET_APP_API_KEY=your-api-key-here \
  -- node /path/to/BudgetApp/mcp/dist/index.js
```

## Docker

Build the image after compiling:

```bash
cd mcp
npm run build
docker build -t budget-app-mcp .
```

Run it:

```bash
docker run --rm -i \
  -e BUDGET_APP_URL=http://budget_backend:3001/api/v1 \
  -e BUDGET_APP_API_KEY=your-api-key-here \
  budget-app-mcp
```

## Example Prompts

Once connected, you can ask Claude:

- "What's my net worth?"
- "Show me my last 20 transactions"
- "How much did I spend on groceries last month?"
- "What bills are due this week?"
- "How does my spending compare to my budget this month?"
- "Sync my bank accounts"
- "Add a $45 expense at Target today to my checking account"
