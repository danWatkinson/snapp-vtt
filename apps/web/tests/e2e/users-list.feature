Feature: Admin views the list of users

  As an Admin
  I want to see all users in the system
  So that I can manage their roles and access

  Background:
    Given there is an admin user
    And there is a test user

  Scenario: Admin can view list of all users
    When the admin signs in to the system
    And the admin navigates to the "Users" management screen
    Then the users list is visible
    And the user "admin" appears in the users list
    And the test user appears in the users list
