export async function scrapeTwitterFollowerCount() {
 
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

export async function scrapeMediumFollowerCount() {
 
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
