import { KaggleCredentials, Competition, Resource } from '../types';

const KAGGLE_API_BASE = '/api/kaggle';

// --- Error Types ---

export class KaggleError extends Error {
  code: 'NO_CREDS' | 'AUTH_FAILED' | 'NETWORK' | 'CORS' | 'UNKNOWN';

  constructor(code: KaggleError['code'], message: string) {
    super(message);
    this.name = 'KaggleError';
    this.code = code;
  }
}

// --- Auth Helpers ---

const buildAuthHeader = (creds: KaggleCredentials): string => {
  const token = btoa(`${creds.username}:${creds.key}`);
  return `Basic ${token}`;
};

const kaggleFetch = async <T>(
  endpoint: string,
  creds: KaggleCredentials | null,
  params?: Record<string, string>
): Promise<T> => {
  if (!creds) {
    throw new KaggleError('NO_CREDS', 'Kaggle credentials not configured. Add them in Settings.');
  }

  const url = new URL(`${KAGGLE_API_BASE}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: buildAuthHeader(creds),
        Accept: 'application/json',
      },
    });

    if (response.status === 401 || response.status === 403) {
      throw new KaggleError('AUTH_FAILED', 'Kaggle authentication failed. Check your username and API key.');
    }

    if (!response.ok) {
      let errorMsg = `Kaggle API error: ${response.status} ${response.statusText}`;
      try {
          const errorData = await response.json();
          if (errorData.error) errorMsg = errorData.error;
      } catch (e) { /* ignore parse error */ }
      
      throw new KaggleError('UNKNOWN', errorMsg);
    }

    return response.json();
  } catch (error: any) {
    // Check for CORS or network errors
    if (error instanceof KaggleError) {
      throw error;
    }

    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new KaggleError(
        'CORS',
        'Unable to reach Kaggle API (likely CORS restriction). Browser-based access may be limited.'
      );
    }

    throw new KaggleError('NETWORK', `Network error: ${error.message}`);
  }
};

// --- API Response Types (partial, defensive) ---

interface KaggleCompetitionResponse {
  ref?: string;
  title?: string;
  description?: string;
  url?: string;
  deadline?: string;
  category?: string;
  reward?: string;
  teamCount?: number;
  userHasEntered?: boolean;
  enabledDate?: string;
}

interface KaggleDatasetResponse {
  ref?: string;
  title?: string;
  subtitle?: string;
  url?: string;
  totalBytes?: number;
  usabilityRating?: number;
  lastUpdated?: string;
  downloadCount?: number;
  voteCount?: number;
}

// --- Mapping Helpers ---

const mapCompetition = (raw: KaggleCompetitionResponse): Competition => {
  const tags: string[] = [];
  if (raw.category) tags.push(raw.category);
  if (raw.reward) tags.push(raw.reward);
  if (raw.teamCount) tags.push(`${raw.teamCount} teams`);

  let lastActive = 'Unknown';
  if (raw.deadline) {
    const deadline = new Date(raw.deadline);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    if (diff > 0) {
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      lastActive = days > 30 ? `${Math.floor(days / 30)} months left` : `${days} days left`;
    } else {
      lastActive = 'Ended';
    }
  }

  // Construct a robust URL if the API one is missing or relative
  const url = raw.url 
    ? (raw.url.startsWith('http') ? raw.url : `https://www.kaggle.com${raw.url}`)
    : (raw.ref ? `https://www.kaggle.com/c/${raw.ref}` : undefined);

  return {
    id: raw.ref || `kaggle-${Date.now()}`,
    name: raw.title || 'Untitled Competition',
    description: raw.description || '',
    url,
    tags,
    lastActive,
    status: lastActive === 'Ended' ? 'archived' : 'active',
  };
};

const mapDataset = (raw: KaggleDatasetResponse, index: number): Resource => {
  const metadata: Resource['metadata'] = {};

  if (raw.voteCount !== undefined) {
    metadata.stars = String(raw.voteCount);
  }
  if (raw.lastUpdated) {
    metadata.updated = new Date(raw.lastUpdated).toLocaleDateString();
  }
  if (raw.totalBytes) {
    const mb = (raw.totalBytes / (1024 * 1024)).toFixed(1);
    metadata.language = `${mb} MB`;
  }

  // Construct a robust URL for datasets
  const url = raw.url 
    ? (raw.url.startsWith('http') ? raw.url : `https://www.kaggle.com${raw.url}`)
    : (raw.ref ? `https://www.kaggle.com/datasets/${raw.ref}` : undefined);

  return {
    id: `kaggle-ds-${Date.now()}-${index}`,
    title: raw.title || 'Untitled Dataset',
    type: 'dataset',
    url,
    summary: raw.subtitle || undefined,
    metadata,
  };
};

// --- Public API ---

/**
 * Fetch competitions the user has entered or active competitions list
 */
export const fetchUserCompetitions = async (creds: KaggleCredentials | null): Promise<Competition[]> => {
  const data = await kaggleFetch<KaggleCompetitionResponse[]>('/competitions/list', creds, {
    sortBy: 'latestDeadline',
  });

  if (!Array.isArray(data)) {
    console.warn('Kaggle competitions response was not an array:', data);
    return [];
  }

  return data.slice(0, 20).map(mapCompetition);
};

/**
 * Search competitions by keyword
 */
export const searchCompetitions = async (
  query: string,
  creds: KaggleCredentials | null
): Promise<Competition[]> => {
  const data = await kaggleFetch<KaggleCompetitionResponse[]>('/competitions/list', creds, {
    search: query,
  });

  if (!Array.isArray(data)) {
    console.warn('Kaggle competition search response was not an array:', data);
    return [];
  }

  return data.slice(0, 10).map(mapCompetition);
};

/**
 * Search datasets by keyword
 */
export const searchDatasets = async (
  query: string,
  creds: KaggleCredentials | null
): Promise<Resource[]> => {
  const data = await kaggleFetch<KaggleDatasetResponse[]>('/datasets/list', creds, {
    search: query,
    sortBy: 'votes',
  });

  if (!Array.isArray(data)) {
    console.warn('Kaggle dataset search response was not an array:', data);
    return [];
  }

  return data.slice(0, 8).map(mapDataset);
};

/**
 * Fetch leaderboard for a competition
 */
export const fetchLeaderboard = async (
  competitionId: string,
  creds: KaggleCredentials | null
): Promise<any[]> => {
  return kaggleFetch<any[]>('/competitions/leaderboard', creds, { id: competitionId });
};

/**
 * List files in a dataset
 */
export const fetchDatasetFiles = async (
  datasetId: string,
  creds: KaggleCredentials | null
): Promise<any[]> => {
  return kaggleFetch<any[]>('/datasets/files', creds, { id: datasetId });
};

/**
 * Test Kaggle credentials by making a lightweight API call
 */
export const testKaggleCredentials = async (creds: KaggleCredentials | null): Promise<string> => {
  await kaggleFetch<{ status: string }>('/test', creds);
  return 'Kaggle credentials verified successfully.';
};
