let lastUpdatedTime = null;

const parser = new DOMParser();

getMostRecentGeneralStats().then(mostRecentStats => {
    
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

    if (latestTimestampMoment > 0) {
      data.lastUpdatedTime = latestTimestampMoment.format('Do MMM YYYY');
    }

  } else {
    data.error = true;
  }
  
  new Vue({
    el: '#manual-stats',
    data : data,
    methods: {
      onKeyUp: _.debounce(function(event) {
        console.log('onKeyUp event (debounced)', event);
        // TODO auth
        updateStat(event.target.id, event.target.value)
        .then(response => {
          console.log('Response from updating stat', response);
        });
      }, 500)
    }
  });
}).catch(err => {
  console.error('Error', err);
});

new Vue({
  el: '#automatic-stats',
  data : {
    updating: false,
    updates: []
  },
  methods: {
    onClickUpdate: function(event) {
      
      this.updating = true;

      // NB. The scraping needs to be done server-side due to cross-origin restrictions client-side.
      fetch('/admin/autoUpdate', {method: 'POST'})
        .then(res => res.json())
        .then(result => {

          console.log('Result from server is', JSON.stringify(result));

          this.updates = result;
          this.updating = false;

        })
        .catch(err => {
          console.error('Error attempting auto-update request', err);
        });

    }
  }
});