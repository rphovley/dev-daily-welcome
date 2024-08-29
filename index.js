const axios = require('axios');
const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const da2_cookie = 'M8W2z5HKelL98yIB0MhpE'
const da3_cookie = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE3MjQ5NDkyNDYuODUxLCJ1c2VySWQiOiJNOFcyejVIS2VsTDk4eUlCME1ocEUiLCJyb2xlcyI6W10sImlhdCI6MTcyNDk0ODM0NiwiYXVkIjoiRGFpbHkiLCJpc3MiOiJEYWlseSBBUEkifQ.eA-iueQWf5gE8-Q5cjAWOFPFGZ7AcQMyh_Kc9vkO_dyRUKOc9Ss9OY_-K57pGt3Gm3ISj1HF7i1eSiIGWcSLH-2mqWlz_I21L-xrxOG5E6ReU5zk7KnWKPFPbq17KJ7U71wWH4S0A3yFFcNZAb-rpIldtUPCaVerkMppDLRoyeRuBTz03WMC799CPbGzJLrNpbuKBukitIEBViMMFlhbGVlJuXoE9KTWbQj219Ve6VNcflcFRHVQ4Gtni_SkAZP6TAr0eI2au6nnb8-o3BicrnC2xjj4bHJ2YIxVcVnDPqwJCHDrBLFHD4SeUDHpEVNLdX_9CPip1ee2Oe7YWnp6WA.IPTss%2FmkFsgtR0gixBFex0ZGROBB4EyR46NGM1Soqzk'
const das_cookie = '368d8f5a-ee96-4e65-86dc-5acc40a9eb79'
const session_cookie = 'MTcyMzg0MzMyN3xJeElUNjdqd0J3TmdZMVJ6U3NUVFZFQjdfMFBMT1podjdCRHlkVU5YZE4wZ0p2cUNkREt2dDNhRHQ4RDE4N2c4Q2YtSVFEOHVGbXZIdm1NbGd2XzBiVWhPSHlzOE9JczlqTEpJRS1VRUhwWVpHME12WFV5VjBJOGxPYzhpVVdnRmNiYzRLSHJMX3lFZERsaW8zQ0FwQXczUWhEcm1TdUlmekRQT3dkY1l6bVpyd0xkYkR3Y0VTaHhSTWRxQklQVXNTdmVYRGFTdUhXU1NSb19McDgzdWRKZ1pta1k0ZjdVMmQxdnhlcjlkVktrT1ZPdk44V21zTEM4RjgxMVhiT2tvWGdxNm51NXZ1amFfQkVzPXzyBolkofq8YyS1N5xg_2EzmXJT-GReLkliKCj1LbMVlw=='

const API_URL = 'https://api.daily.dev/graphql';
const LAST_RUN_FILE = 'last_run.txt';

async function getUserToken() {
  return new Promise((resolve) => {
    rl.question('Please enter your daily.dev user session token: ', (token) => {
      resolve(token.trim());
    });
  });
}

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
async function sendWelcomeMessage(postId, username) {
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
      headers: getHeaders()
    });
    console.log(`Welcome message sent to @${username}`);
  } catch (error) {
    console.error(`Error sending welcome message to @${username}:`, error.message);
  }
}

const getRandomeTime = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min) * 1000;
}

async function main() {
  const token = await getUserToken();

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
        setTimeout(async () => {
          console.log(member)
          console.log(`Waited ${timeWait} seconds to send welcome message to @${member.username}`);
          // await sendWelcomeMessage('xit7FoDUw', member.username);
        }, timeWait);
      }
    }

    // fs.writeFileSync(LAST_RUN_FILE, new Date().toISOString());
    console.log('Last run time updated.');
    rl.close();
  });
}

main();