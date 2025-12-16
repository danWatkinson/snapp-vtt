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
    Given there is a user "alice" with no roles
    And there is an admin user "admin" with the "admin" role

  Scenario: Admin assigns a GM role to a user and the token reflects new permissions
    When the admin signs in to the system as "admin"
    And the admin navigates to the "Users" management screen
    And the admin assigns the "gm" role to user "alice"
    Then the UI shows that user "alice" has role "gm"
    When user "alice" signs in to the system
    Then the issued access token for "alice" contains role "gm"
    And an API request made as "alice" to a GM-only endpoint succeeds
    And an API request made as "alice" to an admin-only endpoint is forbidden


