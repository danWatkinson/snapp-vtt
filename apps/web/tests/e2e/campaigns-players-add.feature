Feature: Game master adds players to a campaign

  As a Game Master
  I want to add players to my campaign
  So that I can track who is participating

  Background:
    Given there is an admin user
    And there is a user "alice" with no roles

  Scenario: Game master can add Players to a Campaign
    When the admin signs in to the system
    And the campaign "Rise of the Dragon King" exists with players view
    And the admin ensures player "alice" is added to the campaign
    Then player "alice" appears in the players list
