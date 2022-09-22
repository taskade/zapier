export const authentication = {
  type: 'oauth2',
  test: {
    headers: {
      accept: 'application/json',
      authorization: 'bearer {{bundle.authData.access_token}}',
    },
    url: 'https://www.taskade.com/oauth2/ping',
  },
  oauth2Config: {
    authorizeUrl: {
      url: 'https://www.taskade.com/oauth2/authorize',
      params: {
        client_id: '{{process.env.CLIENT_ID}}',
        state: '{{bundle.inputData.state}}',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
        response_type: 'code',
      },
    },
    getAccessToken: {
      body: {
        code: '{{bundle.inputData.code}}',
        client_id: '{{process.env.CLIENT_ID}}',
        client_secret: '{{process.env.CLIENT_SECRET}}',
        grant_type: 'authorization_code',
        redirect_uri: '{{bundle.inputData.redirect_uri}}',
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      method: 'POST',
      url: 'https://www.taskade.com/oauth2/token',
    },
    refreshAccessToken: {
      body: {
        refresh_token: '{{bundle.authData.refresh_token}}',
        grant_type: 'refresh_token',
      },
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        accept: 'application/json',
      },
      method: 'POST',
      url: 'https://www.taskade.com/oauth2/token',
    },
    scope: '*',
    autoRefresh: true,
  },
  connectionLabel: '{{handle}}',
};
