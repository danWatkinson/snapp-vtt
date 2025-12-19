Feature: Game master views and advances campaign timeline

  As a Game Master
  I want to view and advance the campaign timeline
  So that I can track the passage of time in my campaign

  Background:
    Given there is a game master user

  Scenario: Game master can view and advance Campaign Timeline
    When the game master signs in to the system
    And the test campaign exists with timeline view
    Then the current moment is displayed
    When the game master advances the timeline by 1 day
    And the game master advances the timeline by 1 week
    And the game master advances the timeline by 1 month
    And the game master moves the timeline back by 1 day
    Then the timeline reflects the changes
