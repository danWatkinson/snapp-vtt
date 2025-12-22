Feature: Password-based login behaviour

  As a Visitor
  I want to authenticate with a username and password
  So that I can access the tools securely

  Background:
    Given there is an admin user
    And there is a registered user

  Scenario: Login requires a password
    When an unidentified user attempts to login as the registered user without providing a password
    Then the user is shown an error stating that they need to provide a password
    And the user is not logged in

  Scenario: Login fails with an incorrect password
    When an unidentified user attempts to login as the registered user with an incorrect password
    Then the user is shown an error stating that their credentials were incorrect
    And the user is not logged in

  Scenario: Login succeeds with the correct password
    When an unidentified user attempts to login as the registered user with the correct password
    Then the user is logged in

