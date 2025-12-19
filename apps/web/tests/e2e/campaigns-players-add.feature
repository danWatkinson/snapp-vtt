Feature: Game master adds players to a campaign

  As a Game Master
  I want to add players to my campaign
  So that I can track who is participating

  Background:
    Given there is an admin user
    And there is a test user

  Scenario: Game master can add Players to a Campaign
    When the admin signs in to the system
    And the test campaign exists with players view
    And the admin ensures the test user is added to the campaign
    Then the test user appears in the players list
