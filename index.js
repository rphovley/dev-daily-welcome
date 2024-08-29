const axios = require('axios');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const welcomeMessages = [
  "Excited to have you here!",
  "Thanks for joining the crew!",
  "Feel free to share what you are learning with us!",
  "Great to have you here!",
  "Welcome aboard! Can't wait to see your contributions!",
  "Glad you're here! Looking forward to your insights!",
  "Welcome to our dev community! Don't hesitate to ask questions!",
  "Awesome to have you join us! What's your favorite tech stack?"
];


const da2_cookie = 'M8W2z5HKelL98yIB0MhpE'
const da3_cookie = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjQ5NTQ2NjYuMjEsInVzZXJJZCI6Ik04VzJ6NUhLZWxMOTh5SUIwTWhwRSIsInJvbGVzIjpbXSwiaWF0IjoxNzI0OTUzNzY2LCJhdWQiOiJEYWlseSIsImlzcyI6IkRhaWx5IEFQSSJ9.HhPRZR7e6p_fQZzvr1j0EhOFhhTw9QqQeWGWUNgsB7MHnNR-lzBqrY5BaE7aluRtjFqoGKghh85PNv0w7fWKb81H1NM4M3DXRCc1-wu4z_Pd6-6wfhgS6O05_WFTRlXgwe8ig3I5yP2t_rycatzJTktF32Bm6eidyM5IXiuf1AN5rgPS9l9uM2Ku4pO7YPghBxNyZh3XYjq9p0vC5u8F8AjrkRseApA6k1XwbKj8bVxfH1FKtGEmeiU6zSGMI7KJ55KxGkqy4fn-63dl5Z2Fd3DVKRaEyDFXIMP8nKc2eAxEmlGY76oWHcxX2u0AsUT7UZCQak1sAbVC3b8J_1lAuA.WHz3muaSOMG4GZ%2F8G5sn%2Fim%2F%2B9jeyLysn7luqYL2NN8'
const das_cookie = '368d8f5a-ee96-4e65-86dc-5acc40a9eb79'
const session_cookie = 'MTcyMzg0MzMyN3xJeElUNjdqd0J3TmdZMVJ6U3NUVFZFQjdfMFBMT1podjdCRHlkVU5YZE4wZ0p2cUNkREt2dDNhRHQ4RDE4N2c4Q2YtSVFEOHVGbXZIdm1NbGd2XzBiVWhPSHlzOE9JczlqTEpJRS1VRUhwWVpHME12WFV5VjBJOGxPYzhpVVdnRmNiYzRLSHJMX3lFZERsaW8zQ0FwQXczUWhEcm1TdUlmekRQT3dkY1l6bVpyd0xkYkR3Y0VTaHhSTWRxQklQVXNTdmVYRGFTdUhXU1NSb19McDgzdWRKZ1pta1k0ZjdVMmQxdnhlcjlkVktrT1ZPdk44V21zTEM4RjgxMVhiT2tvWGdxNm51NXZ1amFfQkVzPXzyBolkofq8YyS1N5xg_2EzmXJT-GReLkliKCj1LbMVlw=='

const API_URL = 'https://api.daily.dev/graphql';
const LAST_RUN_FILE = 'last_run.txt';

async function getNotifications(after = null) {
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
            targetUrl
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
      headers: getHeaders()
    });
    console.log(response.data.errors)
    if(response.data.errors) {
      throw new Error(`Error fetching notifications: ${response.data.errors.map(({message})=>message).join(',')}`);
    }
    return response.data.data.notifications;
  } catch (error) {
    console.error(`Error fetching notifications:`, error.message);
    throw error;
  }
}

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'Cookie': `das=${das_cookie}; ilikecookies=true; ory_kratos_session=${session_cookie}; da2=${da2_cookie}; da3=${da3_cookie}`
  }
}

function getRandomWelcomeMessage() {
  const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
  return welcomeMessages[randomIndex];
}

async function sendWelcomeMessage(username) {
  const query = `
    mutation COMMENT_ON_POST_MUTATION($id: ID!, $content: String!) {
      comment: commentOnPost(postId: $id, content: $content) {
        id
      }
    }
  `;
  const content = `@${username} welcome to The Dev Craft! ${getRandomWelcomeMessage()}`
  console.log('sending message: ', content)
  const variables = {
    id: 'xit7FoDUw',
    content
  };

  try {
    const result = await axios.post(API_URL, {
      query,
      variables
    }, {
      headers: getHeaders()
    });
    console.log(`Welcome message sent to @${username}`);
    console.log(result.data);
  } catch (error) {
    console.error(`Error sending welcome message to @${username}:`, error.message);
  }
}

const waitToSendMessage = async (send, time) => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      await send();
      resolve();
    }, time);
  });
}

const getRandomeTime = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

function extractUsernameFromUrl(url) {
  const match = url.match(/%40([^+]+)\+welcome/);
  return match ? match[1] : null;
}

async function main() {

  let lastRunTime;
  try {
    lastRunTime = fs.readFileSync(LAST_RUN_FILE, 'utf8');
  } catch (error) {
    lastRunTime = new Date(0).toISOString();
  }
  console.log(`Last run time: ${lastRunTime}`);
  let newMembers = [];
  let hasNextPage = true;
  let after = null;

  while (hasNextPage) {
    const notifications = await getNotifications(after);
    if (!notifications) break;

    for (const edge of notifications.edges) {
      const notification = edge.node;
      if (new Date(notification.createdAt) <= new Date(lastRunTime)) {
        hasNextPage = false;
        break;
      }

      if (notification.type === 'squad_member_joined') {
        console.log(notification)
        const username = extractUsernameFromUrl(notification.targetUrl);
        console.log(username)
        if(username) {
          newMembers.push({
            username
          });
        }
      }
    }

    hasNextPage = notifications.pageInfo.hasNextPage && hasNextPage;
    after = notifications.pageInfo.endCursor;
  }

  if (newMembers.length === 0) {
    console.log('No new members joined since the last run.');
    fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString());
    rl.close();
    return;
  }

  console.log(`Found ${newMembers.length} new members:`);
  newMembers.forEach(member => console.log(`- ${member.username}`));

  rl.question('Would you like to send welcome messages to these new users? (Y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y' || answer === '') {
      for (const member of newMembers) {
        const timeWait = getRandomeTime(5, 10)
        console.log(member)
        console.log(`Waiting ${timeWait} seconds to send welcome message to @${member.username}`);
        await waitToSendMessage(() => {
          console.log(`Sending welcome message to @${member.username}`);
          sendWelcomeMessage(member.username)
        }, timeWait);

      }
      fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString());
      console.log('Last run time updated.');
    }

    rl.close();
  });
}

main();