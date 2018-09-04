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
app.use(bodyParser.json());
app.use(express.static('public'));

// init sqlite db
const RECREATE_DB = false; // switch to true when DB needs to be recreated during dev
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
  if (!fs.existsSync(dbFile) || RECREATE_DB) {
    console.log('Dropping and recreating StatsValues table');
    db.run('DROP TABLE IF EXISTS StatsValues');
    db.run(`CREATE TABLE StatsValues (
             timestamp INTEGER,
             key TEXT,
             value REAL)`);
    console.log('New table StatsValues created!');
    
    // insert initial values (from old dashboard data)
    db.serialize(function() {
      db.run(`INSERT INTO StatsValues (timestamp, key, value) VALUES 
               ('2018-08-20 00:00:00', 'devHubUniqueVisitors', 14206),
               ('2018-08-28 00:00:00', 'mediumFollowers', 3100),
               ('2018-08-28 00:00:00', 'mediumViews', 36216),
               ('2018-08-28 00:00:00', 'twitterFollowers', 1692),
               ('2018-08-28 00:00:00', 'twitterImpressions', 27300),
               ('2018-08-28 00:00:00', 'twitterMentions', 57),
               ('2018-08-28 00:00:00', 'facebookFollowers', 445),
               ('2018-08-28 00:00:00', 'instagramFollowers', 75),

               ('2018-09-04 00:00:00', 'devHubUniqueVisitors', 13316),
               ('2018-09-04 00:00:00', 'mediumFollowers', 3100),
               ('2018-09-04 00:00:00', 'mediumViews', 37558),
               ('2018-09-04 00:00:00', 'twitterFollowers', 1701),
               ('2018-09-04 00:00:00', 'twitterImpressions', 37000),
               ('2018-09-04 00:00:00', 'twitterMentions', 80),
               ('2018-09-04 00:00:00', 'facebookFollowers', 443),
               ('2018-09-04 00:00:00', 'instagramFollowers', 77);`);
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
      const followersElement = followersNav.querySelector('.ProfileNav-value');
      let followerCount = followersElement.childNodes[0].rawText;
      followerCount = followerCount.replace(',', '');
      return parseInt(followerCount, 10);

    })
    .catch(err => {
      console.error('Error scraping Twitter follower count', err);
    });
  
}

async function scrapeMediumFollowerCount() {
 
  return fetch('https://medium.com/samsung-internet-dev/latest')
    .then(res => res.text())
    .then(body => {
    
      const doc = htmlParser.parse(body);
      const followersNav = doc.querySelector('.js-aboutCollectionBox');
      const followersElement = followersNav.querySelectorAll('.u-fontSize14')[1];
      const followerText = followersElement.rawText;
    
      let followerCount = followerText.replace('Followers', '');
    
      // To handle e.g. "3K" and "3.1K"
      if (followerCount.includes('.')) {
          followerCount = followerCount.replace('K', '00').replace('.', '');
      } else {
          followerCount = followerCount.replace('K', '000');
      }
        
      return parseFloat(followerCount, 10);

    })
    .catch(err => {
      console.error('Error scraping Medium follower count', err);
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

async function updateStat(statKey, statValue) {

  db.serialize(function() {

    const insertStmt = db.prepare('INSERT INTO StatsValues (timestamp, key, value) VALUES (datetime(\'now\'), ?, ?)');
    insertStmt.run(statKey, statValue);
    
    /**
     * Now delete any other values for this stat within the same day.
     * Because comparisons with less than 1 day ago don't make sense.
     * And this allows admins to override mistakes without them
     * being kept around to show the difference.
     */
    const deleteStmt = db.prepare(`DELETE from StatsValues WHERE key = ?
      AND timestamp > date('now','-1 day')
      AND timestamp NOT IN (SELECT MAX(timestamp) FROM StatsValues sv2 WHERE key = sv2.key)`);

    deleteStmt.run(statKey, function(err, rows) {
      if (err) {
        console.error('Error deleting stats values from same day', err);
      }
      return !err;
    });
    
  });
  
}


// TODO authentication!
app.post('/admin/autoupdate', async function(request, response) {
  
  let stats = {};
  
  stats.twitterFollowerCount = await scrapeTwitterFollowerCount();
  stats.mediumFollowerCount = await scrapeMediumFollowerCount();
  
  for (const statKey in stats) {
  
    const statValue = stats[statKey];
    
    if (statValue !== null && !isNaN(statValue)) {
      updateStat(statKey, statValue);
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

app.get('/api/getLatestMediumCSVFilePath', function(request, response) {
  const files = fs.readdirSync(__dirname + '/public/data');
  // Presume files are in order because they should start with the date
  let latestFilename = files[files.length - 1];
  response.send(`data/${latestFilename}`);
});

var listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

// TODO auth!
app.post('/api/updateStat', function(request, response) {
  
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
  
  const success = updateStat(statKey, statValue);
  
  response.send(JSON.stringify({success: success}));
});
