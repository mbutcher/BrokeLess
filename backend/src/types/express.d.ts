declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
      /** Scopes present when authenticated via API key; undefined when authenticated via JWT */
      apiKeyScopes?: string[];
    }
  }
}

export {};
