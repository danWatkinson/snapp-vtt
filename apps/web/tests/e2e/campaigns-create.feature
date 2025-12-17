Feature: Game master creates campaigns

  As a Game Master
  I want to create campaigns
  So that I can organize my game sessions and story arcs

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Game master creates a campaign via the UI
    When the admin signs in to the system as "admin"
    And the admin navigates to the "Campaigns" planning screen
    And the admin creates a campaign named "Rise of the Dragon King" with summary "A long-running campaign about ancient draconic power returning"
    Then the UI shows a campaign tab named "Rise of the Dragon King"
