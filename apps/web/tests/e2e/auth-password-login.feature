Feature: Password-based login behaviour

  As a Visitor
  I want to authenticate with a username and password
  So that I can access the planning tools securely

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Login requires a password
    When I open the Snapp home page
    And I open the login dialog
    And I attempt to login as "admin" without providing a password
    Then I stay on the login form
    And I am not shown as logged in

  Scenario: Login fails with an incorrect password
    When I open the Snapp home page
    And I open the login dialog
    And I attempt to login as "admin" with password "wrongpassword"
    Then the login dialog remains open
    And the world planning UI is not visible

  Scenario: Login succeeds with the correct password
    When I open the Snapp home page
    And I open the login dialog
    And I attempt to login as "admin" with password "admin123"
    Then the login dialog closes
    And the world planning UI becomes visible

