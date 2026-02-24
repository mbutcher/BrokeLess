/**
 * SimpleFIN Bridge API response types.
 * https://www.simplefin.org/protocol.html
 */

export interface SimplefinOrg {
  /** Friendly bank/institution name */
  name: string;
  url?: string;
}

export interface SimplefinTransaction {
  /** SimpleFIN's unique transaction identifier */
  id: string;
  /** Unix timestamp (seconds) when the transaction posted */
  posted: number;
  /** Amount as a string — positive = credit, negative = debit */
  amount: string;
  /** Raw payee/description string from the bank */
  description: string;
  pending: boolean;
}

export interface SimplefinAccount {
  /** SimpleFIN's unique account identifier */
  id: string;
  org: SimplefinOrg;
  name: string;
  currency: string; // e.g. 'USD'
  /** Current balance as a string */
  balance: string;
  'available-balance': string;
  /** Unix timestamp (seconds) when balance was last updated */
  'balance-date': number;
  /** Optional account type string returned by some SimpleFIN providers */
  'account-type'?: string;
  transactions: SimplefinTransaction[];
}

export interface SimplefinApiResponse {
  accounts: SimplefinAccount[];
}
