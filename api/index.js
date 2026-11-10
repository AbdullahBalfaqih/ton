'use strict';
const { URL } = require('node:url');
const app = require('../src/qatta-handler');

module.exports = function qattaVercelHandler(req, res) {
  // vercel.json rewrites requests through /api/index and carries the original
  // pathname as __path so the existing router still receives /, /goal, /api/*.
  const url = new URL(req.url || '/', 'http://vercel.local');
  const originalPath = url.searchParams.get('__path');
  if (originalPath !== null) {
    url.searchParams.delete('__path');
    const query = url.searchParams.toString();
    req.url = (originalPath.startsWith('/') ? originalPath : `/${originalPath}`) + (query ? `?${query}` : '');
  }
  return app.handler(req, res);
};

// Preserve raw request bytes for webhook signature checks and app JSON parsing.
module.exports.config = { api: { bodyParser: false } };
