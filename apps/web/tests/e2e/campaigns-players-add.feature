Feature: Game master adds players to a campaign

  As a Game Master
  I want to add players to my campaign
  So that I can track who is participating

  Background:
    Given there is an admin user
    And there is a test user
    And there is a campaign

  Scenario: Game master can add Players to a Campaign
    When the game master adds the test user to the campaign
    Then the test user appears in the players list
    And a story arc is created for the new player
