const GITHUB_API_REPOS_URL = 'https://api.github.com/search/repositories?q=org%3Asamsunginternet';

/**
 * If thousands or more, use format like 12.3
 */
function formatNumberValue(number, forceThousandsFormat) {
    return forceThousandsFormat || Math.abs(number) >= 1000 ? (number/1000).toFixed(1) + 'K' : number;
}

function getMostRecentGeneralStats() {
  return fetch('/api/getMostRecentStats')
    .then(res => res.json())
    .then(data => {
      console.log('Most recent general stats', data);
      return data;
    })
    .catch(err => {
      console.error('Error getting most recent general stats', err);
      return null;
    });
}

function getComparisonGeneralStats() {
  return fetch('/api/getComparisonStats')
    .then(res => res.json())
    .then(data => {
      console.log('Comparison general stats', data);
      return data;
    })
    .catch(err => {
      console.error('Error getting comparison general stats', err);
      return null;
    });
}

// Scraping needs to be done server-side due to cross-origin restrictions client-side.
function autoUpdate() {
  return fetch('/api/admin/autoUpdate', {
    method: 'POST',
    credentials: 'include'
  })
  .then(res => res.json())
  .then(result => {
    console.log('Result from server is', JSON.stringify(result));
    return result;
  })
  .catch(err => {
    console.error('Error attempting auto-update request', err);
    return null;
  });
}

function updateStat(statKey, statValue) {
  return fetch('/api/admin/updateStat', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'         
    },
    body: JSON.stringify({key: statKey, value: statValue})
  })
  .then(res => res.json())
  .then(data => {
    console.log('Response after updating stat', data);
    return true;
  })
  .catch(err => {
    console.error('Error updating stat', err);
    return false;
  });
}

// Will Glitch keep hitting Github's rate limit? 
// Maybe better to do server-side and cache it in DB? (Then we could check diff since last time too)
function getGithubData() {
  return fetch(GITHUB_API_REPOS_URL)
    .then(res => res.json())
    .then(data => {
      console.log('Github data', data);
      return data;
    })
    .catch(err => {
      console.error('Error getting Github data', err);
      return null;
    });
}

function getStackOverflowData() {
  return fetch('/api/getStackOverflowData')
    .then(res => res.json())
    .then(data => {
      console.log('Stack Overflow data', data);
      return data;
    })
    .catch(err => {
      console.error('Error getting Stack Overflow data', err);
      return null;
    });
}

function getLatestMediumCSVFilePath() {
  return fetch('/api/getLatestMediumCSVFilePath')
    .then(res => res.text())
    .then(data => {
      console.log('Latest Medium CSV file path', data);
      return data;
    })
    .catch(err => {
      console.error('Error getting Stack Overflow data', err);
      return null;
    });
}

function calculateTotalFollowers(stats) {
  
  return stats.mediumFollowers.mostRecent.value + 
    stats.twitterFollowers.mostRecent.value + 
    stats.facebookFollowers.mostRecent.value +
    stats.instagramFollowers.mostRecent.value;
  
}

