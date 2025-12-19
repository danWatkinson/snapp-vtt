Feature: Game master views and advances campaign timeline

  As a Game Master
  I want to view and advance the campaign timeline
  So that I can track the passage of time in my campaign

  Background:
    Given there is an admin user "admin" with the "admin" role

  Scenario: Game master can view and advance Campaign Timeline
    When the admin signs in to the system as "admin"
    And the campaign "Rise of the Dragon King" exists
    And the admin navigates to the campaign timeline view
    Then the current moment is displayed
    When the admin advances the timeline by 1 day
    And the admin advances the timeline by 1 week
    And the admin advances the timeline by 1 month
    And the admin moves the timeline back by 1 day
    Then the timeline reflects the changes
