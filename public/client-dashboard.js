const GITHUB_API_REPOS_URL = 'https://api.github.com/search/repositories?q=org%3Asamsunginternet';

/**
 * If thousands or more, use format like 12.3
 */
function formatNumberValue(number, forceThousandsFormat) {
    return forceThousandsFormat || Math.abs(number) >= 1000 ? (number/1000).toFixed(1) + 'K' : number;
}

async function getMostRecentGeneralStats() {
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

async function getComparisonGeneralStats() {
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

// TODO problem is Glitch will keep hitting Github's rate limit? Better to do server-side and cache it in the DB! 
// Then we get to check the diff since last time too...
async function getGithubData() {
  return fetch(GITHUB_API_REPOS_URL)
    .then(res => res.json())
    .then(data => {
      console.log('Github data', data);
      return data;
    })
    .catch(err => {
      console.error('Error getting github data', err);
      return null;
    });
}

function calculateTotalFollowers(stats) {
  
  return stats.mediumFollowers.mostRecent.value + 
    stats.twitterFollowers.mostRecent.value + 
    stats.facebookFollowers.mostRecent.value +
    stats.instagramFollowers.mostRecent.value;
  
}

function calculateTotalImpressions(stats) {
  
  return stats.mediumViews.mostRecent.value +
    stats.facebookViews.mostRecent.value +
    stats.twitterImpressions.mostRecent.value +
    stats.devHubUniqueVisitors.mostRecent.value;
  
}

getMostRecentGeneralStats().then(mostRecentStats => {
  
  getComparisonGeneralStats().then(comparisonStats => {
    
    let data = {stats: {}},
        lastUpdatedTime,
        latestTimestampMoment = 0;

    if (mostRecentStats) {

      mostRecentStats.forEach(stat => {
        
        const timestampMoment = moment(stat.timestamp);
        
        if (timestampMoment > latestTimestampMoment) {
          latestTimestampMoment = timestampMoment;
        }
        
        data.stats[stat.key] = {mostRecent: {value: stat.value, 
          formatted: formatNumberValue(stat.value),
          timestampMoment: timestampMoment}};
        
      });
      
      if (comparisonStats) {
        comparisonStats.forEach(stat => {
          const statRecord = data.stats[stat.key];
          if (statRecord) {
            const mostRecentValue = statRecord.mostRecent.value;
            data.stats[stat.key].comparison = {value: stat.value,
              change: mostRecentValue - stat.value,
              changeFormatted: formatNumberValue(mostRecentValue - stat.value),
              changePercent: (mostRecentValue / stat.value * 100) - 100,
              timeDiff: statRecord.mostRecent.timestampMoment.from(moment(stat.timestamp), true)};
          }
        });
      }
      
      data.totalFollowers = formatNumberValue(calculateTotalFollowers(data.stats));
      data.totalImpressions = formatNumberValue(calculateTotalImpressions(data.stats));
      if (latestTimestampMoment > 0) {
        data.lastUpdatedTime = latestTimestampMoment.format('Do MMM YYYY');
      }

    } else {
      data.error = true;
    }

    new Vue({
      el: '#general-stats',
      data : data
    });
  }).catch(err => {
    console.error('Error', err);
  });
}).catch(err => {
  console.error('Error', err);
});

getGithubData().then(githubData => {
  
  let data = {};
  
  if (githubData) {
    
    var totalStars = 0;
    var totalForks = 0;
    var supportRepo;

    for (var i=0; i < githubData.items.length; i++) {

        var repo = githubData.items[i];

        totalStars += repo['stargazers_count'];
        totalForks += repo['forks'];

        if (repo.name === 'support') {
            supportRepo = repo;
        }

    }

    data.githubRepositories = githubData['total_count'];
    data.githubStars = totalStars;
    data.githubForks = totalForks;
    data.githubOpenIssues = supportRepo['open_issues_count'];
    
  } else {
    data.error = true;
  }
  
  console.log('Processed Github data', data);
  
  new Vue({
    el: '#github-data',
    data: data
  });
  
});

Vue.component('stat-comparison', {
  props: ['comparison'],
  template: `<p class="change" v-if="comparison">
              <template v-if="comparison.change === 0"> 
                <span class="arrow same">‒</span>
              </template>
              <template v-else-if="comparison.change > 0">
                <span class="arrow up">↑</span>
              </template>
              <template v-else>
                <span class="arrow down">↓</span>
              </template>
              {{comparison.changeFormatted}} (<span>{{comparison.timeDiff}}</span>)
            </p>`
})