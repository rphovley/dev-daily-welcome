const axios = require('axios');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const API_URL = 'https://api.daily.dev/graphql';
const LAST_RUN_FILE = 'last_run.txt';

async function getUserToken() {
  return new Promise((resolve) => {
    rl.question('Please enter your daily.dev user session token: ', (token) => {
      resolve(token.trim());
    });
  });
}

async function getNotifications(token, after = null) {
  const query = `
    query Notifications($after: String, $first: Int) {
      notifications(after: $after, first: $first) {
        pageInfo {
          endCursor
          hasNextPage
        }
        edges {
          node {
            id
            createdAt
            type
            title
            avatars {
              referenceId
              name
            }
          }
        }
      }
    }
  `;

  const variables = { first: 100, after };

  try {
    const response = await axios.post(API_URL, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `da3=${token}`
      }
    });

    return response.data.data.notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error.message);
    return null;
  }
}

async function sendWelcomeMessage(token, postId, username) {
  const query = `
    mutation COMMENT_ON_POST_MUTATION($id: ID!, $content: String!) {
      comment: commentOnPost(postId: $id, content: $content) {
        id
      }
    }
  `;

  const variables = {
    id: postId,
    content: `@${username} welcome to The Dev Craft! Excited to have you here!`
  };

  try {
    await axios.post(API_URL, {
      query,
      variables
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `da3=${token}`
      }
    });
    console.log(`Welcome message sent to @${username}`);
  } catch (error) {
    console.error(`Error sending welcome message to @${username}:`, error.message);
  }
}

async function main() {
  const token = await getUserToken();

  let lastRunTime;
  try {
    lastRunTime = fs.readFileSync(LAST_RUN_FILE, 'utf8');
  } catch (error) {
    lastRunTime = new Date(0).toISOString();
  }

  let newMembers = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const notifications = await getNotifications(token, after);
    if (!notifications) break;

    for (const edge of notifications.edges) {
      const notification = edge.node;
      if (new Date(notification.createdAt) <= new Date(lastRunTime)) {
        hasNextPage = false;
        break;
      }

      if (notification.type === 'squad_member_joined') {
        newMembers.push({
          username: notification.avatars[1].name,
          postId: notification.id.split(':')[1]
        });
      }
    }

    hasNextPage = notifications.pageInfo.hasNextPage && hasNextPage;
    after = notifications.pageInfo.endCursor;
  }

  if (newMembers.length === 0) {
    console.log('No new members joined since the last run.');
    rl.close();
    return;
  }

  console.log(`Found ${newMembers.length} new members:`);
  newMembers.forEach(member => console.log(`- ${member.username}`));

  rl.question('Would you like to send welcome messages to these new users? (Y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer === '') {
      for (const member of newMembers) {
        await sendWelcomeMessage(token, member.postId, member.username);
      }
    }

    fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString());
    console.log('Last run time updated.');
    rl.close();
  });
}

main();