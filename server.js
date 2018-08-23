const assert = require('assert');
const dotenv = require('dotenv');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const mustache = require('mustache');
const fetch = require('node-fetch');
const htmlParser = require('fast-html-parser');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// init sqlite db
const DROP_DB = false; // switch to true when DB needs to be recreated during dev
const dbFile = './.data/sqlite.db';
const moment = require('moment');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

// Load local environment variables from .env
dotenv.load({silent: true});

assert(process.env.STACK_OVERFLOW_API_KEY, 'missing STACK_OVERFLOW_API_KEY in env');

let fromDate = new Date();
fromDate.setMonth(fromDate.getMonth() - 1);

const STACK_OVERFLOW_FROM_DATE_SECS = Math.floor(fromDate.getTime() / 1000);
const STACK_OVERFLOW_KEY = process.env.STACK_OVERFLOW_API_KEY;
const STACK_OVERFLOW_USER_IDS = [396246,4007679,2144525];
const STACK_OVERFLOW_QUESTIONS_URL = `https://api.stackexchange.com/2.2/search/advanced?site=stackoverflow&order=desc&sort=creation&key=${STACK_OVERFLOW_KEY}&q=samsung%20internet&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;
const STACK_OVERFLOW_ANSWERS_URL = `https://api.stackexchange.com/2.2/users/${STACK_OVERFLOW_USER_IDS.join(';')}/answers?site=stackoverflow&order=desc&sort=activity&key=${STACK_OVERFLOW_KEY}&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;
const STACK_OVERFLOW_COMMENTS_URL = `https://api.stackexchange.com/2.2/users/${STACK_OVERFLOW_USER_IDS.join(';')}/comments?site=stackoverflow&order=desc&key=${STACK_OVERFLOW_KEY}&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;

// if ./.data/sqlite.db does not exist, create it, otherwise print records to console
db.serialize(function(){
  if (!fs.existsSync(dbFile) || DROP_DB) {
    console.log('Dropping and recreating StatsValues table');
    db.run('DROP TABLE IF EXISTS StatsValues');
    db.run(`CREATE TABLE StatsValues (
             timestamp INTEGER,
             key TEXT,
             value REAL,
             PRIMARY KEY (timestamp, key))`);
    console.log('New table StatsValues created!');
    
    // insert initial values (from old dashboard data)
    db.serialize(function() {
      db.run(`INSERT INTO StatsValues (timestamp, key, value) VALUES 
               ('2018-07-24 00:00:00', 'mediumFollowers', 3000),
               ('2018-07-24 00:00:00', 'twitterFollowers', 1632),
               ('2018-07-24 00:00:00', 'facebookFollowers', 425),
               ('2018-07-24 00:00:00', 'instagramFollowers', 71),
               ('2018-07-24 00:00:00', 'devHubUniqueVisitors', 15564),
               ('2018-07-24 00:00:00', 'twitterImpressions', 93500),
               ('2018-07-24 00:00:00', 'twitterMentions', 116),
               ('2018-07-24 00:00:00', 'facebookViews', 114),
               ('2018-07-24 00:00:00', 'mediumViews', 45210),

               ('2018-08-07 00:00:00', 'mediumFollowers', 3100),
               ('2018-08-07 00:00:00', 'twitterFollowers', 1653),
               ('2018-08-07 00:00:00', 'facebookFollowers', 425),
               ('2018-08-07 00:00:00', 'instagramFollowers', 75),
               ('2018-08-07 00:00:00', 'devHubUniqueVisitors', 17210),
               ('2018-08-07 00:00:00', 'twitterImpressions', 62700),
               ('2018-08-07 00:00:00', 'twitterMentions', 100),
               ('2018-08-07 00:00:00', 'facebookViews', 63),
               ('2018-08-07 00:00:00', 'mediumViews', 41750),

               ('2018-08-20 00:00:00', 'mediumFollowers', 3100),
               ('2018-08-20 00:00:00', 'twitterFollowers', 1700),
               ('2018-08-20 00:00:00', 'facebookFollowers', 440),
               ('2018-08-20 00:00:00', 'instagramFollowers', 73),
               ('2018-08-20 00:00:00', 'devHubUniqueVisitors', 15400),
               ('2018-08-20 00:00:00', 'twitterImpressions', 25800),
               ('2018-08-20 00:00:00', 'twitterMentions', 61),
               ('2018-08-20 00:00:00', 'facebookViews', 114),
               ('2018-08-20 00:00:00', 'mediumViews', 36200);`);
    });
  }
  else {
    console.log('Database "StatsValues" already ready to go!');
  }
  db.each('SELECT * from StatsValues', function(err, row) {
    if ( row ) {
      console.log('record:', row);
    }
  });
});

async function scrapeTwitterFollowerCount() {
 
  return fetch('https://twitter.com/samsunginternet')
    .then(res => res.text())
    .then(body => {
    
      const doc = htmlParser.parse(body);
      const followersNav = doc.querySelector('.ProfileNav-item--followers');
      const followersValue = followersNav.querySelector('.ProfileNav-value');
      const followerCount = followersValue.childNodes[0].rawText;
      return followerCount;

    })
    .catch(err => {
      console.error('Error scraping Twitter follower count', err);
    });
  
}

async function fetchStackOverflowQuestionStats() {

    console.log('Fetching Stack Overflow question stats');

    try {
        const response = await fetch(STACK_OVERFLOW_QUESTIONS_URL);
        return await response.json();
    } catch(error) {
        console.log('Error fetching Stack Overflow question stats', error);
    }

}

async function fetchStackOverflowAnswerStats() {

    console.log('Fetching Stack Overflow answer stats');

    try {
        const response = await fetch(STACK_OVERFLOW_ANSWERS_URL);
        return await response.json();
    } catch(error) {
        console.log('Error fetching Stack Overflow question stats', error);
    }

}

async function fetchStackOverflowCommentStats() {

  console.log('Fetching Stack Overflow comment stats');

  try {
    const response = await fetch(STACK_OVERFLOW_COMMENTS_URL);
    return await response.json();
  } catch(error) {
    console.log('Error fetching Stack Overflow comment stats', error);
  }

}

// TODO authentication!
app.post('/admin/autoupdate', async function(request, response) {
  
  // TEMP - OK as a test for now, let's just try to get our Twitter follower count.
  const twitterFollowerCount = await scrapeTwitterFollowerCount();
  console.log('twitterFollowerCount', twitterFollowerCount);
  response.send({twitterFollowerCount: twitterFollowerCount});
  
});

// Homepage (dashboard)
app.get('/', function(request, response, next) {
  response.sendFile(__dirname + '/views/index.html');
});

// Admin page TODO authentication!
app.get('/admin', function(request, response) {
  response.sendFile(__dirname + '/views/admin.html');
});

// JSON API endpoint to get all the stats in the database
app.get('/api/getAllStats', function(request, response) {
  db.all('SELECT * from StatsValues', function(err, rows) {
    response.send(JSON.stringify(rows));
  });
});

// JSON API endpoint to get most recent stats in the database
app.get('/api/getMostRecentStats', function(request, response) {
  db.all(`SELECT * from StatsValues sv1 WHERE
    timestamp = (SELECT MAX(timestamp) FROM StatsValues sv2 WHERE sv1.key = sv2.key)`, function(err, rows) {
    response.send(JSON.stringify(rows));
  });
});

// JSON API endpoint to get 2nd most recent stats in the database for comparison
app.get('/api/getComparisonStats', function(request, response) {
  db.all(`SELECT * from StatsValues sv1 WHERE
    timestamp = (SELECT MAX(timestamp) 
    FROM StatsValues sv2 WHERE sv1.key = sv2.key 
    AND timestamp NOT IN (SELECT MAX(timestamp) FROM StatsValues sv3 WHERE sv1.key = sv3.key))`, function(err, rows) {
    response.send(JSON.stringify(rows));
  });
});

app.get('/api/getStackOverflowData', async function(request, response) {
  const questionStats = await fetchStackOverflowQuestionStats();
  const answerStats = await fetchStackOverflowAnswerStats();
  const commentStats = await fetchStackOverflowCommentStats();
  const data = {questions: questionStats, answers: answerStats, comments: commentStats};
  response.send(JSON.stringify(data));
});

var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});
