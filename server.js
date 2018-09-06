import assert from 'assert';
import basicAuth from 'express-basic-auth';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import htmlParser from 'fast-html-parser';
import mustache from 'mustache';

import * as db from './db.js';

import {scrapeTwitterFollowerCount, 
        scrapeMediumFollowerCount} from './scraper.js';

import {fetchStackOverflowQuestionStats, 
        fetchStackOverflowAnswerStats, 
        fetchStackOverflowCommentStats} from './fetcher.js';

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

const moment = require('moment');

// Load local environment variables from .env
//dotenv.load({silent: true});

// assert(process.env.STACK_OVERFLOW_API_KEY, 'missing STACK_OVERFLOW_API_KEY in env');
// assert(process.env.ADMIN_PWD, 'missing ADMIN_PWD in env');

console.log('env vars are undefined! why? :-/', process.env.STACK_OVERFLOW_API_KEY);

let fromDate = new Date();
fromDate.setMonth(fromDate.getMonth() - 1);

const STACK_OVERFLOW_FROM_DATE_SECS = Math.floor(fromDate.getTime() / 1000);
const STACK_OVERFLOW_KEY = process.env.STACK_OVERFLOW_API_KEY;
const STACK_OVERFLOW_USER_IDS = [396246,4007679,2144525];
const STACK_OVERFLOW_QUESTIONS_URL = `https://api.stackexchange.com/2.2/search/advanced?site=stackoverflow&order=desc&sort=creation&key=${STACK_OVERFLOW_KEY}&q=samsung%20internet&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;
const STACK_OVERFLOW_ANSWERS_URL = `https://api.stackexchange.com/2.2/users/${STACK_OVERFLOW_USER_IDS.join(';')}/answers?site=stackoverflow&order=desc&sort=activity&key=${STACK_OVERFLOW_KEY}&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;
const STACK_OVERFLOW_COMMENTS_URL = `https://api.stackexchange.com/2.2/users/${STACK_OVERFLOW_USER_IDS.join(';')}/comments?site=stackoverflow&order=desc&key=${STACK_OVERFLOW_KEY}&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;

db.init();

const adminAuth = basicAuth({
    users: {
        'admin': process.env.ADMIN_PWD
    },
    challenge: false
});

const adminChallengeAuth = basicAuth({
    users: {
        'admin': process.env.ADMIN_PWD
    },
    challenge: true
});

// Homepage (dashboard)
app.get('/', function(request, response, next) {
  response.sendFile(__dirname + '/views/index.html');
});

// Admin controls
app.get('/admin', adminChallengeAuth, function(request, response) {
  response.sendFile(__dirname + '/views/admin.html');
});

// JSON API endpoint to get all the stats in the database
app.get('/api/getAllStats', async function(request, response) {
  const rows = await db.getAllStats();
  response.send(JSON.stringify(rows));
});

// JSON API endpoint to get most recent stats in the database
app.get('/api/getMostRecentStats', async function(request, response) {
  const rows = await db.getMostRecentStats();
  response.send(JSON.stringify(rows));
});

// JSON API endpoint to get 2nd most recent stats in the database for comparison
app.get('/api/getComparisonStats', async function(request, response) {
  const rows = await db.getComparisonStats();
  
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
app.post('/api/updateStat', adminAuth, function(request, response) {
  
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
  
  const success = db.updateStat(statKey, statValue);
  
  response.send(JSON.stringify({success: success}));
});

// Automatic scrape and update
app.post('/admin/autoUpdate', adminAuth, async function(request, response) {
  
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
