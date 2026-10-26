import { describe, expect, it, vi } from 'vitest';
import { GithubOAuthClient } from '../../src/services/github-oauth.client.js';

describe('GithubOAuthClient', () => {
  const config = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    callbackUrl: 'http://localhost:5000/api/v1/auth/github/callback',
  };

  it('reports whether GitHub OAuth is configured', () => {
    expect(new GithubOAuthClient(config).isConfigured).toBe(true);
    expect(
      new GithubOAuthClient({ clientId: '', clientSecret: '', callbackUrl: '' }).isConfigured
    ).toBe(false);
  });

  it('builds an authorization URL with state and PKCE', () => {
    const client = new GithubOAuthClient(config);
    const url = new URL(client.buildAuthorizeUrl({
      state: 'test-state',
      codeChallenge: 'test-challenge',
    }));

    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe(config.clientId);
    expect(url.searchParams.get('redirect_uri')).toBe(config.callbackUrl);
    expect(url.searchParams.get('state')).toBe('test-state');
    expect(url.searchParams.get('code_challenge')).toBe('test-challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('exchanges an authorization code for an access token', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'test-access-token' }),
    });
    const client = new GithubOAuthClient(config, { fetch });

    await expect(client.exchangeCode({
      code: 'test-code',
      codeVerifier: 'test-verifier',
    })).resolves.toBe('test-access-token');

    expect(fetch).toHaveBeenCalledWith(
      'https://github.com/login/oauth/access_token',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('rejects an unsuccessful token exchange', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'bad_verification_code' }),
    });
    const client = new GithubOAuthClient(config, { fetch });

    await expect(client.exchangeCode({
      code: 'bad-code',
      codeVerifier: 'test-verifier',
    })).rejects.toThrow(/GitHub login failed/);
  });

  it('rejects a token response without an access token', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: 'invalid_grant' }),
    });
    const client = new GithubOAuthClient(config, { fetch });

    await expect(client.exchangeCode({
      code: 'test-code',
      codeVerifier: 'test-verifier',
    })).rejects.toThrow(/GitHub login failed/);
  });

  it('returns the profile with the verified primary email', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, login: 'sneha', name: 'Sneha' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { email: 'other@example.com', primary: false, verified: true },
          { email: 'sneha@example.com', primary: true, verified: true },
        ],
      });
    const client = new GithubOAuthClient(config, { fetch });

    await expect(client.getProfile('test-token')).resolves.toEqual({
      githubId: '123',
      login: 'sneha',
      name: 'Sneha',
      email: 'sneha@example.com',
    });
  });

  it('rejects when GitHub profile requests fail', async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
    });
    const client = new GithubOAuthClient(config, { fetch });

    await expect(client.getProfile('bad-token'))
      .rejects.toThrow('Could not read GitHub profile');
  });

  it('rejects a GitHub account without a verified primary email', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 123, login: 'sneha', name: 'Sneha' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          { email: 'sneha@example.com', primary: true, verified: false },
        ],
      });
    const client = new GithubOAuthClient(config, { fetch });

    await expect(client.getProfile('test-token'))
      .rejects.toThrow('Your GitHub account has no verified primary email');
  });
});