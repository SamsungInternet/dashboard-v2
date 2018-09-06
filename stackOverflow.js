import fetch from 'node-fetch';

let fromDate = new Date();
fromDate.setMonth(fromDate.getMonth() - 1);

const STACK_OVERFLOW_FROM_DATE_SECS = Math.floor(fromDate.getTime() / 1000);
const STACK_OVERFLOW_KEY = process.env.STACK_OVERFLOW_API_KEY;
const STACK_OVERFLOW_USER_IDS = [396246,4007679,2144525];
const STACK_OVERFLOW_QUESTIONS_URL = `https://api.stackexchange.com/2.2/search/advanced?site=stackoverflow&order=desc&sort=creation&key=${STACK_OVERFLOW_KEY}&q=samsung%20internet&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;
const STACK_OVERFLOW_ANSWERS_URL = `https://api.stackexchange.com/2.2/users/${STACK_OVERFLOW_USER_IDS.join(';')}/answers?site=stackoverflow&order=desc&sort=activity&key=${STACK_OVERFLOW_KEY}&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;
const STACK_OVERFLOW_COMMENTS_URL = `https://api.stackexchange.com/2.2/users/${STACK_OVERFLOW_USER_IDS.join(';')}/comments?site=stackoverflow&order=desc&key=${STACK_OVERFLOW_KEY}&fromdate=${STACK_OVERFLOW_FROM_DATE_SECS}`;

export async function fetchStackOverflowQuestionStats() {

    console.log('Fetching Stack Overflow question stats');

    try {
        const response = await fetch(STACK_OVERFLOW_QUESTIONS_URL);
        return await response.json();
    } catch(error) {
        console.log('Error fetching Stack Overflow question stats', error);
    }

}

export async function fetchStackOverflowAnswerStats() {

    console.log('Fetching Stack Overflow answer stats');

    try {
        const response = await fetch(STACK_OVERFLOW_ANSWERS_URL);
        return await response.json();
    } catch(error) {
        console.log('Error fetching Stack Overflow question stats', error);
    }

}

export async function fetchStackOverflowCommentStats() {

  console.log('Fetching Stack Overflow comment stats');

  try {
    const response = await fetch(STACK_OVERFLOW_COMMENTS_URL);
    return await response.json();
  } catch(error) {
    console.log('Error fetching Stack Overflow comment stats', error);
  }

}
