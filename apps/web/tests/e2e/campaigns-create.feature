Feature: Game master creates campaigns

  As a Game Master
  I want to create campaigns
  So that I can organize my game sessions and story arcs

  Background:
    Given there is a game master user

  Scenario: Game master creates a campaign via the UI
    When the game master signs in to the system
    And the game master creates a campaign named "Rise of the Dragon King" with summary "A long-running campaign about ancient draconic power returning"
    Then the UI shows a campaign tab named "Rise of the Dragon King"
