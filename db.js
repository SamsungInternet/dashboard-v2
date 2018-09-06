import fs from 'fs';

const RECREATE_DB = false; // switch to true when DB needs to be recreated during dev
const dbFile = './.data/sqlite.db';

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbFile);

export function init() {
 
  // if ./.data/sqlite.db does not exist, create it, otherwise log existing records
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
  
}

export function getAllStats() {
  return new Promise(function(resolve, reject) {
    db.all('SELECT * from StatsValues', function(err, rows) {
      if (err) {
        console.error('Error getting all stats', err);
        reject(err);
      }
      resolve(rows);
    });
  });
}

export function getMostRecentStats() {
  return new Promise(function(resolve, reject) {
    db.all(`SELECT * from StatsValues sv1 WHERE
      timestamp = (SELECT MAX(timestamp) FROM StatsValues sv2 WHERE sv1.key = sv2.key)`, function(err, rows) {
      if (err) {
        console.error('Error getting most recent stats', err);
        reject(err);
      }
      resolve(rows);
    });
  });
}   

export function getComparisonStats() {
  return new Promise(function(resolve, reject) {
    db.all(`SELECT * from StatsValues sv1 WHERE
      timestamp = (SELECT MAX(timestamp) 
      FROM StatsValues sv2 WHERE sv1.key = sv2.key 
      AND timestamp NOT IN (SELECT MAX(timestamp) FROM StatsValues sv3 WHERE sv1.key = sv3.key))`, function(err, rows) {
      if (err) {
        console.error('Error getting most recent stats', err);
        reject(err);
      }
      resolve(rows);
    });
  });
}

export function updateStat(statKey, statValue) {

  return new Promise(function(resolve, reject) {
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
          reject(err);
        } else {
          resolve(true);
        }
      });

    });
  });
  
}
