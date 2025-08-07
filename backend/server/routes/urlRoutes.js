const express = require('express');
const router = express.Router();
const {createShortUrl, redirectUrl, getUrlStats} = require('../controllers/urlController');
const auth = require('../middleware/auth');

//Protected routes requires auth

//app.use(auth); 
router.post('/shorten', auth, createShortUrl);
// router.get('/user-urls', getUserUrls);
// router.delete('/:id', deleteUrl);

// Public routes
router.get('/:code/stats',auth, getUrlStats);
router.get('/:code', redirectUrl);

module.exports = router;

/*
Method: POST

Path: /shorten

Middleware: auth

Handler: createShortUrl

Explanation:

This route is used to create a short URL.

The client must send a request body (typically JSON) containing the original URL.

auth ensures only authenticated users can create short URLs.

If authentication passes, the createShortUrl function runs. 
*/

/* 
This route fetches stats for a specific short URL.

:code is a route parameter, meaning this part of the URL is dynamic.

E.g., a request to /abc123/stats would extract abc123 as req.params.code.

auth middleware again ensures only authenticated users can view stats.

getUrlStats receives the request, reads the code from req.params, and returns the stats.
*/