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

function calculateTotalImpressions(stats) {
  
  return stats.mediumViews.mostRecent.value +
    stats.facebookViews.mostRecent.value +
    stats.twitterImpressions.mostRecent.value +
    stats.devHubUniqueVisitors.mostRecent.value;
  
}

function setupMediumChart(mediumData) {
  
  // Date, Minutes Read, Views, Visitors

  var labelCount = 0;
  var labels = [];
  var totalTimeReadMins = [];
  var views = [];
  var dailyUniqueVisitors = [];

  var rows = mediumData.data.slice(1, mediumData.data.length - 1);

  rows.forEach(function(row) {
    if (row[2] !== 'null') {
      labels.push( row[0] );
      totalTimeReadMins.push( row[1] );
      views.push( row[2] );
      dailyUniqueVisitors.push( row[3] );
    }
  });

  var data = {
    labels: labels,
    series: [
      totalTimeReadMins,
      views,
      dailyUniqueVisitors
    ]
  };
  
  var options = {
    labelOffset: 50,
    height: 240,
    axisX: {
      showGrid: false,
      labelInterpolationFnc: function(value) {
        // Display one label every week
        if (labelCount++ % 7 === 0) {
          return moment(value).format('D/M/Y');
        }
      }
    },
    axisY: {
        onlyInteger: true
    },
    seriesBarDistance: 5,
    showPoint: false,
    lineSmooth: false
  };

  Chartist.Line('#medium-chart', data, options);
  labelCount = 0;
  
  document.getElementById('medium-chart-container').classList.remove('hidden');
  
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

getStackOverflowData().then(stackOverflowData => {
  
  const data = {
    questions: stackOverflowData.questions.items.length,
    answersAndComments: stackOverflowData.answers.items.length + stackOverflowData.comments.items.length
  };

  console.log('Processed StackOverflow data', data);
  
  new Vue({
    el: '#stackoverflow-data',
    data: data
  });
  
});

getLatestMediumCSVFilePath().then(csvFilePath => {
  Papa.parse(csvFilePath, {
    download: true,
    complete: function(data) {
        console.log('Medium data', data);
        setupMediumChart(data);
    }
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