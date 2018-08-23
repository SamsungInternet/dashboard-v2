let lastUpdatedTime = null;

const parser = new DOMParser();
const btnAutoUpdate = document.getElementById('autoUpdate');

btnAutoUpdate.addEventListener('click', function(event) {
  
  btnAutoUpdate.innerText = 'Updating';
  btnAutoUpdate.setAttribute('disabled', true);
  
  // NB. The scraping needs to be done server-side due to cross-origin restrictions client-side.
  fetch('/admin/autoupdate', {method: 'POST'})
    .then(res => res.json())
    .then(result => {
      alert('Result from server is ' + JSON.stringify(result));
    })
    .catch(err => {
      console.error('Error attempting auto-update request', err);
    });
  
});


