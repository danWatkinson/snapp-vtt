Feature: Campaign creation requires authentication

  As a Security Engineer
  I want campaign creation to require authentication
  So that only authorized users can create campaigns

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Campaign creation requires authentication
    When I open the Snapp home page
    Then I see a login entry point in the banner
    And the campaigns tab is not visible

  Scenario: Authenticated user with gm role can create a campaign
    When the admin signs in to the system as "admin"
    And the admin navigates to the "Campaigns" planning screen
    And the admin creates a campaign named "Authenticated Test Campaign"
    Then the campaign "Authenticated Test Campaign" appears in the campaigns list
