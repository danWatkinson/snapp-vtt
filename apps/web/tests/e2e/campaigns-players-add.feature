Feature: Game master adds players to a campaign

  As a Game Master
  I want to add players to my campaign
  So that I can track who is participating

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Game master can add Players to a Campaign
    When the admin signs in to the system as "admin"
    And the admin navigates to the "Campaigns" planning screen
    And the campaign "Rise of the Dragon King" exists
    And the admin navigates to the players view
    And the admin ensures player "alice" is added to the campaign
    Then player "alice" appears in the players list
