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
