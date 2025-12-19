Feature: Game master creates sessions within a campaign

  As a Game Master
  I want to create sessions within my campaign
  So that I can organize gameplay into discrete play sessions

  Background:
    Given there is an admin user

  Scenario: Game master can create a Session within a Campaign
    When the admin signs in to the system
    And the test campaign exists with sessions view
    And the admin ensures session "Session 1" exists in the campaign
    Then session "Session 1" appears in the sessions list
