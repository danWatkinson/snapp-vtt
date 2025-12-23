Feature: Admin manages user roles with token-based auth

  As an Admin User
  I want to assign one or more roles to other users
  So that I have ultimate authority over who can do what

  As a Security Engineer
  I want users to identify themselves
  So that I can gate API features by user role

  As a Security Engineer
  I want to use token-based auth
  So that I can update user permissions in realtime

  Background:
    Given there is a test user
    And there is an admin user

  Scenario: Admin assigns a GM role to a user and the token reflects new permissions
    When the admin assigns the "gm" role to the test user
    Then the UI shows that the test user has role "gm"
    When the test user signs in to the system
    Then the issued access token for the test user contains role "gm"
    And an API request made as the test user to a GM-only endpoint succeeds
    And an API request made as the test user to an admin-only endpoint is forbidden


