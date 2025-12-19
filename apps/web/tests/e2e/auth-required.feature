Feature: Auth-required access to application content

  As a Visitor
  I want to be redirected to login when not authenticated
  So that application content is only visible to authenticated users

  Background:
    Given there is an admin user

  Scenario: Unauthenticated visitor cannot see application content
    When I open the Snapp home page
    Then the world planning UI is not visible
    And I see a login entry point in the banner

  Scenario: Authenticated user can see application content
    When I sign in as admin via the login dialog
    Then the world planning UI becomes visible
