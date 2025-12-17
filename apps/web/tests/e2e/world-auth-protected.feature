Feature: World creation requires authentication

  As a Security Engineer
  I want world creation to require authentication
  So that only authorized users can create worlds

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: World creation requires authentication
    When I open the Snapp home page
    Then I see a login entry point in the banner
    And the world tab is not visible

  Scenario: Authenticated user with gm role can create a world
    When the admin signs in to the system as "admin"
    And the admin navigates to the "World Entities" planning screen
    And the admin creates a world named "Authenticated Test World"
    Then the world "Authenticated Test World" appears in the worlds list
