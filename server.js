import assert from 'assert';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import express from 'express';
import fs from 'fs';
import moment from 'moment';
import mustache from 'mustache';

import * as db from './db.js';

import {scrapeTwitterFollowerCount, 
        scrapeMediumFollowerCount} from './scraper.js';

import {fetchStackOverflowQuestionStats, 
        fetchStackOverflowAnswerStats, 
        fetchStackOverflowCommentStats} from './stackOverflow.js';

assert(process.env.ADMIN_PWD, 'missing ADMIN_PWD in env');
assert(process.env.COOKIE_SECRET, 'missing COOKIE_SECRET in env');
assert(process.env.STACK_OVERFLOW_API_KEY, 'missing STACK_OVERFLOW_API_KEY in env');

db.init();

const ADMIN_USER = 'admin';
const app = express();

app.set('trust proxy', 1);
app.use(cookieParser());
app.use(session({
  secret: process.env.COOKIE_SECRET,
  cookie: {secure: true},
  saveUninitialized: true,
  resave: true
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

app.use(function printSession(req, res, next) {
  console.log('req.session', req.session);
  return next();
});

const adminAuth = (request, response, next) => {
  console.log('Checking request.session.user', request.session.user);
  if (request.session && request.session.user === ADMIN_USER ) {
    return next();
  } else {
    return response.redirect('/login');
  }
};

const adminApiAuth = (request, response, next) => {
  if (request.session && request.session.user === ADMIN_USER ) {
    return next();
  } else {
    const err = new Error('You must be logged in.');
    err.status = 401;
    return next(err);
  }
};

// Homepage (dashboard)
app.get('/', (request, response, next) => {
  response.sendFile(__dirname + '/views/index.html');
});

// Admin controls
app.get('/admin', adminAuth, (request, response) => {
  response.sendFile(__dirname + '/views/admin.html');
});

app.get('/login', (request, response) => {
  response.sendFile(__dirname + '/views/login.html');
});

app.post('/login', (request, response) => {
  
  console.log('username', request.body.username);
  console.log('pwd', request.body.password);
  
  if (request.body.username === ADMIN_USER &&
      request.body.password === process.env.ADMIN_PWD) {
    request.session.user = ADMIN_USER;
    console.log('Set request.session.user', request.session.user);
    response.redirect('/admin');
  } else {
    response.redirect('/login?error=invalid');
  }
});

app.get('/logout', function(request, response, next) {
  if (request.session) {
    request.session.destroy(err => {
      if (err) {
        return next(err);
      } else {
        return response.redirect('/');
      }
    });
  } else {
    return response.redirect('/');
  }
});

// JSON API endpoint to get all the stats in the database
app.get('/api/getAllStats', async function(request, response) {
  const rows = await db.getAllStats();
  response.send(JSON.stringify(rows));
});

// JSON API endpoint to get most recent stats in the database
app.get('/api/getMostRecentStats', async function(request, response) {
  console.log('1');
  const rows = await db.getMostRecentStats();
  console.log('2', rows);
  response.send(JSON.stringify(rows));
});

// JSON API endpoint to get 2nd most recent stats in the database for comparison
app.get('/api/getComparisonStats', async function(request, response) {
  const rows = await db.getComparisonStats();
  response.send(JSON.stringify(rows));
});

app.get('/api/getStackOverflowData', async function(request, response) {
  const questionStats = await fetchStackOverflowQuestionStats();
  const answerStats = await fetchStackOverflowAnswerStats();
  const commentStats = await fetchStackOverflowCommentStats();
  const data = {questions: questionStats, answers: answerStats, comments: commentStats};
  response.send(JSON.stringify(data));
});

app.get('/api/getLatestMediumCSVFilePath', function(request, response) {
  const files = fs.readdirSync(__dirname + '/public/data');
  // Presume files are in order because they should start with the date
  let latestFilename = files[files.length - 1];
  response.send(`data/${latestFilename}`);
});

// Manual statistic update
app.post('/api/admin/updateStat', adminApiAuth, async function(request, response) {
  
  const statKey = request.body.key,
        statValue = request.body.value,
        errorResponse = JSON.stringify({success: false});
  
  if (!statKey || !statValue) {
    response.send(errorResponse);
    return;
  }
  
  const parsed = parseInt(statValue, 10);
  if (isNaN(parsed)) {
    response.send(errorResponse);
    return;
  }
  
  console.log('Update this stat', statKey, statValue);
  
  const success = await db.updateStat(statKey, statValue);
  
  response.send(JSON.stringify({success: success}));
});

// Automatic scrape and update
app.post('/api/admin/autoUpdate', adminApiAuth, async function(request, response) {
  
  let stats = {};
  
  stats.twitterFollowerCount = await scrapeTwitterFollowerCount();
  stats.mediumFollowerCount = await scrapeMediumFollowerCount();
  
  for (const statKey in stats) {
  
    const statValue = stats[statKey];
    
    if (statValue !== null && !isNaN(statValue)) {
      db.updateStat(statKey, statValue);
    } else {
      console.error(`Unparseable value for ${statKey}:`, statValue);
    }
    
  }
  
  const updatesMap = Object.keys(stats).map((key) => {
    return {key: key, value: stats[key]};
  });
  
  console.log('Updates map', updatesMap);
  
  response.send(updatesMap);
  
});

const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
