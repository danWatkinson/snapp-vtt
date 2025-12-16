import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given('there is a user "alice" with no roles', async () => {
  // TODO: seed user "alice" with no roles via API or test fixture
  throw new Error('Not implemented: seeding user "alice" with no roles');
});

Given(
  'there is an admin user "admin" with the "admin" role',
  async () => {
    // TODO: seed admin user with admin role
    throw new Error(
      'Not implemented: seeding admin user "admin" with "admin" role'
    );
  }
);

When('the admin signs in to the system as "admin"', async () => {
  // TODO: drive UI login flow as admin
  throw new Error('Not implemented: admin login flow');
});

When('the admin navigates to the "Users" management screen', async () => {
  // TODO: navigate to users management UI
  throw new Error('Not implemented: navigation to Users management screen');
});

When(
  'the admin assigns the "gm" role to user "alice"',
  async () => {
    // TODO: interact with UI to assign GM role
    throw new Error('Not implemented: assign GM role to alice');
  }
);

Then(
  'the UI shows that user "alice" has role "gm"',
  async () => {
    // TODO: assert UI shows gm role
    throw new Error('Not implemented: UI assertion for gm role');
  }
);

When('user "alice" signs in to the system', async () => {
  // TODO: login as alice and capture token
  throw new Error('Not implemented: alice login flow');
});

Then(
  'the issued access token for "alice" contains role "gm"',
  async () => {
    // TODO: decode token (in test) and assert role gm
    throw new Error(
      'Not implemented: assertion that access token for alice contains role gm'
    );
  }
);

Then(
  'an API request made as "alice" to a GM-only endpoint succeeds',
  async () => {
    // TODO: call GM-only API with alice token and assert success
    throw new Error('Not implemented: GM-only API success for alice');
  }
);

Then(
  'an API request made as "alice" to an admin-only endpoint is forbidden',
  async () => {
    // TODO: call admin-only API with alice token and assert forbidden
    throw new Error('Not implemented: admin-only API forbidden for alice');
  }
);


