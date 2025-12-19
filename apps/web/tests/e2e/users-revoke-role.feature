Feature: Admin revokes a role from a user

  As an Admin
  I want to revoke roles from users
  So that I can remove permissions that are no longer needed

  Background:
    Given there is an admin user
    And there is a user "alice" with no roles

  Scenario: Admin can revoke a role from a user
    When the admin signs in to the system
    And the admin navigates to the "Users" management screen
    And the admin assigns the "gm" role to user "alice"
    And the admin revokes the "gm" role from user "alice"
    Then user "alice" no longer has the "gm" role in the users list
