import axios from 'axios';
import { AppError } from '@middleware/errorHandler';
import type { SimplefinApiResponse } from '@typings/simplefin.types';

class SimplefinApiClient {
  /**
   * Exchanges a one-time SimpleFIN Setup Token for a permanent Access URL.
   *
   * The Setup Token is a base64-encoded claim URL. The app decodes it and
   * POSTs to that URL once — the response body is the Access URL with
   * embedded Basic Auth credentials (scheme://user:pass@host/path).
   *
   * Throws AppError if the token is already claimed (403) or otherwise invalid.
   */
  async claimToken(setupToken: string): Promise<string> {
    let claimUrl: string;
    try {
      // Strip all whitespace (handles multi-line pastes) and normalize base64url → base64
      const normalized = setupToken.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
      claimUrl = Buffer.from(normalized, 'base64').toString('utf8').trim();
      // Validate that decoding produced a URL (not garbage)
      new URL(claimUrl);
    } catch {
      throw new AppError('Invalid SimpleFIN setup token — it must be the base64-encoded token from SimpleFIN Bridge', 400);
    }

    try {
      const response = await axios.post<string>(claimUrl, null, {
        headers: { 'Content-Length': '0' },
        timeout: 30000,
        responseType: 'text',
      });
      const accessUrl = typeof response.data === 'string' ? response.data.trim() : '';
      if (!accessUrl) {
        throw new AppError('SimpleFIN returned an empty access URL', 502);
      }
      // Validate the returned value is a URL before storing it
      new URL(accessUrl);
      return accessUrl;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 403) {
          throw new AppError('This SimpleFIN setup token has already been used — generate a new one from SimpleFIN Bridge', 409);
        }
        throw new AppError(
          `Failed to claim SimpleFIN token: ${err.response?.status ?? err.message}`,
          502
        );
      }
      throw err;
    }
  }

  /**
   * Fetches accounts and transactions from the SimpleFIN Bridge API.
   *
   * The SimpleFIN access URL is itself the endpoint — credentials are embedded.
   * Optionally filter to transactions posted on or after `startDate`.
   */
  async fetchAccounts(accessUrl: string, startDate?: Date): Promise<SimplefinApiResponse> {
    // The access URL is a base path — accounts are always at <access_url>/accounts
    const base = accessUrl.replace(/\/+$/, '');
    const url = new URL(base.endsWith('/accounts') ? base : `${base}/accounts`);

    if (startDate) {
      // SimpleFIN uses Unix timestamp in seconds for the start-date query param
      url.searchParams.set('start-date', String(Math.floor(startDate.getTime() / 1000)));
    }

    try {
      const response = await axios.get<SimplefinApiResponse>(url.toString(), {
        timeout: 30000, // 30s — bank connections can be slow
        headers: { Accept: 'application/json' },
      });
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          throw new AppError('SimpleFIN credentials are invalid or expired', 401);
        }
        if (err.response?.status === 404) {
          throw new AppError('SimpleFIN access URL not found — it may have been revoked', 404);
        }
        if (err.code === 'ECONNABORTED') {
          throw new AppError('SimpleFIN request timed out — the service may be unavailable', 503);
        }
        throw new AppError(
          `SimpleFIN sync failed: ${err.response?.status ?? err.message}`,
          502
        );
      }
      throw err;
    }
  }
}

export const simplefinApiClient = new SimplefinApiClient();
